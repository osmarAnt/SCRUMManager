const express = require('express');
const router = express.Router();
const proyectoControlador = require('../controladores/proyectoControlador');
const { verificarSesion } = require('../middlewares/autenticacion');
const invitacionControlador = require('../controladores/invitacionControlador');
const mensajeControlador = require('../controladores/mensajeControlador');

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

// PB-04
router.post(
    '/',
    verificarSesion,
    proyectoControlador.crearProyecto
);

// Las rutas con :id van después de '/datos' para que no se confundan.
router.get(
    '/:id',
    verificarSesion,
    proyectoControlador.mostrarProyecto
);

// PB-05
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

// PB-13
router.post(
    '/:id/sprints',
    verificarSesion,
    proyectoControlador.crearSprint
);


// ===== JESÚS: PB-14 - AGREGAR HISTORIAS AL SPRINT =====

router.post(
    '/:id/sprints/historias',
    verificarSesion,
    proyectoControlador.agregarHistoriaAlSprint
);

// ===== FIN PB-14 =====




router.get(
    '/:id/integrantes',
    verificarSesion,
    invitacionControlador.integrantes
);

router.post(
    '/:id/invitaciones',
    verificarSesion,
    invitacionControlador.invitar
);



// ===== JESÚS: PB-15 =====

// Quitar una historia pendiente del Sprint
router.delete(
    '/:id/sprints/:idSprint/historias/:idHistoria',
    verificarSesion,
    proyectoControlador.quitarHistoriaDelSprint
);


// ===== JESÚS: PB-16 =====

// Asignar desarrollador a una historia
router.put(
    '/:id/sprints/:idSprint/historias/:idHistoria/responsable',
    verificarSesion,
    proyectoControlador.asignarResponsableHistoria
);

// ===== FIN RUTAS DE JESÚS =====   

router.get(
    '/:id/mensajes',
    verificarSesion,
    mensajeControlador.listarMensajes
);

router.post(
    '/:id/mensajes',
    verificarSesion,
    mensajeControlador.publicarMensaje
);

router.get(
    '/:id/mensajes/eventos',
    verificarSesion,
    mensajeControlador.conectarMensajes
);

router.put(
    '/:id/mensajes/:idMensaje/leido',
    verificarSesion,
    mensajeControlador.marcarMensajeLeido
);

module.exports = router;
