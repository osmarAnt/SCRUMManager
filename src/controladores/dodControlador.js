// Sprint 7 · Bloque 3 (Francisco) · HU-09 y HU-10: criterios de aceptación y Definition of Done.
//  - DoD de la historia: la define el Scrum Master; la marcan el desarrollador responsable o el SM.
//  - DoD del Sprint: la define y la marca el Scrum Master; se valida al finalizar el Sprint.
//  - Una historia no puede pasar a "Terminada" con criterios o DoD pendientes (ver cambiarEstadoHistoria).
const dodDAO = require('../dao/dodDAO');
const proyectoDAO = require('../dao/proyectoDAO');

const leerId = (valor) => (/^[1-9]\d{0,9}$/.test(String(valor)) ? Number(valor) : null);
const BLOQUEADA = ['En revision', 'Aprobada'];

const leerDescripcion = (cuerpo) => {
    const texto = typeof cuerpo?.descripcion === 'string' ? cuerpo.descripcion.trim() : '';
    if (texto.length < 3 || texto.length > 255) {
        return { error: 'Escribe el requisito (entre 3 y 255 caracteres), por ejemplo "Código revisado".' };
    }
    return { descripcion: texto };
};

// Devuelve el rol o responde 404 si el usuario no pertenece al proyecto.
const rolDelProyecto = async (req, res) => {
    const idProyecto = leerId(req.params.id);
    const rol = idProyecto ? await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario) : null;
    if (!rol) {
        res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        return null;
    }
    return { idProyecto, rol };
};

