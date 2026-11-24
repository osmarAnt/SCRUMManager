// Sprint 7 · Bloque 2 (César) · HU-07: el Scrum Master crea épicas; todo el equipo las consulta.
const epicaDAO = require('../dao/epicaDAO');
const proyectoDAO = require('../dao/proyectoDAO');

const leerId = (valor) => (/^[1-9]\d{0,9}$/.test(String(valor)) ? Number(valor) : null);
const COLOR = /^#[0-9A-Fa-f]{6}$/;

// TC-07-03: nombre y color son obligatorios.
const validarEpica = (cuerpo) => {
    const { nombre, color, descripcion } = cuerpo || {};
    if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 100 ||
        /[\u0000-\u001f\u007f]/.test(nombre)) {
        return { error: 'Escribe el nombre de la épica (entre 2 y 100 caracteres).' };
    }
    if (typeof color !== 'string' || !COLOR.test(color.trim())) {
        return { error: 'Elige el color de la épica.' };
    }
    if (descripcion !== undefined && descripcion !== null &&
        (typeof descripcion !== 'string' || descripcion.trim().length > 500)) {
        return { error: 'La descripción de la épica no puede superar los 500 caracteres.' };
    }
    return {
        nombre: nombre.trim(),
        color: color.trim().toLowerCase(),
        descripcion: typeof descripcion === 'string' && descripcion.trim() ? descripcion.trim() : null
    };
};

// GET /proyectos/:id/epicas — cualquier integrante.
const listar = async (req, res) => {
    const idProyecto = leerId(req.params.id);
    try {
        const rol = idProyecto ? await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario) : null;
        if (!rol) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        const epicas = await epicaDAO.listar(idProyecto);
        res.json({
            epicas: epicas.map((epica) => ({ ...epica, total_historias: Number(epica.total_historias) })),
            puedeCrear: rol === 'Scrum Master'
        });
    } catch (error) {
        console.error('Error al consultar épicas:', error.code || error.message);
        res.status(500).json({ mensaje: 'No se pudieron cargar las épicas.' });
    }
};

// POST /proyectos/:id/epicas — solo el Scrum Master del proyecto (TC-07-01 y TC-07-02).
const crear = async (req, res) => {
    const idProyecto = leerId(req.params.id);
    try {
        const rol = idProyecto ? await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario) : null;
        if (!rol) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        if (rol !== 'Scrum Master') {
            return res.status(403).json({ mensaje: 'Solo el Scrum Master del proyecto puede crear épicas.' });
        }
        const datos = validarEpica(req.body);
        if (datos.error) {
            return res.status(400).json({ mensaje: datos.error });
        }
        const resultado = await epicaDAO.crear(idProyecto, req.session.idUsuario, datos);
        if (resultado.duplicada) {
            return res.status(409).json({ mensaje: `Ya existe una épica llamada "${datos.nombre}" en este proyecto.` });
        }
        res.status(201).json({
            mensaje: `Épica "${datos.nombre}" creada.`,
            epica: { id_epica: resultado.id_epica, ...datos, total_historias: 0 }
        });
    } catch (error) {
        console.error('Error al crear la épica:', error.code || error.message);
        res.status(500).json({ mensaje: 'No se pudo crear la épica.' });
    }
};

module.exports = { listar, crear };
