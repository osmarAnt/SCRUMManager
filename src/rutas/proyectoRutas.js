const express = require('express');
const router = express.Router();
const proyectoControlador = require('../controladores/proyectoControlador');
const { verificarSesion } = require('../middlewares/autenticacion');
const invitacionControlador = require('../controladores/invitacionControlador');

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

module.exports = router;
