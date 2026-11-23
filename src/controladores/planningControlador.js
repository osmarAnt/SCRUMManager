const planningDAO = require('../dao/planningDAO');
const mesaPlanning = require('../dao/mesaPlanningDAO');
const proyectoDAO = require('../dao/proyectoDAO');
const { HORAS_ESTIMADAS_MAXIMAS, validarHorasEstimadas } = require('../utilidades/horasEstimadas');

const idValido = (valor) => /^[1-9]\d{0,9}$/.test(String(valor)) && Number(valor) <= 2147483647;

// PB-45: historias agrupadas por Sprint; las que aún no tienen Sprint van al final.
const consultarPlanning = async (req, res) => {
    try {
        const valor = req.params.id;
        if (!idValido(valor)) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        const idProyecto = Number(valor);
        if (!await planningDAO.esIntegrante(idProyecto, req.session.idUsuario)) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }

        const [historias, rol] = await Promise.all([
            planningDAO.obtenerHistorias(idProyecto),
            proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario)
        ]);
        const grupos = new Map();
        historias.forEach((historia) => {
            const idSprint = historia.id_sprint === null ? null : Number(historia.id_sprint);
            if (!grupos.has(idSprint)) {
                grupos.set(idSprint, {
                    id_sprint: idSprint,
                    numero: historia.sprint_numero === null ? null : Number(historia.sprint_numero),
                    historias: []
                });
            }
            grupos.get(idSprint).historias.push({
                id_historia: Number(historia.id_historia),
                titulo: historia.titulo,
                descripcion: historia.descripcion,
                criterios: historia.criterios,
                id_responsable: historia.id_responsable === null ? null : Number(historia.id_responsable),
                responsable: historia.responsable,
                puntos: historia.puntos === null ? null : Number(historia.puntos),
                // No sustituir NULL por cero: todavía no se ha registrado una estimación.
                horas_estimadas: historia.horas_estimadas === null ? null : Number(historia.horas_estimadas)
            });
        });
        res.json({
            grupos: [...grupos.values()],
            total_historias: historias.length,
            // PB-46: solo el Scrum Master del proyecto ve el apartado para estimar horas.
            puede_estimar: rol === 'Scrum Master',
            horas_maximas: HORAS_ESTIMADAS_MAXIMAS
        });
    } catch (error) {
        console.error('Error al consultar Planning Poker:', error.code || error.message);
        res.status(500).json({ mensaje: 'No se pudo cargar Planning Poker. Inténtalo de nuevo.' });
    }
};

// PB-46: el Scrum Master guarda (o quita) las horas estimadas de una historia.
const guardarHorasEstimadas = async (req, res) => {
    try {
        if (!idValido(req.params.id)) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        const idProyecto = Number(req.params.id);
        const rol = await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario);
        if (!rol) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        if (rol !== 'Scrum Master') {
            return res.status(403).json({ mensaje: 'Solo el Scrum Master del proyecto puede estimar horas.' });
        }
        if (!idValido(req.params.idHistoria)) {
            return res.status(404).json({ mensaje: 'No encontramos esa historia.' });
        }
        const datos = validarHorasEstimadas((req.body || {}).horas_estimadas);
        if (datos.error) {
            return res.status(400).json({ mensaje: datos.error });
        }
        const titulo = await planningDAO.guardarHorasEstimadas(
            idProyecto, Number(req.params.idHistoria), datos.horas
        );
        if (titulo === null) {
            return res.status(404).json({ mensaje: 'No encontramos esa historia.' });
        }
        res.json({
            mensaje: datos.horas === null
                ? `Se quitó la estimación de "${titulo}".`
                : `Guardaste ${datos.horas} h estimadas en "${titulo}".`,
            horas_estimadas: datos.horas
        });
    } catch (error) {
        console.error('Error al guardar horas estimadas:', error.code || error.message);
        res.status(500).json({ mensaje: 'No se pudieron guardar las horas estimadas. Inténtalo de nuevo.' });
    }
};

const accionesDeMesa = new Set(['iniciar', 'votar', 'revelar', 'repetir', 'cancelar']);

async function atenderMesa(req, res, accion) {
    if (!idValido(req.params.id)) return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
    const idProyecto = Number(req.params.id);
    const idUsuario = req.session.idUsuario;
    try {
        if (accion === 'consultar') return res.json(await mesaPlanning.consultar(idProyecto, idUsuario));
        await mesaPlanning.actualizar(idProyecto, idUsuario, accion, req.body || {});
        return res.sendStatus(204);
    } catch (error) {
        if (error instanceof mesaPlanning.ErrorMesa) return res.status(error.estado).json({ mensaje: error.message });
        console.error('Error en la mesa de Planning Poker:', error.code || error.message);
        return res.status(503).json({ mensaje: 'La mesa de votación no está disponible por el momento.' });
    }
}

const consultarMesa = (req, res) => atenderMesa(req, res, 'consultar');
const guardarAcuerdo = (req, res) => atenderMesa(req, res, 'guardar');
const actualizarMesa = (req, res) => {
    const accion = req.body?.accion;
    if (!accionesDeMesa.has(accion)) return res.status(400).json({ mensaje: 'Acción de mesa desconocida.' });
    return atenderMesa(req, res, accion);
};

module.exports = { consultarPlanning, guardarHorasEstimadas, consultarMesa, actualizarMesa, guardarAcuerdo };
