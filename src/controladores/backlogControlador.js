// controllers/backlog.controller.js
const BacklogDAO = require('../dao/backlogDAO');
const proyectoDAO = require('../dao/proyectoDAO');
// Sprint 7 · Bloque 2 (César): épicas
const epicaDAO = require('../dao/epicaDAO');

const PRIORIDADES = ['Alta', 'Media', 'Baja'];

// Sprint 7 · Bloque 1 (Nino): los permisos se revisan con el ROL DENTRO DEL PROYECTO,
// nunca con el rol de la cuenta (req.session.rol). Así un Product Owner de otro proyecto
// no puede crear ni borrar historias aquí, ni ver backlogs de proyectos donde no participa.
const idValido = (valor) => {
    const numero = Number(valor);
    return Number.isSafeInteger(numero) && numero > 0 && numero <= 2147483647 ? numero : null;
};

const rolEn = (idProyecto, req) => proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario);

// Valida los datos de una historia (crear y editar). Devuelve { error } o los datos limpios.
const validarHistoria = (cuerpo, { exigirPuntos } = {}) => {
    const { titulo, descripcion, puntos, prioridad, id_epica: idEpica } = cuerpo || {};
    if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 150) {
        return { error: 'Escribe un título de hasta 150 caracteres.' };
    }
    if (typeof descripcion !== 'string' || !descripcion.trim() || descripcion.trim().length > 1000) {
        return { error: 'Escribe una descripción de hasta 1000 caracteres (formato Como / Quiero / Para).' };
    }
    if (!PRIORIDADES.includes(prioridad)) {
        return { error: 'Selecciona una prioridad válida (Alta, Media o Baja).' };
    }
    const sinPuntos = puntos === undefined || puntos === null || puntos === '';
    if (!sinPuntos && !(Number.isSafeInteger(Number(puntos)) && Number(puntos) > 0 && Number(puntos) <= 100000)) {
        return { error: 'Los puntos de historia deben ser un número entero mayor que 0.' };
    }
    // HU-08: la épica es obligatoria.
    const epica = idValido(idEpica);
    if (!epica) {
        return { error: 'Selecciona la épica a la que pertenece la historia.' };
    }
    return {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        prioridad,
        // Al editar, si no llegan puntos se conservan los actuales (undefined); null los borra.
        puntos: puntos === undefined && exigirPuntos ? undefined : (sinPuntos ? null : Number(puntos)),
        id_epica: epica
    };
};

