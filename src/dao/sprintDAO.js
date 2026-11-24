const conexion = require('../base_de_datos/conexion');
const { ESTADOS_COMPLETADOS } = require('../utilidades/burndown');

const MARCAS_COMPLETADOS = ESTADOS_COMPLETADOS.map(() => '?').join(', ');

const COLUMNAS = `
    id_sprint, id_proyecto, numero, objetivo,
    DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
    DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_fin,
    DATE_FORMAT(fecha_cierre, '%Y-%m-%d') AS fecha_cierre,
    duracion_dias,
    CASE
        WHEN fecha_cierre IS NOT NULL OR estado = 'Finalizado' THEN 'Finalizado'
        WHEN CURDATE() < fecha_inicio THEN 'Planificado'
        ELSE 'En curso'
    END AS estado
`;

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
        `SELECT ${COLUMNAS} FROM sprints WHERE id_proyecto = ? ORDER BY fecha_inicio ASC, numero ASC`,
        [idProyecto]
    );
    return filas;
};

const crearSprint = async (idProyecto, objetivo, fechaInicio, fechaFin, duracionDias) => {
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
            `INSERT INTO sprints (id_proyecto, numero, objetivo, fecha_inicio, fecha_fin, duracion_dias)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [idProyecto, siguiente, objetivo, fechaInicio, fechaFin, duracionDias]
        );
        const [filas] = await transaccion.query(
            `SELECT ${COLUMNAS} FROM sprints WHERE id_sprint = ?`,
            [resultado.insertId]
        );
        await transaccion.commit();
        return { sprint: filas[0] };
    } catch (error) {
        await transaccion.rollback().catch(() => {});
        throw error;
    } finally {
        await transaccion.end().catch(() => {});
    }
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
    obtenerResumenCierre,
    cerrarSprint
};
