const router = require('express').Router();
const { verificarSesion } = require('../middlewares/autenticacion');
const controlador = require('../controladores/notificacionControlador');

// CONSULTAR BUZÓN
router.get('/', verificarSesion, controlador.listar);

// MARCAR TODAS COMO LEÍDAS
router.put('/leidas', verificarSesion, controlador.marcarTodas);

// MARCAR UNA COMO LEÍDA
router.put(
    '/:idNotificacion/leida',
    verificarSesion,
    controlador.marcarLeida
);

module.exports = router;