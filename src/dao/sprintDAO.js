const conexion = require('../base_de_datos/conexion');
const { ESTADOS_COMPLETADOS } = require('../utilidades/burndown');

const MARCAS_COMPLETADOS = ESTADOS_COMPLETADOS.map(() => '?').join(', ');

// Las fechas se formatean en SQL para evitar desfases de zona horaria al convertir DATE a objeto Date.
// PB-63 (Emmanuel): fecha de cierre y estado calculado (Planificado / En curso / Finalizado).
// Sprint 7: nombre (Bloque 1), capacidad y horas comprometidas (Bloque 5).
const COLUMNAS = `
    s.id_sprint, s.id_proyecto, s.numero, s.nombre, s.objetivo,
    DATE_FORMAT(s.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
    DATE_FORMAT(s.fecha_fin, '%Y-%m-%d') AS fecha_fin,
    DATE_FORMAT(s.fecha_cierre, '%Y-%m-%d') AS fecha_cierre,
    s.duracion_dias,
    CASE
        WHEN s.fecha_cierre IS NOT NULL OR s.estado = 'Finalizado' THEN 'Finalizado'
        WHEN CURDATE() < s.fecha_inicio THEN 'Planificado'
        ELSE 'En curso'
    END AS estado,
    s.capacidad_horas,
    (SELECT COALESCE(SUM(h.horas_estimadas), 0) FROM product_backlog h WHERE h.id_sprint = s.id_sprint)
        AS horas_comprometidas,
    (SELECT COUNT(*) FROM product_backlog h WHERE h.id_sprint = s.id_sprint) AS total_historias,
    (SELECT COUNT(*) FROM product_backlog h WHERE h.id_sprint = s.id_sprint AND h.horas_estimadas IS NULL)
        AS historias_sin_estimar
`;

// DECIMAL llega como texto desde mysql2: se convierte a número (NULL se conserva).
const normalizar = (fila) => fila && ({
    ...fila,
    capacidad_horas: fila.capacidad_horas === null ? null : Number(fila.capacidad_horas),
    horas_comprometidas: Number(fila.horas_comprometidas),
    total_historias: Number(fila.total_historias),
    historias_sin_estimar: Number(fila.historias_sin_estimar)
});

const calcularResumen = (historias) => {
    let historiasCompletadas = 0;
    let puntosTotales = 0;
    let puntosCompletados = 0;

    historias.forEach((historia) => {
        const puntos = Number(historia.puntos) || 0;
        puntosTotales += puntos;

        if (ESTADOS_COMPLETADOS.includes(historia.estado_historia)) {
            historiasCompletadas += 1;
            puntosCompletados += puntos;
        }
    });

    return {
        historias_totales: historias.length,
        historias_completadas: historiasCompletadas,
        historias_pendientes: historias.length - historiasCompletadas,
        puntos_totales: puntosTotales,
        puntos_completados: puntosCompletados,
        puntos_pendientes: puntosTotales - puntosCompletados
    };
};

const listarPorProyecto = async (idProyecto) => {
    const [filas] = await conexion.promise().query(
        `SELECT ${COLUMNAS} FROM sprints s WHERE s.id_proyecto = ? ORDER BY s.fecha_inicio ASC, s.numero ASC`,
        [idProyecto]
    );
    return filas.map(normalizar);
};

