const path = require('path');
const proyectoDAO = require('../dao/proyectoDAO');
const sprintDAO = require('../dao/sprintDAO');
// JESÚS: PB-14
const backlogDAO = require('../dao/backlogDAO');
// PB-19 y PB-20
const revisionDAO = require('../dao/revisionDAO');

const DURACION_MAXIMA_SPRINT = 31;
const CARACTERES_DE_CONTROL = /[\u0000-\u001f\u007f]/;

const errorServidor = (res, contexto, error) => {
    console.error(`${contexto}:`, error.code || error.message);
    return res.status(500).json({ mensaje: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' });
};

const leerIdProyecto = (req) => {
    return /^\d{1,10}$/.test(req.params.id) ? Number(req.params.id) : null;
};

// Valida y normaliza nombre y objetivo (PB-04 y PB-05). Devuelve { error } o { nombre, objetivo }.
const validarDatosProyecto = (cuerpo) => {
    const { nombre, objetivo } = cuerpo || {};
    if (typeof nombre !== 'string' || (objetivo !== undefined && objetivo !== null && typeof objetivo !== 'string')) {
        return { error: 'Escribe el nombre del proyecto.' };
    }
    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 3 || nombreLimpio.length > 120 || CARACTERES_DE_CONTROL.test(nombreLimpio)) {
        return { error: 'El nombre del proyecto debe tener entre 3 y 120 caracteres.' };
    }
    const objetivoLimpio = (objetivo || '').trim();
    if (objetivoLimpio.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(objetivoLimpio)) {
        return { error: 'El objetivo no puede superar los 1000 caracteres.' };
    }
    return { nombre: nombreLimpio, objetivo: objetivoLimpio || null };
};

// Convierte 'AAAA-MM-DD' a milisegundos UTC; devuelve null si no es una fecha real.
const leerFecha = (valor) => {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return null;
    }
    const [anio, mes, dia] = valor.split('-').map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) {
        return null;
    }
    return fecha.getTime();
};

// Valida los datos del Sprint (PB-13). La duración se calcula aquí, nunca se confía en la del cliente.
// Sprint 7 · Bloque 5 (Osmar) · HU-13: capacidad del equipo en horas (opcional, 0.25 a 9999).
const leerCapacidad = (valor) => {
    if (valor === undefined || valor === null || valor === '') return { capacidad: null };
    const texto = String(valor).trim();
    const numero = Number(texto);
    if (!/^\d+(\.\d{1,2})?$/.test(texto) || numero <= 0 || numero > 9999) {
        return { error: 'La capacidad debe ser un número de horas mayor que 0 (máximo 2 decimales).' };
    }
    return { capacidad: numero };
};

const validarDatosSprint = (cuerpo) => {
    const { objetivo, fecha_inicio: fechaInicio, fecha_fin: fechaFin, nombre } = cuerpo || {};
    // Sprint 7 · Bloque 1 (Nino) · HU-12: el Sprint tiene nombre.
    if (typeof nombre !== 'string' || nombre.trim().length < 3 || nombre.trim().length > 120 ||
        CARACTERES_DE_CONTROL.test(nombre.trim())) {
        return { error: 'Escribe el nombre del Sprint (entre 3 y 120 caracteres).' };
    }
    const capacidad = leerCapacidad(cuerpo.capacidad_horas);
    if (capacidad.error) {
        return { error: capacidad.error };
    }
    if (typeof objetivo !== 'string' || !objetivo.trim()) {
        return { error: 'Escribe el objetivo del Sprint.' };
    }
    const objetivoLimpio = objetivo.trim();
    if (objetivoLimpio.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(objetivoLimpio)) {
        return { error: 'El objetivo del Sprint no puede superar los 1000 caracteres.' };
    }
    const inicio = leerFecha(fechaInicio);
    const fin = leerFecha(fechaFin);
    if (inicio === null || fin === null) {
        return { error: 'Indica una fecha de inicio y una fecha de fin válidas.' };
    }
    if (fin < inicio) {
        return { error: 'La fecha de fin no puede ser anterior a la fecha de inicio.' };
    }
    const duracionDias = Math.round((fin - inicio) / 86400000) + 1;
    if (duracionDias > DURACION_MAXIMA_SPRINT) {
        return { error: `Un Sprint no puede durar más de ${DURACION_MAXIMA_SPRINT} días.` };
    }
    return {
        nombre: nombre.trim(),
        objetivo: objetivoLimpio,
        fechaInicio,
        fechaFin,
        duracionDias,
        capacidad: capacidad.capacidad
    };
};

