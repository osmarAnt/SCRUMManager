const proyectoDAO = require('../dao/proyectoDAO');
const sprintDAO = require('../dao/sprintDAO');
const burndownDAO = require('../dao/burndownDAO');
const { construirSerie, resumirAvance } = require('../utilidades/burndown');

// Sprint que se muestra por defecto: el que está en curso hoy; si no hay, el último que ya empezó;
// y si todos son futuros, el más próximo.
const elegirSprint = (sprints, hoy) => {
    const enCurso = sprints.find((s) => s.fecha_inicio <= hoy && hoy <= s.fecha_fin);
    if (enCurso) {
        return enCurso;
    }
    const iniciados = sprints.filter((s) => s.fecha_inicio <= hoy);
    return iniciados.length ? iniciados[iniciados.length - 1] : sprints[0];
};

// GET /proyectos/:id/burndown?sprint=<id_sprint>
// Disponible para cualquier integrante del proyecto.
const consultar = async (req, res) => {
    if (!/^[1-9]\d{0,9}$/.test(req.params.id) || Number(req.params.id) > 2147483647) {
        return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
    }
    const idProyecto = Number(req.params.id);

    try {
        const rol = await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario);
        if (!rol) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }

        const sprints = await sprintDAO.listarPorProyecto(idProyecto);
        if (!sprints.length) {
            return res.json({ sprints: [], sprint: null });
        }

        const hoy = await burndownDAO.obtenerHoy();
        const pedido = /^[1-9]\d{0,9}$/.test(String(req.query.sprint || ''))
            ? sprints.find((s) => s.id_sprint === Number(req.query.sprint))
            : null;
        const sprint = pedido || elegirSprint(sprints, hoy);

        const { historial, actuales } = await burndownDAO.sincronizarSprint(sprint, hoy);

        // Línea base: puntos comprometidos al empezar el Sprint. Se toma la última foto anterior al
        // inicio (planificación); si no existe, la primera foto del Sprint.
        const previa = historial.filter((fila) => fila.fecha < sprint.fecha_inicio).pop();
        const primera = historial.find((fila) => fila.fecha >= sprint.fecha_inicio);
        const lineaBase = (previa || primera || actuales).puntos_totales;

        const dias = construirSerie({
            fechaInicio: sprint.fecha_inicio,
            fechaFin: sprint.fecha_fin,
            hoy,
            lineaBase,
            historial
        });
        const avance = resumirAvance({
            dias,
            hoy,
            fechaInicio: sprint.fecha_inicio,
            fechaFin: sprint.fecha_fin
        });

        // Totales vigentes: los del último día registrado dentro del Sprint (o los actuales si aún no empieza).
        const dentro = historial.filter(
            (fila) => fila.fecha >= sprint.fecha_inicio && fila.fecha <= sprint.fecha_fin && fila.fecha <= hoy
        );
        const vigente = dentro.length ? dentro[dentro.length - 1] : actuales;

        // Sin historias con puntos no hay nada que graficar: se avisa en lugar de marcarlo como completado.
        if (vigente.puntos_totales === 0 && avance.ritmo !== 'Sin iniciar') {
            avance.ritmo = 'Sin puntos asignados';
        }

        res.json({
            hoy,
            sprints: sprints.map((s) => ({
                id_sprint: s.id_sprint,
                numero: s.numero,
                fecha_inicio: s.fecha_inicio,
                fecha_fin: s.fecha_fin
            })),
            sprint: {
                id_sprint: sprint.id_sprint,
                numero: sprint.numero,
                objetivo: sprint.objetivo,
                fecha_inicio: sprint.fecha_inicio,
                fecha_fin: sprint.fecha_fin,
                duracion_dias: sprint.duracion_dias
            },
            linea_base: lineaBase,
            dias,
            resumen: {
                puntos_totales: vigente.puntos_totales,
                puntos_completados: vigente.puntos_completados,
                puntos_restantes: avance.restantes,
                ideal_hoy: avance.idealHoy,
                ritmo: avance.ritmo
            }
        });
    } catch (error) {
        console.error('Error al consultar el Burndown Chart:', error.code || error.message);
        res.status(500).json({ mensaje: 'No se pudo cargar el Burndown Chart. Inténtalo de nuevo.' });
    }
};

module.exports = {
    consultar
};
