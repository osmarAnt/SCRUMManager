// controllers/backlog.controller.js
const BacklogDAO = require('../dao/backlogDAO');
exports.crearHistoria = async (req, res) => {
    // BLOQUEO: Solo Product Owner
    if (!req.session || req.session.rol !== 'Product Owner') {
        return res.status(403).json({ error: 'Acceso denegado: Solo el Product Owner puede crear historias.' });
    }

    const { id_proyecto, titulo, descripcion, puntos, prioridad } = req.body;

    if (!id_proyecto) {
        return res.status(400).json({ error: 'El id_proyecto es obligatorio' });
    }

    try {
        const idInsertado = await BacklogDAO.crear({ id_proyecto, titulo, descripcion, puntos, prioridad });
        res.status(201).json({ mensaje: 'Historia creada con éxito', id: idInsertado });
    } catch (error) {
        console.error('Error al guardar:', error);
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
};

exports.obtenerBacklogPorProyecto = async (req, res) => {
    const { id_proyecto } = req.params;
    try {
        const historias = await BacklogDAO.obtenerPorProyecto(id_proyecto);
        res.json(historias);
    } catch (error) {
        console.error('Error al obtener el backlog:', error);
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
};

exports.eliminarHistoria = async (req, res) => {
    // BLOQUEO: Solo Product Owner
    if (!req.session || req.session.rol !== 'Product Owner') {
        return res.status(403).json({ error: 'Acceso denegado: Solo el Product Owner puede eliminar historias.' });
    }

    const { id } = req.params;

    try {
        await BacklogDAO.eliminar(id);
        res.json({ mensaje: 'Historia eliminada con éxito' });
    } catch (error) {
        console.error('Error al eliminar:', error);
        if (error.message.includes('Sprint')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
};

exports.actualizarHistoria = async (req, res) => {
    // 1. Verificación del Product Owner
    if (!req.session || req.session.rol !== 'Product Owner') {
        return res.status(403).json({ error: 'Solo el Product Owner puede editar historias.' });
    }

    // 2. Extraer los datos (req.params.id debe coincidir con el :id de la ruta)
    const id_historia = req.params.id; 
    const { titulo, descripcion, puntos, prioridad } = req.body;

    try {
        await BacklogDAO.actualizar(id_historia, { titulo, descripcion, puntos, prioridad });
        res.json({ mensaje: 'Historia actualizada con éxito' });
    } catch (error) {
        console.error('Error al actualizar:', error);
        res.status(500).json({ error: 'Error interno en el servidor al actualizar' });
    }
};

exports.obtenerCriterios = async (req, res) => {
    const { id_historia } = req.params;
    try {
        const criterios = await BacklogDAO.obtenerCriteriosPorHistoria(id_historia);
        res.json(criterios);
    } catch (error) {
        console.error('Error al obtener criterios:', error);
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
};

exports.crearCriterio = async (req, res) => {
    if (!req.session || req.session.rol !== 'Product Owner') {
        return res.status(403).json({ error: 'Acceso denegado: Solo el Product Owner puede gestionar criterios.' });
    }

    const { id_historia, descripcion } = req.body;

    if (!descripcion) {
        return res.status(400).json({ error: 'La descripción del criterio es obligatoria' });
    }

    try {
        const idInsertado = await BacklogDAO.crearCriterio(id_historia, descripcion);
        res.status(201).json({ mensaje: 'Criterio creado con éxito', id: idInsertado });
    } catch (error) {
        console.error('Error al guardar criterio:', error);
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
};