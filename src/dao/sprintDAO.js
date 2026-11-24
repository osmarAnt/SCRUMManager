const conexion = require('../base_de_datos/conexion');

// Las fechas se formatean en SQL para evitar desfases de zona horaria al convertir DATE a objeto Date.
// Sprint 7: nombre (Bloque 1), capacidad y horas comprometidas (Bloque 5).
const COLUMNAS = `
    s.id_sprint, s.id_proyecto, s.numero, s.nombre, s.objetivo,
    DATE_FORMAT(s.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
    DATE_FORMAT(s.fecha_fin, '%Y-%m-%d') AS fecha_fin,
    s.duracion_dias, s.estado, s.capacidad_horas,
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
        // Bloquea las filas del proyecto para que dos altas simultáneas no repitan número ni se traslapen.
        await transaccion.query(
            'SELECT id_proyecto FROM proyectos WHERE id_proyecto = ? FOR UPDATE',
            [idProyecto]
        );
        const [traslapes] = await transaccion.query(
            `SELECT numero FROM sprints
             WHERE id_proyecto = ? AND fecha_inicio <= ? AND fecha_fin >= ?
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

// Sprint 7 · Bloque 3 (Francisco) · TC-10-03: finaliza el Sprint SOLO si su DoD está completa.
// Todo en una transacción con bloqueo, para que nadie desmarque un requisito a medio cierre.
const finalizar = async (idProyecto, idSprint) => {
    const transaccion = await conexion.crearConexion();
    try {
        await transaccion.beginTransaction();
        const [sprints] = await transaccion.query(
            'SELECT numero, estado FROM sprints WHERE id_sprint = ? AND id_proyecto = ? FOR UPDATE',
            [idSprint, idProyecto]
        );
        if (!sprints.length) {
            await transaccion.rollback();
            return { noEncontrado: true };
        }
        if (sprints[0].estado === 'Finalizado') {
            await transaccion.rollback();
            return { yaFinalizado: true };
        }
        const [pendientes] = await transaccion.query(
            `SELECT descripcion FROM dod_requisitos
             WHERE id_sprint = ? AND cumplido = FALSE
             ORDER BY id_requisito
             FOR UPDATE`,
            [idSprint]
        );
        if (pendientes.length) {
            await transaccion.rollback();
            return { dodPendiente: pendientes.map((fila) => fila.descripcion) };
        }
        await transaccion.query(
            "UPDATE sprints SET estado = 'Finalizado' WHERE id_sprint = ?",
            [idSprint]
        );
        await transaccion.commit();
        return { numero: sprints[0].numero };
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
    finalizar
};
