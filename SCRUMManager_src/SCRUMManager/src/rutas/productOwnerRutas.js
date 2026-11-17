const express = require('express');
const router = express.Router();
const productOwnerControlador = require('../controladores/productOwnerControlador');
const { verificarRol } = require('../middlewares/autenticacion');

router.get(
    '/',
    verificarRol('Product Owner'),
    productOwnerControlador.mostrarPanelProductOwner
);

module.exports = router;
