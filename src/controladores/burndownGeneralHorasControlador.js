
const proyectoDAO = require('../dao/proyectoDAO');
const sprintDAO = require('../dao/sprintDAO');
const burndownGeneralHorasDAO = require('../dao/burndownGeneralHorasDAO');

const { estadoSprint } = require('../utilidades/burndown');
const { sumarHoras } = require('../utilidades/tiempos');

const redondear = (valor) => Math.round(valor * 100) / 100;

const consultar = async (req, res) => {
    const idProyecto = Number(req.params.id);

    if (
        !/^[1-9]\d{0,9}$/.test(req.params.id) ||
        idProyecto > 2147483647
    ) {
        return res.status(400).json({
            mensaje: 'El identificador del proyecto no es válido.'
        });
    }

    try {
        const rol = await proyectoDAO.obtenerRolEnProyecto(
            idProyecto,
            req.session.idUsuario
        );

        if (!rol) {
            return res.status(404).json({
                mensaje: 'No encontramos ese proyecto.'
            });
        }

        const [sprints, hoy] = await Promise.all([
            sprintDAO.listarPorProyecto(idProyecto),
            require('../dao/burndownHorasDAO').obtenerHoy()
        ]);

        let estimadasAcumuladas = 0;
        let realesAcumuladas = 0;
        let sinEstimarAcumuladas = 0;

        const resultados = [];

        for (const sprint of sprints) {
            const resumen = await burndownGeneralHorasDAO.obtenerResumenSprint(
                idProyecto,
                sprint
            );

            estimadasAcumuladas = sumarHoras([
                estimadasAcumuladas,
                resumen.horas_estimadas
            ]);

            realesAcumuladas = sumarHoras([
                realesAcumuladas,
                resumen.horas_reales
            ]);

            sinEstimarAcumuladas = sumarHoras([
                sinEstimarAcumuladas,
                resumen.horas_sin_estimar
            ]);

            resultados.push({
                id_sprint: sprint.id_sprint,
                numero: sprint.numero,
                fecha_inicio: sprint.fecha_inicio,
                fecha_fin: sprint.fecha_fin,
                estado: estadoSprint(sprint, hoy.hoy),

                horas_estimadas: resumen.horas_estimadas,
                horas_reales: resumen.horas_reales,
                diferencia: redondear(
                    resumen.horas_reales - resumen.horas_estimadas
                ),
                horas_sin_estimar: resumen.horas_sin_estimar,

                estimadas_acumuladas: estimadasAcumuladas,
                reales_acumuladas: realesAcumuladas,
                diferencia_acumulada: redondear(
                    realesAcumuladas - estimadasAcumuladas
                ),
                sin_estimar_acumuladas: sinEstimarAcumuladas
            });
        }

        return res.json({
            hoy: hoy.hoy,
            sprints: resultados,
            resumen: {
                horas_estimadas: estimadasAcumuladas,
                horas_reales: realesAcumuladas,
                diferencia: redondear(
                    realesAcumuladas - estimadasAcumuladas
                ),
                horas_sin_estimar: sinEstimarAcumuladas
            }
        });

    } catch (error) {
        console.error('Error al consultar el Burndown General por horas:', error);

        return res.status(500).json({
            mensaje: 'No fue posible consultar el Burndown General por horas.'
        });
    }
};

module.exports = {
    consultar
};
