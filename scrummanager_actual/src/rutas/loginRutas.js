const express = require('express');
const router = express.Router();
const loginControlador = require('../controladores/loginControlador');

router.get('/', loginControlador.mostrarLogin);

router.post('/', loginControlador.iniciarSesion);

router.get('/cerrar', loginControlador.cerrarSesion);

module.exports = router;
