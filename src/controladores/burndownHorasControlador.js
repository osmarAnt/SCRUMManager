
const proyectoDAO = require('../dao/proyectoDAO');
const sprintDAO = require('../dao/sprintDAO');
const burndownHorasDAO = require('../dao/burndownHorasDAO');
const { listarFechas, etiquetaDia } = require('../utilidades/burndown');
const { sumarHoras } = require('../utilidades/tiempos');

// ======================================================
// JESÚS - PB-60: BURNDOWN POR HORAS DE CADA SPRINT
// ======================================================

const redondear = (valor) =>
    Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

const elegirSprint = (sprints, hoy) => {
    const enCurso = sprints.find(
        sprint => sprint.fecha_inicio <= hoy && hoy <= sprint.fecha_fin
    );

    if (enCurso) return enCurso;

    const iniciados = sprints.filter(
        sprint => sprint.fecha_inicio <= hoy
    );

    return iniciados.length
        ? iniciados[iniciados.length - 1]
        : sprints[0];
};

const construirDias = ({
    fechaInicio,
    fechaFin,
    hoy,
    horasEstimadas,
    horasPorDia
}) => {
    const fechas = listarFechas(fechaInicio, fechaFin);
    const totalDias = fechas.length;

    const porFecha = new Map(
        horasPorDia.map(fila => [fila.fecha, fila.horas])
    );

    let acumuladas = 0;

    const dias = [{
        indice: 0,
        fecha: null,
        etiqueta: 'Inicio',
        ideal: redondear(horasEstimadas),
        real: redondear(horasEstimadas)
    }];

    fechas.forEach((fecha, posicion) => {
        const numeroDia = posicion + 1;

        const ideal = redondear(
            horasEstimadas * (totalDias - numeroDia) / totalDias
        );

        let real = null;

        if (fecha <= hoy) {
            acumuladas = sumarHoras([
                acumuladas,
                porFecha.get(fecha) || 0
            ]);

            real = redondear(
                Math.max(horasEstimadas - acumuladas, 0)
            );
        }

        dias.push({
            indice: numeroDia,
            fecha,
            etiqueta: etiquetaDia(fecha),
            ideal,
            real
        });
    });

    return dias;
};

const resumir = ({
    dias,
    hoy,
    fechaInicio,
    fechaFin,
    historias
}) => {
    const estimadas = historias.filter(
        historia => historia.horas_estimadas !== null
    );

    const sinEstimar = historias.filter(
        historia => historia.horas_estimadas === null
    );

    const horasEstimadas = sumarHoras(
        estimadas.map(historia => historia.horas_estimadas)
    );

    const horasReales = sumarHoras(
        historias.map(historia => historia.horas_reales)
    );

    const horasRealesEstimadas = sumarHoras(
        estimadas.map(historia => historia.horas_reales)
    );

    const ultimoDato = [...dias].reverse().find(
        dia => dia.real !== null
    );

    const horasRestantes = ultimoDato
        ? ultimoDato.real
        : horasEstimadas;

    const idealHoy = ultimoDato
        ? ultimoDato.ideal
        : horasEstimadas;

    let ritmo = 'Sin estimaciones';

    if (horasEstimadas > 0) {
        if (hoy < fechaInicio) {
            ritmo = 'Sin iniciar';
        } else if (horasRestantes === 0) {
            ritmo = 'Estimación agotada';
        } else if (hoy > fechaFin) {
            ritmo = 'Con horas pendientes';
        } else {
            ritmo = horasRestantes <= idealHoy
                ? 'En ritmo'
                : 'Atrasado';
        }
    }

    return {
        horas_estimadas: horasEstimadas,
        horas_reales: horasReales,
        horas_reales_estimadas: horasRealesEstimadas,
        horas_restantes: horasRestantes,
        ideal_hoy: idealHoy,
        ritmo,
        historias_estimadas: estimadas.length,
        historias_sin_estimar: sinEstimar.length,
        horas_en_historias_sin_estimar: sumarHoras(
            sinEstimar.map(historia => historia.horas_reales)
        )
    };
};

const consultar = async (req, res) => {
    if (
        !/^[1-9]\d{0,9}$/.test(req.params.id) ||
        Number(req.params.id) > 2147483647
    ) {
        return res.status(404).json({
            mensaje: 'No encontramos ese proyecto.'
        });
    }

    const idProyecto = Number(req.params.id);

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

        const sprints = await sprintDAO.listarPorProyecto(idProyecto);

        if (!sprints.length) {
            return res.json({
                sprints: [],
                sprint: null,
                historias: [],
                dias: [],
                resumen: null
            });
        }

        const hoy = await burndownHorasDAO.obtenerHoy();

        const pedido = /^[1-9]\d{0,9}$/.test(
            String(req.query.sprint || '')
        )
            ? sprints.find(
                sprint => sprint.id_sprint === Number(req.query.sprint)
            )
            : null;

        const sprint = pedido || elegirSprint(sprints, hoy);

        const [historias, horasPorDia] = await Promise.all([
            burndownHorasDAO.obtenerHistoriasDelSprint(
                idProyecto,
                sprint.id_sprint,
                sprint.fecha_inicio,
                sprint.fecha_fin
            ),
            burndownHorasDAO.obtenerHorasPorDia(
                idProyecto,
                sprint.id_sprint,
                sprint.fecha_inicio,
                hoy < sprint.fecha_fin ? hoy : sprint.fecha_fin
            )
        ]);

        const resumenInicial = resumir({
            dias: [],
            hoy,
            fechaInicio: sprint.fecha_inicio,
            fechaFin: sprint.fecha_fin,
            historias
        });

        const dias = resumenInicial.horas_estimadas > 0
            ? construirDias({
                fechaInicio: sprint.fecha_inicio,
                fechaFin: sprint.fecha_fin,
                hoy,
                horasEstimadas: resumenInicial.horas_estimadas,
                horasPorDia
            })
            : [];

        const resumen = resumir({
            dias,
            hoy,
            fechaInicio: sprint.fecha_inicio,
            fechaFin: sprint.fecha_fin,
            historias
        });

        res.json({
            hoy,

            sprints: sprints.map(item => ({
                id_sprint: item.id_sprint,
                numero: item.numero,
                fecha_inicio: item.fecha_inicio,
                fecha_fin: item.fecha_fin
            })),

            sprint: {
                id_sprint: sprint.id_sprint,
                numero: sprint.numero,
                objetivo: sprint.objetivo,
                fecha_inicio: sprint.fecha_inicio,
                fecha_fin: sprint.fecha_fin,
                duracion_dias: sprint.duracion_dias
            },

            historias,
            dias,
            resumen
        });

    } catch (error) {
        console.error(
            'Error al consultar el Burndown por horas:',
            error.code || error.message
        );

        res.status(500).json({
            mensaje: 'No se pudo cargar el Burndown por horas. Inténtalo de nuevo.'
        });
    }
};

module.exports = { consultar };
