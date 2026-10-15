const express = require('express');
const router = express.Router();
const desarrolladorControlador = require('../controladores/desarrolladorControlador');
const { verificarRol } = require('../middlewares/autenticacion');

router.get(
    '/',
    verificarRol('Desarrollador'),
    desarrolladorControlador.mostrarPanelDesarrollador
);

module.exports = router;