exports.crearHistoria = async (req, res) => {
    const idProyecto = idValido(req.body?.id_proyecto);
    if (!idProyecto) {
        return res.status(400).json({ error: 'El id_proyecto es obligatorio.' });
    }
    try {
        // Solo el Product Owner DE ESTE PROYECTO crea historias (TC-08-06, TC-03-03).
        const rol = await rolEn(idProyecto, req);
        if (!rol) {
            return res.status(404).json({ error: 'No encontramos ese proyecto.' });
        }
        if (rol !== 'Product Owner') {
            return res.status(403).json({ error: 'Acceso denegado: solo el Product Owner del proyecto puede crear historias.' });
        }
        const datos = validarHistoria(req.body);
        if (datos.error) {
            return res.status(400).json({ error: datos.error });
        }
        if (!await epicaDAO.existeEnProyecto(idProyecto, datos.id_epica)) {
            return res.status(400).json({ error: 'La épica seleccionada no pertenece a este proyecto.' });
        }
        const idInsertado = await BacklogDAO.crear({ id_proyecto: idProyecto, ...datos });
        res.status(201).json({ mensaje: 'Historia creada con éxito', id: idInsertado });
    } catch (error) {
        console.error('Error al guardar:', error);
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
};

exports.obtenerBacklogPorProyecto = async (req, res) => {
    const idProyecto = idValido(req.params.id_proyecto);
    if (!idProyecto) {
        return res.status(404).json({ error: 'No encontramos ese proyecto.' });
    }
    try {
        // TC-03-02: solo los integrantes del proyecto ven su backlog.
        if (!await rolEn(idProyecto, req)) {
            return res.status(404).json({ error: 'No encontramos ese proyecto.' });
        }
        const historias = await BacklogDAO.obtenerPorProyecto(idProyecto);
        res.json(historias);
    } catch (error) {
        console.error('Error al obtener el backlog:', error);
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
};

exports.eliminarHistoria = async (req, res) => {
    const idHistoria = idValido(req.params.id);
    if (!idHistoria) {
        return res.status(404).json({ error: 'No encontramos esa historia.' });
    }
    try {
        const idProyecto = await BacklogDAO.obtenerProyectoDeHistoria(idHistoria);
        const rol = idProyecto ? await rolEn(idProyecto, req) : null;
        if (!rol) {
            return res.status(404).json({ error: 'No encontramos esa historia.' });
        }
        if (rol !== 'Product Owner') {
            return res.status(403).json({ error: 'Acceso denegado: solo el Product Owner del proyecto puede eliminar historias.' });
        }
        await BacklogDAO.eliminar(idHistoria, idProyecto);
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
// Sprint 7: también se puede cambiar la épica (queda en el historial).

exports.actualizarHistoria = async (req, res) => {

    const idHistoria = idValido(req.params.id);
    const idProyecto = idValido(req.body?.id_proyecto);

    if (!idHistoria || !idProyecto) {
        return res.status(400).json({ error: 'Revisa los datos de la historia.' });
    }

    const datos = validarHistoria(req.body, { exigirPuntos: true });
    if (datos.error) {
        return res.status(400).json({ error: datos.error });
    }

    try {

        // Comprobar que sea Product Owner de este proyecto
        const rol = await rolEn(idProyecto, req);

        if (rol !== 'Product Owner') {
            return res.status(403).json({
                error: 'Solo el Product Owner del proyecto puede editar historias.'
            });
        }

        if (!await epicaDAO.existeEnProyecto(idProyecto, datos.id_epica)) {
            return res.status(400).json({ error: 'La épica seleccionada no pertenece a este proyecto.' });
        }

        // Actualizar y registrar cambios
        const resultado = await BacklogDAO.actualizar(
            idProyecto,
            idHistoria,
            req.session.idUsuario,
            datos
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

    const idProyecto = idValido(req.params.id_proyecto);
    const idHistoria = idValido(req.params.id_historia);

    if (!idProyecto || !idHistoria) {
        return res.status(400).json({
            mensaje: 'Identificadores no válidos.'
        });
    }

    try {

        // Verificar que el usuario pertenezca al proyecto
        if (!await rolEn(idProyecto, req)) {
            return res.status(403).json({
                mensaje: 'No perteneces a este proyecto.'
            });
        }

        // Comprobar que la historia exista en el proyecto
        if (await BacklogDAO.obtenerProyectoDeHistoria(idHistoria) !== idProyecto) {
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


// ===== CRITERIOS DE ACEPTACIÓN =====

exports.obtenerCriterios = async (req, res) => {
    const idHistoria = idValido(req.params.id_historia);
    if (!idHistoria) {
        return res.status(404).json({ error: 'No encontramos esa historia.' });
    }
    try {
        const idProyecto = await BacklogDAO.obtenerProyectoDeHistoria(idHistoria);
        if (!idProyecto || !await rolEn(idProyecto, req)) {
            return res.status(404).json({ error: 'No encontramos esa historia.' });
        }
        const criterios = await BacklogDAO.obtenerCriteriosPorHistoria(idHistoria);
        res.json(criterios);
    } catch (error) {
        console.error('Error al obtener criterios:', error);
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
};

exports.crearCriterio = async (req, res) => {
    const idHistoria = idValido(req.body?.id_historia);
    const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : '';

    if (!idHistoria) {
        return res.status(400).json({ error: 'Selecciona una historia.' });
    }
    if (!descripcion || descripcion.length > 1000) {
        return res.status(400).json({ error: 'La descripción del criterio es obligatoria (hasta 1000 caracteres).' });
    }

    try {
        const idProyecto = await BacklogDAO.obtenerProyectoDeHistoria(idHistoria);
        const rol = idProyecto ? await rolEn(idProyecto, req) : null;
        if (!rol) {
            return res.status(404).json({ error: 'No encontramos esa historia.' });
        }
        if (rol !== 'Product Owner') {
            return res.status(403).json({ error: 'Acceso denegado: solo el Product Owner del proyecto puede gestionar criterios.' });
        }
        const idInsertado = await BacklogDAO.crearCriterio(idHistoria, descripcion);
        res.status(201).json({ mensaje: 'Criterio creado con éxito', id: idInsertado });
    } catch (error) {
        console.error('Error al guardar criterio:', error);
        res.status(500).json({ error: 'Error interno en el servidor' });
    }
};

// Sprint 7 · Bloque 3 (Francisco) · HU-09: marcar un criterio como cumplido o pendiente.
// Lo hace el desarrollador responsable de la historia (o el Product Owner al revisar).
exports.marcarCriterio = async (req, res) => {
    const idCriterio = idValido(req.params.id_criterio);
    const { completado } = req.body || {};
    if (!idCriterio) {
        return res.status(404).json({ mensaje: 'No encontramos ese criterio.' });
    }
    if (typeof completado !== 'boolean') {
        return res.status(400).json({ mensaje: 'Indica si el criterio está cumplido (true o false).' });
    }
    try {
        const criterio = await BacklogDAO.obtenerCriterio(idCriterio);
        const rol = criterio ? await rolEn(criterio.id_proyecto, req) : null;
        if (!rol) {
            return res.status(404).json({ mensaje: 'No encontramos ese criterio.' });
        }
        const esResponsable = rol === 'Desarrollador' &&
            Number(criterio.id_responsable) === Number(req.session.idUsuario);
        if (!esResponsable && rol !== 'Product Owner') {
            return res.status(403).json({
                mensaje: 'Solo el desarrollador responsable de la historia o el Product Owner pueden marcar criterios.'
            });
        }
        if (['En revision', 'Aprobada'].includes(criterio.estado_historia)) {
            return res.status(409).json({ mensaje: 'La historia ya está en revisión o aprobada; sus criterios ya no cambian.' });
        }
        await BacklogDAO.marcarCriterio(idCriterio, completado);
        res.json({ mensaje: completado ? 'Criterio marcado como cumplido.' : 'Criterio marcado como pendiente.', completado });
    } catch (error) {
        console.error('Error al marcar criterio:', error);
        res.status(500).json({ mensaje: 'No se pudo actualizar el criterio.' });
    }
};

exports.actualizarValorNegocio = async (req, res) => {
    const idProyecto = idValido(req.params.id_proyecto);
    const idHistoria = idValido(req.params.id_historia);
    const valorNegocio = req.body?.valor_negocio;

    if (!idProyecto || !idHistoria) {
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
        // Solo Product Owner puede asignar valor
        if (await rolEn(idProyecto, req) !== 'Product Owner') {
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
    const idSprint = idValido(req.params.id_sprint);

    if (!idSprint) {
        return res.status(400).json({ mensaje: 'Sprint no válido.' });
    }

    try {
        const idProyecto = await BacklogDAO.obtenerProyectoDeSprint(idSprint);

        if (!idProyecto) {
            return res.status(404).json({ mensaje: 'No se encontró el Sprint.' });
        }

        if (!await rolEn(idProyecto, req)) {
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
