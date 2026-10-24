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
// EXPORTAR RUTAS
// =======================================

module.exports = router;