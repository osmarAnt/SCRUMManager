const conexion = require('../base_de_datos/conexion');

// Las fechas se formatean en SQL para evitar desfases de zona horaria al convertir DATE a objeto Date.
const COLUMNAS = `
    id_sprint, id_proyecto, numero, objetivo,
    DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
    DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_fin,
    duracion_dias, estado
`;

const listarPorProyecto = async (idProyecto) => {
    const [filas] = await conexion.promise().query(
        `SELECT ${COLUMNAS} FROM sprints WHERE id_proyecto = ? ORDER BY fecha_inicio ASC, numero ASC`,
        [idProyecto]
    );
    return filas;
};

// PB-13: registra el Sprint con estado 'Planificado'.
// Devuelve { sprint } o { traslape } si las fechas chocan con otro Sprint del proyecto.
const crearSprint = async (idProyecto, objetivo, fechaInicio, fechaFin, duracionDias) => {
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

module.exports = {
    listarPorProyecto,
    crearSprint
};
