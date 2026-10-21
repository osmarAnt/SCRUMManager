const express = require('express');
const router = express.Router();

const proyectoControlador = require('../controladores/proyectoControlador');

const { verificarSesion } = require('../middlewares/autenticacion');

const invitacionControlador = require('../controladores/invitacionControlador');

// Controlador de mensajes (cambios de tus compañeros)
const mensajeControlador = require('../controladores/mensajeControlador');

// Controlador de integrantes (tus cambios)
const integrantesControlador = require('../controladores/integrantesControlador');


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


// =======================================
// EXPORTAR RUTAS
// =======================================

module.exports = router;