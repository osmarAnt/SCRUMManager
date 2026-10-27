// controllers/backlog.controller.js
const BacklogDAO = require('../dao/backlogDAO');
const proyectoDAO = require('../dao/proyectoDAO');
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
exports.actualizarValorNegocio = async (req, res) => {
    const idProyecto = Number(req.params.id_proyecto);
    const idHistoria = Number(req.params.id_historia);
    const valorNegocio = req.body?.valor_negocio;
    
    if (
        !Number.isSafeInteger(idProyecto) ||
        idProyecto < 1 ||
        idProyecto > 2147483647 ||

        !Number.isSafeInteger(idHistoria) ||
        idHistoria < 1 ||
        idHistoria > 2147483647
    ) {
        return res.status(400).json({
            mensaje: 'Identificadores no válidos.'
        });
    }
    if (
        !Number.isInteger(valorNegocio) ||
        valorNegocio < 1 ||
        valorNegocio > 100
    ) {
        return res.status(400).json({
            mensaje: 'El valor de negocio debe ser un número entero entre 1 y 100.'
        });
    }
    try {
        const rolProyecto =
            await proyectoDAO.obtenerRolEnProyecto(
                idProyecto,
                req.session.idUsuario
            );
        // Solo Product Owner puede asignar valor
        if (rolProyecto !== 'Product Owner') {
            return res.status(403).json({
                mensaje: 'Solo el Product Owner del proyecto puede asignar valor de negocio.'
            });
        }
        const actualizado =
            await BacklogDAO.actualizarValorNegocio(
                idProyecto,
                idHistoria,
                valorNegocio
            );
        if (!actualizado) {
            return res.status(404).json({
                mensaje: 'La historia no existe o no pertenece a este proyecto.'
            });
        }
        return res.json({
            mensaje: 'Valor de negocio guardado correctamente.'
        });
    } catch (error) {
        console.error(
            'Error al actualizar el valor de negocio:',
            error
        );
        return res.status(500).json({
            mensaje: 'No se pudo guardar el valor de negocio.'
        });
    }
};

// ===== OSMAR: PB-24 - KANBAN =====
exports.obtenerKanban = async (req, res) => {
    const { id_sprint } = req.params;
    
    if (!id_sprint) {
        return res.status(400).json({ error: 'El id_sprint es obligatorio' });
    }

    try {
        const historias = await BacklogDAO.obtenerKanbanPorSprint(id_sprint);
        res.json(historias);
    } catch (error) {
        console.error('Error al obtener el Kanban:', error);
        res.status(500).json({ error: 'Error interno en el servidor al cargar Kanban' });
    }
};