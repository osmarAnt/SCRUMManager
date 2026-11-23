
const conexion = require('../base_de_datos/conexion');
const { sumarHoras } = require('../utilidades/tiempos');

// ======================================================
// JESÚS - PB-60: DATOS DEL BURNDOWN POR HORAS
// ======================================================

const obtenerHoy = async () => {
    const [[fila]] = await conexion.promise().query(
        "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoy"
    );

    return fila.hoy;
};

const obtenerHistoriasDelSprint = async (
    idProyecto,
    idSprint,
    fechaInicio,
    fechaFin
) => {
    const [filas] = await conexion.promise().query(
        `SELECT
            h.id_historia,
            h.titulo,
            h.horas_estimadas,
            COALESCE(SUM(t.horas), 0) AS horas_reales
         FROM product_backlog h
         LEFT JOIN registros_tiempo t
            ON t.id_historia = h.id_historia
            AND t.fecha_trabajo BETWEEN ? AND ?
         WHERE h.id_proyecto = ?
            AND h.id_sprint = ?
         GROUP BY
            h.id_historia,
            h.titulo,
            h.horas_estimadas,
            h.orden
         ORDER BY h.orden ASC, h.id_historia ASC`,
        [fechaInicio, fechaFin, idProyecto, idSprint]
    );

    return filas.map((fila) => ({
        id_historia: Number(fila.id_historia),
        titulo: fila.titulo,
        horas_estimadas:
            fila.horas_estimadas === null ||
            fila.horas_estimadas === undefined
                ? null
                : Number(fila.horas_estimadas),
        horas_reales: sumarHoras([fila.horas_reales])
    }));
};

const obtenerHorasPorDia = async (
    idProyecto,
    idSprint,
    fechaInicio,
    fechaHasta
) => {
    if (fechaHasta < fechaInicio) return [];

    const [filas] = await conexion.promise().query(
        `SELECT
            DATE_FORMAT(t.fecha_trabajo, '%Y-%m-%d') AS fecha,
            COALESCE(SUM(t.horas), 0) AS horas
         FROM registros_tiempo t
         INNER JOIN product_backlog h
            ON h.id_historia = t.id_historia
         WHERE h.id_proyecto = ?
            AND h.id_sprint = ?
            AND h.horas_estimadas IS NOT NULL
            AND t.fecha_trabajo BETWEEN ? AND ?
         GROUP BY t.fecha_trabajo
         ORDER BY t.fecha_trabajo ASC`,
        [idProyecto, idSprint, fechaInicio, fechaHasta]
    );

    return filas.map((fila) => ({
        fecha: fila.fecha,
        horas: sumarHoras([fila.horas])
    }));
};

module.exports = {
    obtenerHoy,
    obtenerHistoriasDelSprint,
    obtenerHorasPorDia
};
