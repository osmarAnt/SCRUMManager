const express = require('express');
const router = express.Router();
const {
    verificarSesion
} = require('../middlewares/autenticacion');

const invitacionControlador = require(
    '../controladores/invitacionControlador'
);
router.get(
    '/',
    verificarSesion,
    invitacionControlador.pendientes
);
router.post(
    '/:id/aceptar',
    verificarSesion,
    invitacionControlador.aceptar
);
module.exports = router;