const fallo = (res, contexto, error) => {
    console.error(`${contexto}:`, error.code || error.message);
    res.status(500).json({ mensaje: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' });
};

// GET /proyectos/:id/historias/:idHistoria/calidad
// Criterios y DoD de la historia, y qué puede hacer el usuario con ellos.
const consultarHistoria = async (req, res) => {
    try {
        const acceso = await rolDelProyecto(req, res);
        if (!acceso) return;
        const idHistoria = leerId(req.params.idHistoria);
        const historia = idHistoria ? await dodDAO.historiaDelProyecto(acceso.idProyecto, idHistoria) : null;
        if (!historia) {
            return res.status(404).json({ mensaje: 'No encontramos esa historia.' });
        }
        const [criterios, dod] = await Promise.all([
            dodDAO.criteriosDeHistoria(idHistoria),
            dodDAO.listarDeHistoria(idHistoria)
        ]);
        const esResponsable = acceso.rol === 'Desarrollador' &&
            Number(historia.id_responsable) === Number(req.session.idUsuario);
        const bloqueada = BLOQUEADA.includes(historia.estado_historia);
        res.json({
            historia: { id_historia: historia.id_historia, titulo: historia.titulo, estado_historia: historia.estado_historia },
            criterios,
            dod,
            bloqueada,
            puedeMarcarCriterios: !bloqueada && (esResponsable || acceso.rol === 'Product Owner'),
            puedeMarcarDod: !bloqueada && (esResponsable || acceso.rol === 'Scrum Master'),
            puedeDefinirDod: !bloqueada && acceso.rol === 'Scrum Master'
        });
    } catch (error) {
        fallo(res, 'Error al consultar criterios y DoD', error);
    }
};

// POST /proyectos/:id/historias/:idHistoria/dod — el SM agrega un requisito al DoD de la historia.
const agregarAHistoria = async (req, res) => {
    try {
        const acceso = await rolDelProyecto(req, res);
        if (!acceso) return;
        if (acceso.rol !== 'Scrum Master') {
            return res.status(403).json({ mensaje: 'Solo el Scrum Master define la Definition of Done.' });
        }
        const idHistoria = leerId(req.params.idHistoria);
        const historia = idHistoria ? await dodDAO.historiaDelProyecto(acceso.idProyecto, idHistoria) : null;
        if (!historia) {
            return res.status(404).json({ mensaje: 'No encontramos esa historia.' });
        }
        if (BLOQUEADA.includes(historia.estado_historia)) {
            return res.status(409).json({ mensaje: 'La historia ya está en revisión o aprobada; su DoD ya no cambia.' });
        }
        const datos = leerDescripcion(req.body);
        if (datos.error) {
            return res.status(400).json({ mensaje: datos.error });
        }
        const requisito = await dodDAO.agregar(acceso.idProyecto, { id_historia: idHistoria }, datos.descripcion);
        res.status(201).json({ mensaje: 'Requisito agregado a la Definition of Done de la historia.', requisito });
    } catch (error) {
        fallo(res, 'Error al agregar requisito DoD a la historia', error);
    }
};

// GET /proyectos/:id/sprints/:idSprint/dod
const consultarSprint = async (req, res) => {
    try {
        const acceso = await rolDelProyecto(req, res);
        if (!acceso) return;
        const idSprint = leerId(req.params.idSprint);
        const sprint = idSprint ? await dodDAO.sprintDelProyecto(acceso.idProyecto, idSprint) : null;
        if (!sprint) {
            return res.status(404).json({ mensaje: 'No encontramos ese Sprint.' });
        }
        const finalizado = sprint.estado === 'Finalizado';
        res.json({
            sprint,
            dod: await dodDAO.listarDeSprint(idSprint),
            puedeAdministrar: acceso.rol === 'Scrum Master' && !finalizado,
            finalizado
        });
    } catch (error) {
        fallo(res, 'Error al consultar el DoD del Sprint', error);
    }
};

// POST /proyectos/:id/sprints/:idSprint/dod — el SM agrega un requisito al DoD del Sprint.
const agregarASprint = async (req, res) => {
    try {
        const acceso = await rolDelProyecto(req, res);
        if (!acceso) return;
        if (acceso.rol !== 'Scrum Master') {
            return res.status(403).json({ mensaje: 'Solo el Scrum Master define la Definition of Done.' });
        }
        const idSprint = leerId(req.params.idSprint);
        const sprint = idSprint ? await dodDAO.sprintDelProyecto(acceso.idProyecto, idSprint) : null;
        if (!sprint) {
            return res.status(404).json({ mensaje: 'No encontramos ese Sprint.' });
        }
        if (sprint.estado === 'Finalizado') {
            return res.status(409).json({ mensaje: 'El Sprint ya está finalizado; su DoD ya no cambia.' });
        }
        const datos = leerDescripcion(req.body);
        if (datos.error) {
            return res.status(400).json({ mensaje: datos.error });
        }
        const requisito = await dodDAO.agregar(acceso.idProyecto, { id_sprint: idSprint }, datos.descripcion);
        res.status(201).json({ mensaje: 'Requisito agregado a la Definition of Done del Sprint.', requisito });
    } catch (error) {
        fallo(res, 'Error al agregar requisito DoD al Sprint', error);
    }
};

// Revisa si el usuario puede modificar (marcar o borrar) un requisito. Responde y devuelve null si no.
const autorizarCambio = async (req, res, { borrar }) => {
    const acceso = await rolDelProyecto(req, res);
    if (!acceso) return null;
    const idRequisito = leerId(req.params.idRequisito);
    const requisito = idRequisito ? await dodDAO.obtener(acceso.idProyecto, idRequisito) : null;
    if (!requisito) {
        res.status(404).json({ mensaje: 'No encontramos ese requisito.' });
        return null;
    }
    if (requisito.id_sprint) {
        if (acceso.rol !== 'Scrum Master') {
            res.status(403).json({ mensaje: 'Solo el Scrum Master administra la Definition of Done del Sprint.' });
            return null;
        }
        if (requisito.estado_sprint === 'Finalizado') {
            res.status(409).json({ mensaje: 'El Sprint ya está finalizado; su DoD ya no cambia.' });
            return null;
        }
    } else {
        const esResponsable = acceso.rol === 'Desarrollador' &&
            Number(requisito.id_responsable) === Number(req.session.idUsuario);
        const permitido = borrar ? acceso.rol === 'Scrum Master' : (esResponsable || acceso.rol === 'Scrum Master');
        if (!permitido) {
            res.status(403).json({
                mensaje: borrar
                    ? 'Solo el Scrum Master puede quitar requisitos de la Definition of Done.'
                    : 'Solo el desarrollador responsable o el Scrum Master pueden marcar la Definition of Done.'
            });
            return null;
        }
        if (BLOQUEADA.includes(requisito.estado_historia)) {
            res.status(409).json({ mensaje: 'La historia ya está en revisión o aprobada; su DoD ya no cambia.' });
            return null;
        }
    }
    return requisito;
};

// PUT /proyectos/:id/dod/:idRequisito — marcar cumplido / pendiente.
const marcar = async (req, res) => {
    try {
        if (typeof req.body?.cumplido !== 'boolean') {
            return res.status(400).json({ mensaje: 'Indica si el requisito está cumplido (true o false).' });
        }
        const requisito = await autorizarCambio(req, res, { borrar: false });
        if (!requisito) return;
        await dodDAO.marcar(requisito.id_requisito, req.body.cumplido);
        res.json({
            mensaje: req.body.cumplido ? 'Requisito cumplido.' : 'Requisito marcado como pendiente.',
            cumplido: req.body.cumplido
        });
    } catch (error) {
        fallo(res, 'Error al marcar requisito DoD', error);
    }
};

// DELETE /proyectos/:id/dod/:idRequisito — el SM quita un requisito.
const eliminar = async (req, res) => {
    try {
        const requisito = await autorizarCambio(req, res, { borrar: true });
        if (!requisito) return;
        await dodDAO.eliminar(requisito.id_requisito);
        res.json({ mensaje: 'Requisito eliminado de la Definition of Done.' });
    } catch (error) {
        fallo(res, 'Error al eliminar requisito DoD', error);
    }
};

module.exports = { consultarHistoria, agregarAHistoria, consultarSprint, agregarASprint, marcar, eliminar };
