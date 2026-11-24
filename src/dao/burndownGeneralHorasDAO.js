
const burndownHorasDAO = require('./burndownHorasDAO');
const { sumarHoras } = require('../utilidades/tiempos');

// Obtiene las horas estimadas y reales de un Sprint.
// Las horas de historias sin estimación se contabilizan por separado.
const obtenerResumenSprint = async (
    idProyecto,
    sprint
) => {
    const historias = await burndownHorasDAO.obtenerHistoriasDelSprint(
        idProyecto,
        sprint.id_sprint,
        sprint.fecha_inicio,
        sprint.fecha_fin
    );

    const historiasEstimadas = historias.filter(
        historia => historia.horas_estimadas !== null
    );

    const historiasSinEstimar = historias.filter(
        historia => historia.horas_estimadas === null
    );

    const horasEstimadas = sumarHoras(
        historiasEstimadas.map(historia => historia.horas_estimadas)
    );

    const horasReales = sumarHoras(
        historiasEstimadas.map(historia => historia.horas_reales)
    );

    const horasSinEstimar = sumarHoras(
        historiasSinEstimar.map(historia => historia.horas_reales)
    );

    return {
        horas_estimadas: horasEstimadas,
        horas_reales: horasReales,
        horas_sin_estimar: horasSinEstimar
    };
};

module.exports = {
    obtenerResumenSprint
};
