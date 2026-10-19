// controllers/backlog.controller.js
const BacklogDAO = require('../dao/backlogDAO');
exports.crearHistoria = async (req, res) => {
    const { id_proyecto, titulo, descripcion, puntos, prioridad } = req.body;

    if (!id_proyecto) {
        return res.status(400).json({ error: 'El id_proyecto es obligatorio' });
    }

    try {
        // Le pasamos los datos al DAO para que él se encargue de la BD
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
        // Le pedimos los datos al DAO
        const historias = await BacklogDAO.obtenerPorProyecto(id_proyecto);
        res.json(historias);
    } catch (error) {
        console.error('Error al obtener el backlog:', error);
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
};

exports.eliminarHistoria = async (req, res) => {
    const { id } = req.params;

    try {
        // Le indicamos al DAO qué eliminar
        await BacklogDAO.eliminar(id);
        res.json({ mensaje: 'Historia eliminada con éxito' });
    } catch (error) {
        console.error('Error al eliminar:', error);
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
};