// Comprueba que el usuario pertenezca al proyecto. Si exigirScrumMaster, además debe administrarlo.
// Responde y devuelve null si no procede; si procede devuelve el rol.
const autorizarAcceso = async (req, res, idProyecto, exigirScrumMaster) => {
    const rol = await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario);
    if (!rol) {
        res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        return null;
    }
    if (exigirScrumMaster && rol !== 'Scrum Master') {
        res.status(403).json({ mensaje: 'Solo el Scrum Master del proyecto puede hacer este cambio.' });
        return null;
    }
    return rol;
};

const mostrarProyectos = (req, res) => {
    res.sendFile(
        path.join(__dirname, '..', '..', 'vistas', 'proyectos.html')
    );
};

const listarProyectos = (req, res) => {
    proyectoDAO.listarPorUsuario(req.session.idUsuario, (error, proyectos) => {
        if (error) {
            console.error('Error al consultar proyectos:', error.code);
            return res.status(500).json({ mensaje: 'No se pudieron cargar tus proyectos. Inténtalo de nuevo.' });
        }
        res.json({
            usuario: {
                nombre: req.session.nombre,
                username: req.session.usuario,
                rol: req.session.rol
            },
            proyectos
        });
    });
};

// PB-04
// Sprint 7 · Bloque 1 (Nino) · TC-04-01: cualquier usuario registrado crea proyectos y queda
// como su Scrum Master. El rol es por proyecto: en otros proyectos puede ser PO o Desarrollador.
const crearProyecto = async (req, res) => {
    const datos = validarDatosProyecto(req.body);
    if (datos.error) {
        return res.status(400).json({ mensaje: datos.error });
    }
    try {
        const idProyecto = await proyectoDAO.crearProyecto(datos.nombre, datos.objetivo, req.session.idUsuario);
        res.status(201).json({
            mensaje: 'Proyecto creado correctamente.',
            proyecto: { id_proyecto: idProyecto, nombre: datos.nombre, objetivo: datos.objetivo, rol: 'Scrum Master' }
        });
    } catch (error) {
        errorServidor(res, 'Error al crear el proyecto', error);
    }
};

const mostrarProyecto = (req, res) => {
    if (leerIdProyecto(req) === null) {
        return res.redirect('/proyectos');
    }
    res.sendFile(
        path.join(__dirname, '..', '..', 'vistas', 'proyecto.html')
    );
};

// PB-05 y PB-13: datos del proyecto y sus Sprints para cualquier integrante.
const consultarProyecto = async (req, res) => {
    const idProyecto = leerIdProyecto(req);
    if (idProyecto === null) {
        return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
    }
    try {
        const rol = await autorizarAcceso(req, res, idProyecto, false);
        if (!rol) {
            return;
        }
        const [proyecto, sprints] = await Promise.all([
            proyectoDAO.obtenerPorId(idProyecto),
            sprintDAO.listarPorProyecto(idProyecto)
        ]);
        if (!proyecto) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        res.json({
            usuario: {
                id_usuario: req.session.idUsuario,
                nombre: req.session.nombre,
                username: req.session.usuario,
                rol: req.session.rol
            },
            proyecto,
            rol,
            puedeAdministrar: rol === 'Scrum Master',
            puedeInvitar: rol === 'Scrum Master',
            sprints
        });
    } catch (error) {
        errorServidor(res, 'Error al consultar el proyecto', error);
    }
};

// PB-05
const actualizarProyecto = async (req, res) => {
    const idProyecto = leerIdProyecto(req);
    if (idProyecto === null) {
        return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
    }
    const datos = validarDatosProyecto(req.body);
    if (datos.error) {
        return res.status(400).json({ mensaje: datos.error });
    }
    try {
        const rol = await autorizarAcceso(req, res, idProyecto, true);
        if (!rol) {
            return;
        }
        const actualizado = await proyectoDAO.actualizarProyecto(idProyecto, datos.nombre, datos.objetivo);
        if (!actualizado) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        res.json({
            mensaje: 'Los datos del proyecto se actualizaron.',
            proyecto: { id_proyecto: idProyecto, nombre: datos.nombre, objetivo: datos.objetivo }
        });
    } catch (error) {
        errorServidor(res, 'Error al actualizar el proyecto', error);
    }
};

