const express = require('express');
const router = express.Router();

const proyectoControlador = require('../controladores/proyectoControlador');

const { verificarSesion } = require('../middlewares/autenticacion');

const invitacionControlador = require('../controladores/invitacionControlador');

// Controlador de mensajes (cambios de tus compañeros)
const mensajeControlador = require('../controladores/mensajeControlador');

// Controlador de integrantes (tus cambios)
const integrantesControlador = require('../controladores/integrantesControlador');

// PB-19 y PB-20: revisión de entregables por el Product Owner
const revisionControlador = require('../controladores/revisionControlador');

// PB-57: evidencias y envío a revisión por el desarrollador
const evidenciaControlador = require('../controladores/evidenciaControlador');

// Burndown Chart del Sprint
const burndownControlador = require('../controladores/burndownControlador');
// JESÚS - PB-60: BURNDOWN POR HORAS
const burndownHorasControlador = require('../controladores/burndownHorasControlador');

// PB-30: foro para dudas y comentarios de cualquier integrante.
const foroControlador = require('../controladores/foroControlador');

// PB-32 y PB-33: registro de horas por historia y resumen de tiempo.
const tiempoControlador = require('../controladores/tiempoControlador');

// Francisco: PB-45 - Contenido de Planning Poker.
const planningControlador = require('../controladores/planningControlador');

// JESÚS - PB-34: RETROSPECTIVA DEL SPRINT
const retrospectivaControlador = require('../controladores/retrospectivaControlador');

// =======================================
// PROYECTOS
// =======================================

router.get(
    '/',
    verificarSesion,
    proyectoControlador.mostrarProyectos
);

router.get(
    '/datos',
    verificarSesion,
    proyectoControlador.listarProyectos
);


// =======================================
// PB-04: CREAR PROYECTO
// =======================================

router.post(
    '/',
    verificarSesion,
    proyectoControlador.crearProyecto
);


// Las rutas con :id van después de /datos

router.get(
    '/:id',
    verificarSesion,
    proyectoControlador.mostrarProyecto
);


// =======================================
// PB-05: CONSULTAR Y EDITAR PROYECTO
// =======================================

router.get(
    '/:id/datos',
    verificarSesion,
    proyectoControlador.consultarProyecto
);

router.put(
    '/:id',
    verificarSesion,
    proyectoControlador.actualizarProyecto
);


// =======================================
// PB-13: CONFIGURAR SPRINT
// =======================================

router.post(
    '/:id/sprints',
    verificarSesion,
    proyectoControlador.crearSprint
);

router.get(
    '/:id/sprints/:idSprint/resumen-cierre',
    verificarSesion,
    proyectoControlador.obtenerResumenCierreSprint
);

router.post(
    '/:id/sprints/:idSprint/cerrar',
    verificarSesion,
    proyectoControlador.cerrarSprint
);


// =======================================
// JESÚS: PB-14
// AGREGAR HISTORIAS AL SPRINT
// =======================================

router.post(
    '/:id/sprints/historias',
    verificarSesion,
    proyectoControlador.agregarHistoriaAlSprint
);


// =======================================
// JESÚS: PB-15
// QUITAR UNA HISTORIA DEL SPRINT
// =======================================

router.delete(
    '/:id/sprints/:idSprint/historias/:idHistoria',
    verificarSesion,
    proyectoControlador.quitarHistoriaDelSprint
);


// =======================================
// JESÚS: PB-16
// ASIGNAR DESARROLLADOR A UNA HISTORIA
// =======================================

router.put(
    '/:id/sprints/:idSprint/historias/:idHistoria/responsable',
    verificarSesion,
    proyectoControlador.asignarResponsableHistoria
);

// ===== JESÚS: PB-17 =====

router.put(
    '/:id/sprints/:idSprint/historias/:idHistoria/estado',
    verificarSesion,
    proyectoControlador.cambiarEstadoHistoria
);

// ===== FIN PB-17 =====


// =======================================
// CONSULTAR INTEGRANTES DEL PROYECTO
// =======================================

router.get(
    '/:id/integrantes',
    verificarSesion,
    invitacionControlador.integrantes
);


// =======================================
// INVITAR INTEGRANTE
// =======================================

router.post(
    '/:id/invitaciones',
    verificarSesion,
    invitacionControlador.invitar
);


// =======================================
// CONSULTAR USUARIOS REGISTRADOS
// DISPONIBLES PARA INVITAR
// =======================================

router.get(
    '/:id/usuarios-disponibles',
    verificarSesion,
    integrantesControlador.disponibles
);


// =======================================
// EDITAR ROL DE UN INTEGRANTE
// =======================================

router.put(
    '/:id/integrantes/:idUsuario',
    verificarSesion,
    integrantesControlador.actualizar
);


// =======================================
// ELIMINAR INTEGRANTE DEL PROYECTO
// =======================================

router.delete(
    '/:id/integrantes/:idUsuario',
    verificarSesion,
    integrantesControlador.eliminar
);


// =======================================
// MENSAJES DEL PROYECTO
// FUNCIONALIDAD DE TUS COMPAÑEROS
// =======================================

// Consultar mensajes
router.get(
    '/:id/mensajes',
    verificarSesion,
    mensajeControlador.listarMensajes
);

// Publicar mensaje
router.post(
    '/:id/mensajes',
    verificarSesion,
    mensajeControlador.publicarMensaje
);

