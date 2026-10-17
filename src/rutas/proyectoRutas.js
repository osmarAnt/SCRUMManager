const express = require('express');
const router = express.Router();
const proyectoControlador = require('../controladores/proyectoControlador');
const { verificarSesion } = require('../middlewares/autenticacion');

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

module.exports = router;