// PB-13
const crearSprint = async (req, res) => {
    const idProyecto = leerIdProyecto(req);
    if (idProyecto === null) {
        return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
    }
    const datos = validarDatosSprint(req.body);
    if (datos.error) {
        return res.status(400).json({ mensaje: datos.error });
    }
    try {
        const rol = await autorizarAcceso(req, res, idProyecto, true);
        if (!rol) {
            return;
        }
        // Sprint 7 · Bloque 5 (Osmar) · TC-06-04: no se configura un Sprint sin el equipo mínimo
        // (Scrum Master, al menos un Product Owner y al menos un Desarrollador que ya aceptaron).
        const equipo = await sprintDAO.contarRolesDelEquipo(idProyecto);
        const faltan = [];
        if (!equipo['Product Owner']) faltan.push('un Product Owner');
        if (!equipo.Desarrollador) faltan.push('al menos un Desarrollador');
        if (faltan.length) {
            return res.status(409).json({
                mensaje: `El equipo está incompleto: falta ${faltan.join(' y ')}. Invítalos (y espera a que acepten) antes de configurar un Sprint.`
            });
        }
        const resultado = await sprintDAO.crearSprint(idProyecto, datos);
        if (resultado.traslape) {
            return res.status(409).json({
                mensaje: `Las fechas se traslapan con el Sprint ${resultado.traslape} de este proyecto.`
            });
        }
        res.status(201).json({
            mensaje: 'Sprint registrado. Ya está disponible para planificarlo.',
            sprint: resultado.sprint
        });
    } catch (error) {
        errorServidor(res, 'Error al registrar el Sprint', error);
    }
};



// ===== JESÚS: PB-14 - AGREGAR HISTORIAS AL SPRINT =====

const agregarHistoriaAlSprint = async (req, res) => {

    const idProyecto = leerIdProyecto(req);
    const { id_sprint, id_historia } = req.body || {};

    // Validar los identificadores
    if (
        idProyecto === null ||
        !Number.isSafeInteger(Number(id_sprint)) ||
        !Number.isSafeInteger(Number(id_historia)) ||
        Number(id_sprint) <= 0 ||
        Number(id_historia) <= 0
    ) {
        return res.status(400).json({
            mensaje: 'Selecciona un Sprint y una historia válidos.'
        });
    }

    try {

        // Comprobar que sea Scrum Master del proyecto
        const rol = await autorizarAcceso(
            req,
            res,
            idProyecto,
            true
        );

        if (!rol) return;

        // Agregar la historia utilizando el DAO de Osmar
        const agregado = await backlogDAO.agregarAlSprint(
            idProyecto,
            Number(id_sprint),
            Number(id_historia)
        );

        if (!agregado) {
            return res.status(409).json({
                mensaje: 'No se pudo agregar la historia. Verifica que esté disponible y que el Sprint esté planificado.'
            });
        }

        // Respuesta exitosa
        return res.json({
            mensaje: 'Historia agregada al Sprint correctamente.'
        });

    } catch (error) {

        console.error('Error al agregar historia:', error);

        return res.status(500).json({
            mensaje: 'Error al agregar la historia al Sprint.'
        });

    }
};

// ===== FIN PB-14 =====




// ===== JESÚS: PB-15 Y PB-16 =====

const idPositivo = (valor) =>
    /^\d{1,10}$/.test(String(valor)) &&
    Number.isSafeInteger(Number(valor)) &&
    Number(valor) > 0;


// PB-15: Quitar historias pendientes
const quitarHistoriaDelSprint = async (req, res) => {

    const idProyecto = leerIdProyecto(req);
    const { idSprint, idHistoria } = req.params;

    if (
        idProyecto === null ||
        !idPositivo(idSprint) ||
        !idPositivo(idHistoria)
    ) {
        return res.status(400).json({
            mensaje: 'Identificadores no válidos.'
        });
    }

    try {

        // Solo el Scrum Master puede quitar historias
        const rol = await autorizarAcceso(
            req,
            res,
            idProyecto,
            true
        );

        if (!rol) return;

        const eliminado = await backlogDAO.quitarDelSprint(
            idProyecto,
            Number(idSprint),
            Number(idHistoria)
        );

        if (!eliminado) {
            return res.status(409).json({
                mensaje:
                    'No se puede quitar la historia porque no está pendiente o no pertenece a este Sprint.'
            });
        }

        return res.json({
            mensaje: 'Historia devuelta al Product Backlog.'
        });

    } catch (error) {

        return errorServidor(
            res,
            'Error al quitar historia del Sprint',
            error
        );
    }
};