// Conexión de eventos de mensajes
router.get(
    '/:id/mensajes/eventos',
    verificarSesion,
    mensajeControlador.conectarMensajes
);

// Marcar mensaje como leído
router.put(
    '/:id/mensajes/:idMensaje/leido',
    verificarSesion,
    mensajeControlador.marcarMensajeLeido
);


// PB-45: CONSULTAR PLANNING POKER (todos los integrantes activos del proyecto).
router.get('/:id/planning', verificarSesion, planningControlador.consultarPlanning);
router.get('/:id/planning/mesa', verificarSesion, planningControlador.consultarMesa);
router.patch('/:id/planning/mesa', verificarSesion, planningControlador.actualizarMesa);
router.post('/:id/planning/mesa/acuerdo', verificarSesion, planningControlador.guardarAcuerdo);

// PB-46: HORAS ESTIMADAS POR HISTORIA (solo el Scrum Master del proyecto).
router.put(
    '/:id/planning/historias/:idHistoria/horas',
    verificarSesion,
    planningControlador.guardarHorasEstimadas
);


// PB-30: FORO DEL PROYECTO (todos los roles)
router.get('/:id/foro', verificarSesion, foroControlador.listarMensajes);
router.post('/:id/foro', verificarSesion, foroControlador.publicarMensaje);
router.get('/:id/foro/eventos', verificarSesion, foroControlador.conectarMensajes);


// PB-57: ADJUNTAR EVIDENCIAS Y ENVIAR LA HISTORIA A REVISIÓN
// Solo el desarrollador responsable de la historia.
// El archivo viaja como cuerpo binario (application/octet-stream).

router.get(
    '/:id/historias/:idHistoria/evidencias',
    verificarSesion,
    evidenciaControlador.autorizarResponsable,
    evidenciaControlador.listarEvidencias
);

router.post(
    '/:id/historias/:idHistoria/evidencias',
    verificarSesion,
    evidenciaControlador.autorizarResponsable,
    evidenciaControlador.validarSubida,
    evidenciaControlador.leerArchivo,
    evidenciaControlador.subirEvidencia
);

router.delete(
    '/:id/historias/:idHistoria/evidencias/:idEvidencia',
    verificarSesion,
    evidenciaControlador.autorizarResponsable,
    evidenciaControlador.quitarEvidencia
);

router.post(
    '/:id/historias/:idHistoria/enviar-revision',
    verificarSesion,
    evidenciaControlador.autorizarResponsable,
    evidenciaControlador.enviarARevision
);


// PB-19: REVISAR ENTREGABLE (CRITERIOS, ARCHIVOS Y RESPONSABLE)
// PB-20: APROBAR O RECHAZAR CON OBSERVACIONES
// Solo el Product Owner del proyecto

router.get(
    '/:id/revisiones',
    verificarSesion,
    revisionControlador.listarRevisiones
);

router.get(
    '/:id/revisiones/:idHistoria',
    verificarSesion,
    revisionControlador.consultarRevision
);

router.get(
    '/:id/revisiones/:idHistoria/evidencias/:idEvidencia',
    verificarSesion,
    revisionControlador.abrirEvidencia
);

router.post(
    '/:id/revisiones/:idHistoria',
    verificarSesion,
    revisionControlador.registrarDecision
);


// =======================================
// PB-32: REGISTRAR HORAS POR HISTORIA
// Solo el desarrollador al que está asignada la historia.
// PB-33: CONSULTAR ACUMULADO DE TIEMPO
// Solo el Scrum Master del proyecto.
// =======================================

router.get(
    '/:id/tiempos/mios',
    verificarSesion,
    tiempoControlador.consultarMisTiempos
);

router.post(
    '/:id/historias/:idHistoria/tiempos',
    verificarSesion,
    tiempoControlador.registrarTiempo
);

router.get(
    '/:id/tiempos/resumen',
    verificarSesion,
    tiempoControlador.consultarResumen
);


// =======================================
// BURNDOWN CHART
// Cualquier integrante del proyecto puede consultarlo.
// Los puntos restantes se calculan solos y se guardan por día.
// =======================================

router.get(
    '/:id/burndown',
    verificarSesion,
    burndownControlador.consultar
);


// =======================================
// JESÚS - PB-60: BURNDOWN POR HORAS
// Cualquier integrante activo del proyecto puede consultarlo.
// =======================================

router.get(
    '/:id/burndown-horas',
    verificarSesion,
    burndownHorasControlador.consultar
);

// PB-61: BURNDOWN GENERAL POR HORAS
const burndownGeneralHorasControlador = require('../controladores/burndownGeneralHorasControlador');

// PB-61: BURNDOWN GENERAL POR HORAS
router.get(
    '/:id/burndown-general-horas',
    verificarSesion,
    burndownGeneralHorasControlador.consultar
);


// Burndown General: suma de todos los Sprints del proyecto
router.get(
    '/:id/burndown-general',
    verificarSesion,
    burndownControlador.consultarGeneral
);



// =======================================
// JESÚS - PB-34: RETROSPECTIVA DEL SPRINT
// Cualquier integrante activo puede consultar y registrar.
// =======================================

router.get(
    '/:id/retrospectivas',
    verificarSesion,
    retrospectivaControlador.listar
);

router.post(
    '/:id/retrospectivas',
    verificarSesion,
    retrospectivaControlador.guardar
);







// =======================================
// EXPORTAR RUTAS
// =======================================

module.exports = router;
