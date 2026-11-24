// Sprint 7 · Bloque 4 (Jesús) · HU-16: impedimentos.
//  - Cualquier integrante registra un impedimento (TC-16-01).
//  - El Scrum Master (o quien lo registró) escribe la solución y lo marca como resuelto (TC-16-02).
//  - Los resueltos no se borran: quedan en el historial (TC-16-03).
const impedimentoDAO = require('../dao/impedimentoDAO');
const proyectoDAO = require('../dao/proyectoDAO');

const leerId = (valor) => (/^[1-9]\d{0,9}$/.test(String(valor)) ? Number(valor) : null);
const IMPACTOS = ['Bajo', 'Medio', 'Alto'];
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const texto = (valor, minimo, maximo) => {
    const limpio = typeof valor === 'string' ? valor.trim() : '';
    return limpio.length >= minimo && limpio.length <= maximo && !CONTROL.test(limpio) ? limpio : null;
};

const acceso = async (req, res) => {
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

// GET /proyectos/:id/impedimentos
const listar = async (req, res) => {
    try {
        const datos = await acceso(req, res);
        if (!datos) return;
        const impedimentos = await impedimentoDAO.listar(datos.idProyecto);
        const idUsuario = Number(req.session.idUsuario);
        res.json({
            impedimentos: impedimentos.map((imp) => ({
                ...imp,
                puedeResolver: imp.estado === 'Activo' &&
                    (datos.rol === 'Scrum Master' || Number(imp.id_autor) === idUsuario)
            })),
            activos: impedimentos.filter((imp) => imp.estado === 'Activo').length,
            resueltos: impedimentos.filter((imp) => imp.estado === 'Resuelto').length
        });
    } catch (error) {
        fallo(res, 'Error al consultar impedimentos', error);
    }
};

// POST /proyectos/:id/impedimentos
const crear = async (req, res) => {
    try {
        const datos = await acceso(req, res);
        if (!datos) return;
        const titulo = texto(req.body?.titulo, 3, 150);
        const descripcion = texto(req.body?.descripcion, 3, 2000);
        const impacto = req.body?.impacto || 'Medio';
        if (!titulo) {
            return res.status(400).json({ mensaje: 'Escribe el impedimento (entre 3 y 150 caracteres).' });
        }
        if (!descripcion) {
            return res.status(400).json({ mensaje: 'Describe cómo afecta al equipo (entre 3 y 2000 caracteres).' });
        }
        if (!IMPACTOS.includes(impacto)) {
            return res.status(400).json({ mensaje: 'Selecciona el impacto: Bajo, Medio o Alto.' });
        }
        let idSprint = null;
        if (req.body?.id_sprint !== undefined && req.body.id_sprint !== null && req.body.id_sprint !== '') {
            idSprint = leerId(req.body.id_sprint);
            if (!idSprint || !await impedimentoDAO.sprintEsDelProyecto(datos.idProyecto, idSprint)) {
                return res.status(400).json({ mensaje: 'El Sprint seleccionado no pertenece a este proyecto.' });
            }
        }
        const id = await impedimentoDAO.crear(datos.idProyecto, req.session.idUsuario, {
            titulo, descripcion, impacto, id_sprint: idSprint
        });
        res.status(201).json({ mensaje: 'Impedimento registrado. El Scrum Master ya puede darle seguimiento.', id_impedimento: id });
    } catch (error) {
        fallo(res, 'Error al registrar el impedimento', error);
    }
};

// PUT /proyectos/:id/impedimentos/:idImpedimento/resolver
const resolver = async (req, res) => {
    try {
        const datos = await acceso(req, res);
        if (!datos) return;
        const idImpedimento = leerId(req.params.idImpedimento);
        const impedimento = idImpedimento ? await impedimentoDAO.obtener(datos.idProyecto, idImpedimento) : null;
        if (!impedimento) {
            return res.status(404).json({ mensaje: 'No encontramos ese impedimento.' });
        }
        const esAutor = Number(impedimento.id_autor) === Number(req.session.idUsuario);
        if (datos.rol !== 'Scrum Master' && !esAutor) {
            return res.status(403).json({ mensaje: 'Solo el Scrum Master o quien registró el impedimento puede resolverlo.' });
        }
        if (impedimento.estado !== 'Activo') {
            return res.status(409).json({ mensaje: 'Este impedimento ya está resuelto.' });
        }
        const solucion = texto(req.body?.solucion, 3, 2000);
        if (!solucion) {
            return res.status(400).json({ mensaje: 'Escribe la solución aplicada (entre 3 y 2000 caracteres).' });
        }
        if (!await impedimentoDAO.resolver(datos.idProyecto, idImpedimento, req.session.idUsuario, solucion)) {
            return res.status(409).json({ mensaje: 'Este impedimento ya está resuelto.' });
        }
        res.json({ mensaje: 'Impedimento resuelto. Queda en el historial con su solución.' });
    } catch (error) {
        fallo(res, 'Error al resolver el impedimento', error);
    }
};

module.exports = { listar, crear, resolver };