// PB-16: Asignar desarrollador
const asignarResponsableHistoria = async (req, res) => {

    const idProyecto = leerIdProyecto(req);
    const { idSprint, idHistoria } = req.params;
    const { id_responsable } = req.body || {};

    if (
        idProyecto === null ||
        !idPositivo(idSprint) ||
        !idPositivo(idHistoria) ||
        !idPositivo(id_responsable)
    ) {
        return res.status(400).json({
            mensaje: 'Selecciona un desarrollador válido.'
        });
    }

    try {

        // Solo el Scrum Master puede asignar responsables
        const rol = await autorizarAcceso(
            req,
            res,
            idProyecto,
            true
        );

        if (!rol) return;

        const asignado = await backlogDAO.asignarResponsable(
            idProyecto,
            Number(idSprint),
            Number(idHistoria),
            Number(id_responsable)
        );

        if (!asignado) {
            return res.status(409).json({
                mensaje:
                    'No se pudo asignar. Verifica que la historia pertenezca al Sprint y que el usuario sea desarrollador del proyecto.'
            });
        }

        return res.json({
            mensaje: 'Desarrollador asignado correctamente.'
        });

    } catch (error) {

        return errorServidor(
            res,
            'Error al asignar desarrollador',
            error
        );
    }
};

// ===== FIN FUNCIONES DE JESÚS =====


// ===== JESÚS: PB-17 =====

const cambiarEstadoHistoria = async (req, res) => {

    const idProyecto = leerIdProyecto(req);
    const { idSprint, idHistoria } = req.params;
    const { estado_historia } = req.body || {};

    if (
        idProyecto === null ||
        !idPositivo(idSprint) ||
        !idPositivo(idHistoria)
    ) {
        return res.status(400).json({
            mensaje: 'Identificadores no válidos.'
        });
    }

    const estadosValidos = [
        'Pendiente',
        'En curso',
        'Terminada'
    ];

    if (!estadosValidos.includes(estado_historia)) {
        return res.status(400).json({
            mensaje: 'Estado de historia no válido.'
        });
    }

    try {

        // Verificar que el usuario pertenezca al proyecto
        const rol = await autorizarAcceso(
            req,
            res,
            idProyecto,
            false
        );

        if (!rol) return;

        // Sprint 7 · Bloque 1 (Nino) · TC-14-03/04: solo el desarrollador RESPONSABLE mueve su historia.
        const historia = await backlogDAO.obtenerHistoriaDeSprint(
            idProyecto, Number(idSprint), Number(idHistoria)
        );
        if (!historia) {
            return res.status(404).json({ mensaje: 'No se encontró la historia en este Sprint.' });
        }
        if (rol !== 'Desarrollador' || Number(historia.id_responsable) !== Number(req.session.idUsuario)) {
            return res.status(403).json({
                mensaje: 'Solo el desarrollador responsable de la historia puede cambiar su estado.'
            });
        }

        // Sprint 7 · Bloque 3 (Francisco) · HU-09 y HU-10: para terminarla deben cumplirse
        // todos sus criterios de aceptación y su Definition of Done.
        if (estado_historia === 'Terminada' && historia.estado_historia !== 'Terminada') {
            const pendientes = await backlogDAO.obtenerPendientesParaTerminar(Number(idHistoria));
            if (pendientes.criterios.length || pendientes.dod.length) {
                const partes = [];
                if (pendientes.criterios.length) {
                    partes.push(`${pendientes.criterios.length} criterio(s) de aceptación sin cumplir`);
                }
                if (pendientes.dod.length) {
                    partes.push(`${pendientes.dod.length} requisito(s) de la Definition of Done sin cumplir`);
                }
                return res.status(409).json({
                    mensaje: `No puedes terminar la historia: tiene ${partes.join(' y ')}.`,
                    pendientes
                });
            }
        }

        const actualizado = await backlogDAO.actualizarEstadoSprint(
            idProyecto,
            Number(idSprint),
            Number(idHistoria),
            estado_historia
        );

        if (!actualizado) {
            const estadoActual = await revisionDAO.obtenerEstadoEnSprint(
                idProyecto,
                Number(idSprint),
                Number(idHistoria)
            );

            // Mientras está en revisión o ya fue aprobada, el estado lo decide el Product Owner.
            if (estadoActual === 'En revision' || estadoActual === 'Aprobada') {
                return res.status(409).json({
                    mensaje: 'La historia está en revisión o ya fue aprobada; su estado lo define el Product Owner.'
                });
            }

            return res.status(404).json({
                mensaje: 'No se encontró la historia en este Sprint.'
            });
        }

        return res.json({
            mensaje: 'Estado actualizado correctamente.',
            estado_historia
        });

    } catch (error) {

        return errorServidor(
            res,
            'Error al actualizar el estado',
            error
        );
    }
};

