const express = require('express');
const router = express.Router();
const registroControlador = require('../controladores/registroControlador');

router.get('/', registroControlador.mostrarRegistro);

router.post('/', registroControlador.registrarCuenta);

module.exports = router;