// PB-13: registra el Sprint con estado 'Planificado'.
// Devuelve { sprint } o { traslape } si las fechas chocan con otro Sprint del proyecto
// (así nunca hay dos Sprints activos al mismo tiempo: TC-12-02).
const crearSprint = async (idProyecto, datos) => {
    const { nombre, objetivo, fechaInicio, fechaFin, duracionDias, capacidad } = datos;
    const transaccion = await conexion.crearConexion();
    try {
        await transaccion.beginTransaction();
        await transaccion.query(
            'SELECT id_proyecto FROM proyectos WHERE id_proyecto = ? FOR UPDATE',
            [idProyecto]
        );
        const [traslapes] = await transaccion.query(
            `SELECT numero FROM sprints
             WHERE id_proyecto = ?
                AND fecha_inicio <= ?
                AND COALESCE(fecha_cierre, fecha_fin) >= ?
             LIMIT 1`,
            [idProyecto, fechaFin, fechaInicio]
        );
        if (traslapes.length) {
            await transaccion.rollback();
            return { traslape: traslapes[0].numero };
        }
        const [[{ siguiente }]] = await transaccion.query(
            'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM sprints WHERE id_proyecto = ?',
            [idProyecto]
        );
        const [resultado] = await transaccion.query(
            `INSERT INTO sprints (id_proyecto, numero, nombre, objetivo, fecha_inicio, fecha_fin, duracion_dias, capacidad_horas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [idProyecto, siguiente, nombre, objetivo, fechaInicio, fechaFin, duracionDias, capacidad]
        );
        const [filas] = await transaccion.query(
            `SELECT ${COLUMNAS} FROM sprints s WHERE s.id_sprint = ?`,
            [resultado.insertId]
        );
        await transaccion.commit();
        return { sprint: normalizar(filas[0]) };
    } catch (error) {
        await transaccion.rollback().catch(() => {});
        throw error;
    } finally {
        await transaccion.end().catch(() => {});
    }
};

// Sprint 7 · Bloque 5 (Osmar) · TC-06-04: cuántos integrantes activos hay de cada rol.
const contarRolesDelEquipo = async (idProyecto) => {
    const [filas] = await conexion.promise().query(
        `SELECT pu.rol, COUNT(*) AS total
         FROM proyecto_usuarios pu
         INNER JOIN usuarios u ON u.id_usuario = pu.id_usuario AND u.activo = TRUE
         WHERE pu.id_proyecto = ? AND pu.activo = TRUE
         GROUP BY pu.rol`,
        [idProyecto]
    );
    return Object.fromEntries(filas.map((fila) => [fila.rol, Number(fila.total)]));
};

// Sprint 7 · Bloque 5 (Osmar) · HU-13: capacidad del equipo para el Sprint (NULL la quita).
const actualizarCapacidad = async (idProyecto, idSprint, capacidad) => {
    const [resultado] = await conexion.promise().query(
        'UPDATE sprints SET capacidad_horas = ? WHERE id_sprint = ? AND id_proyecto = ?',
        [capacidad, idSprint, idProyecto]
    );
    if (!resultado.affectedRows) {
        const [existe] = await conexion.promise().query(
            'SELECT 1 FROM sprints WHERE id_sprint = ? AND id_proyecto = ?',
            [idSprint, idProyecto]
        );
        if (!existe.length) return null;
    }
    const [filas] = await conexion.promise().query(
        `SELECT ${COLUMNAS} FROM sprints s WHERE s.id_sprint = ?`,
        [idSprint]
    );
    return normalizar(filas[0]);
};

// Sprint 7 · Bloque 3 (Francisco) · TC-10-03: requisitos de la Definition of Done del Sprint sin cumplir.
// El Sprint no se puede cerrar mientras haya alguno (se valida dentro de cerrarSprint).
const dodPendienteDelSprint = async (ejecutor, idSprint, bloquear = false) => {
    const [filas] = await ejecutor.query(
        `SELECT descripcion FROM dod_requisitos
         WHERE id_sprint = ? AND cumplido = FALSE
         ORDER BY id_requisito${bloquear ? ' FOR UPDATE' : ''}`,
        [idSprint]
    );
    return filas.map((fila) => fila.descripcion);
};

const obtenerResumenCierre = async (idProyecto, idSprint) => {
    const [sprints] = await conexion.promise().query(
        `SELECT
            estado,
            DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
            DATE_FORMAT(fecha_cierre, '%Y-%m-%d') AS fecha_cierre,
            DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoy
         FROM sprints
         WHERE id_proyecto = ? AND id_sprint = ?`,
        [idProyecto, idSprint]
    );

    if (!sprints.length) return null;

    const sprint = sprints[0];
    const [historias] = await conexion.promise().query(
        `SELECT puntos, estado_historia
         FROM product_backlog
         WHERE id_proyecto = ? AND id_sprint = ?`,
        [idProyecto, idSprint]
    );

    return {
        ...calcularResumen(historias),
        // Sprint 7 · Bloque 3: el diálogo de cierre avisa qué falta de la DoD del Sprint.
        dod_pendientes: await dodPendienteDelSprint(conexion.promise(), idSprint),
        yaFinalizado: sprint.fecha_cierre !== null || sprint.estado === 'Finalizado',
        noIniciado: sprint.fecha_inicio > sprint.hoy
    };
};

const cerrarSprint = async (idProyecto, idSprint) => {
    const transaccion = await conexion.crearConexion();

    try {
        await transaccion.beginTransaction();

        const [sprints] = await transaccion.query(
            `SELECT
                estado,
                DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
                DATE_FORMAT(fecha_cierre, '%Y-%m-%d') AS fecha_cierre,
                DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoy
             FROM sprints
             WHERE id_proyecto = ? AND id_sprint = ?
             FOR UPDATE`,
            [idProyecto, idSprint]
        );

        if (!sprints.length) {
            await transaccion.rollback();
            return { noEncontrado: true };
        }

        const sprint = sprints[0];

        if (sprint.fecha_cierre !== null || sprint.estado === 'Finalizado') {
            await transaccion.rollback();
            return { yaFinalizado: true };
        }

        if (sprint.fecha_inicio > sprint.hoy) {
            await transaccion.rollback();
            return { noIniciado: true };
        }

        // Sprint 7 · Bloque 3 (Francisco) · TC-10-03: no se cierra con la DoD del Sprint incompleta.
        const dodPendiente = await dodPendienteDelSprint(transaccion, idSprint, true);
        if (dodPendiente.length) {
            await transaccion.rollback();
            return { dodPendiente };
        }

        const [historias] = await transaccion.query(
            `SELECT puntos, estado_historia
             FROM product_backlog
             WHERE id_proyecto = ? AND id_sprint = ?
             FOR UPDATE`,
            [idProyecto, idSprint]
        );

        const resumen = calcularResumen(historias);

        await transaccion.query(
            `INSERT INTO burndown_historial
                (id_sprint, fecha, puntos_totales, puntos_completados, puntos_restantes)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                puntos_totales = VALUES(puntos_totales),
                puntos_completados = VALUES(puntos_completados),
                puntos_restantes = VALUES(puntos_restantes)`,
            [
                idSprint,
                sprint.hoy,
                resumen.puntos_totales,
                resumen.puntos_completados,
                resumen.puntos_pendientes
            ]
        );

        await transaccion.query(
            `UPDATE product_backlog
             SET id_sprint = NULL,
                 id_responsable = NULL,
                 estado_historia = 'Pendiente'
             WHERE id_proyecto = ?
                AND id_sprint = ?
                AND estado_historia NOT IN (${MARCAS_COMPLETADOS})`,
            [idProyecto, idSprint, ...ESTADOS_COMPLETADOS]
        );

        await transaccion.query(
            `UPDATE sprints
             SET estado = 'Finalizado', fecha_cierre = ?
             WHERE id_proyecto = ? AND id_sprint = ?`,
            [sprint.hoy, idProyecto, idSprint]
        );

        await transaccion.commit();

        return {
            ...resumen,
            fecha_cierre: sprint.hoy,
            mensaje: 'Sprint cerrado. Las historias no completadas regresaron al Product Backlog.'
        };
    } catch (error) {
        await transaccion.rollback().catch(() => {});
        throw error;
    } finally {
        await transaccion.end().catch(() => {});
    }
};

module.exports = {
    listarPorProyecto,
    crearSprint,
    contarRolesDelEquipo,
    actualizarCapacidad,
    obtenerResumenCierre,
    cerrarSprint
};