// ===== FIN PB-17 =====







// ===== Sprint 7 · Bloque 5 (Osmar) · HU-13: capacidad del Sprint =====
const actualizarCapacidadSprint = async (req, res) => {
    const idProyecto = leerIdProyecto(req);
    const idSprint = /^\d{1,10}$/.test(req.params.idSprint) ? Number(req.params.idSprint) : null;
    if (idProyecto === null || !idSprint) {
        return res.status(404).json({ mensaje: 'No encontramos ese Sprint.' });
    }
    const capacidad = leerCapacidad(req.body?.capacidad_horas);
    if (capacidad.error) {
        return res.status(400).json({ mensaje: capacidad.error });
    }
    try {
        if (!await autorizarAcceso(req, res, idProyecto, true)) {
            return;
        }
        const sprint = await sprintDAO.actualizarCapacidad(idProyecto, idSprint, capacidad.capacidad);
        if (!sprint) {
            return res.status(404).json({ mensaje: 'No encontramos ese Sprint.' });
        }
        res.json({
            mensaje: capacidad.capacidad === null
                ? 'Se quitó la capacidad del Sprint.'
                : `Capacidad del Sprint ${sprint.numero}: ${capacidad.capacidad} h.`,
            sprint
        });
    } catch (error) {
        errorServidor(res, 'Error al guardar la capacidad', error);
    }
};

// ===== Sprint 7 · Bloque 3 (Francisco) · HU-10 (TC-10-03): finalizar Sprint validando su DoD =====
// El Sprint solo se finaliza si TODOS los requisitos de su Definition of Done están cumplidos.
const finalizarSprint = async (req, res) => {
    const idProyecto = leerIdProyecto(req);
    const idSprint = /^\d{1,10}$/.test(req.params.idSprint) ? Number(req.params.idSprint) : null;
    if (idProyecto === null || !idSprint) {
        return res.status(404).json({ mensaje: 'No encontramos ese Sprint.' });
    }
    try {
        if (!await autorizarAcceso(req, res, idProyecto, true)) {
            return;
        }
        const resultado = await sprintDAO.finalizar(idProyecto, idSprint);
        if (resultado.noEncontrado) {
            return res.status(404).json({ mensaje: 'No encontramos ese Sprint.' });
        }
        if (resultado.yaFinalizado) {
            return res.status(409).json({ mensaje: 'Este Sprint ya está finalizado.' });
        }
        if (resultado.dodPendiente) {
            return res.status(409).json({
                mensaje: `No se puede finalizar: faltan ${resultado.dodPendiente.length} requisito(s) de la Definition of Done del Sprint.`,
                pendientes: resultado.dodPendiente
            });
        }
        res.json({ mensaje: `Sprint ${resultado.numero} finalizado. Su Definition of Done se cumplió completa.` });
    } catch (error) {
        errorServidor(res, 'Error al finalizar el Sprint', error);
    }
};

// ===== Sprint 7 · Bloque 5 (Osmar) · HU-05: eliminar proyecto =====
// Solo el Scrum Master del proyecto (quien lo creó). El Product Owner y los desarrolladores
// no ven la opción y el servidor también se los niega (TC-05-01 y TC-05-03).
const eliminarProyecto = async (req, res) => {
    const idProyecto = leerIdProyecto(req);
    if (idProyecto === null) {
        return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
    }
    try {
        const rol = await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario);
        if (!rol) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        if (rol !== 'Scrum Master') {
            return res.status(403).json({ mensaje: 'Solo el Scrum Master que creó el proyecto puede eliminarlo.' });
        }
        if (!await proyectoDAO.eliminarProyecto(idProyecto)) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        res.json({ mensaje: 'Proyecto eliminado junto con sus Sprints, historias y demás datos.' });
    } catch (error) {
        errorServidor(res, 'Error al eliminar el proyecto', error);
    }
};

module.exports = {
    eliminarProyecto,
    actualizarCapacidadSprint,
    finalizarSprint,
    mostrarProyectos,
    listarProyectos,
    crearProyecto,
    mostrarProyecto,
    consultarProyecto,
    actualizarProyecto,
    crearSprint,
        agregarHistoriaAlSprint,
    quitarHistoriaDelSprint,
    asignarResponsableHistoria,
    cambiarEstadoHistoria
}
