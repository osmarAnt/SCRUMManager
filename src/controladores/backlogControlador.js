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


// ===== JESÚS: PB-28 - ACTUALIZAR Y REGISTRAR CAMBIOS =====

exports.actualizarHistoria = async (req, res) => {

    const idHistoria = Number(req.params.id);
    const idProyecto = Number(req.body?.id_proyecto);

    const {
        titulo,
        descripcion,
        puntos,
        prioridad
    } = req.body || {};

    // Comprobar que sea Product Owner
    if (
        !req.session?.idUsuario ||
        req.session.rol !== 'Product Owner'
    ) {
        return res.status(403).json({
            error: 'Solo el Product Owner puede editar historias.'
        });
    }

    // Validar la información
    if (
        !Number.isSafeInteger(idHistoria) ||
        idHistoria < 1 ||
        !Number.isSafeInteger(idProyecto) ||
        idProyecto < 1 ||
        typeof titulo !== 'string' ||
        !titulo.trim() ||
        titulo.trim().length > 150 ||
        typeof descripcion !== 'string' ||
        !descripcion.trim() ||
        descripcion.length > 1000 ||
        !['Alta', 'Media', 'Baja'].includes(prioridad) ||
        !(
            puntos === null ||
            (
                Number.isSafeInteger(puntos) &&
                puntos > 0 &&
                puntos <= 100000
            )
        )
    ) {
        return res.status(400).json({
            error: 'Revisa los datos de la historia.'
        });
    }

    try {

        // Comprobar que sea Product Owner de este proyecto
        const rol = await proyectoDAO.obtenerRolEnProyecto(
            idProyecto,
            req.session.idUsuario
        );

        if (rol !== 'Product Owner') {
            return res.status(403).json({
                error: 'No eres Product Owner de este proyecto.'
            });
        }

        // Actualizar y registrar cambios
        const resultado = await BacklogDAO.actualizar(
            idProyecto,
            idHistoria,
            req.session.idUsuario,
            {
                titulo: titulo.trim(),
                descripcion: descripcion.trim(),
                puntos,
                prioridad
            }
        );

        if (!resultado.encontrada) {
            return res.status(404).json({
                error: 'Historia no encontrada en este proyecto.'
            });
        }

        return res.json({
            mensaje: resultado.modificado
                ? 'Historia actualizada y registrada en el historial.'
                : 'No hubo modificaciones que registrar.'
        });

    } catch (error) {

        console.error('Error al registrar cambios:', error);

        return res.status(500).json({
            error: 'No se pudo actualizar la historia.'
        });
    }
};


// ===== JESÚS: PB-29 - CONSULTAR HISTORIAL =====

exports.consultarHistorial = async (req, res) => {

    const idProyecto = Number(req.params.id_proyecto);
    const idHistoria = Number(req.params.id_historia);

    if (
        !Number.isSafeInteger(idProyecto) ||
        idProyecto < 1 ||
        !Number.isSafeInteger(idHistoria) ||
        idHistoria < 1
    ) {
        return res.status(400).json({
            mensaje: 'Identificadores no válidos.'
        });
    }

    try {

        // Verificar que el usuario pertenezca al proyecto
        const rol = await proyectoDAO.obtenerRolEnProyecto(
            idProyecto,
            req.session.idUsuario
        );

        if (!rol) {
            return res.status(403).json({
                mensaje: 'No perteneces a este proyecto.'
            });
        }

        // Comprobar que la historia exista
        const historias = await BacklogDAO.obtenerPorProyecto(
            idProyecto
        );

        if (!historias.some(
            h => Number(h.id_historia) === idHistoria
        )) {
            return res.status(404).json({
                mensaje: 'Historia no encontrada.'
            });
        }

        // Obtener todas las modificaciones de la historia
        const historial = await BacklogDAO.obtenerHistorial(
            idProyecto,
            idHistoria
        );

        return res.json(historial);

    } catch (error) {

        console.error('Error al consultar historial:', error);

        return res.status(500).json({
            mensaje: 'No se pudo consultar el historial.'
        });
    }
};

// ===== FIN PB-28 Y PB-29 =====


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
    const idSprint = Number(req.params.id_sprint);

    if (!Number.isSafeInteger(idSprint) || idSprint <= 0 || idSprint > 2147483647) {
        return res.status(400).json({ mensaje: 'Sprint no válido.' });
    }

    try {
        const idProyecto = await BacklogDAO.obtenerProyectoDeSprint(idSprint);

        if (!idProyecto) {
            return res.status(404).json({ mensaje: 'No se encontró el Sprint.' });
        }

        const rol = await proyectoDAO.obtenerRolEnProyecto(
            idProyecto,
            req.session.idUsuario
        );

        if (!rol) {
            return res.status(403).json({
                mensaje: 'No tienes permiso para consultar este Sprint.'
            });
        }

        const historias = await BacklogDAO.obtenerKanbanPorSprint(
            idSprint,
            idProyecto
        );

        return res.json(historias);

    } catch (error) {
        console.error('Error al obtener Kanban:', error);
        return res.status(500).json({
            mensaje: 'No se pudo cargar el tablero Kanban.'
        });
    }
};