const router = require('express').Router();
const { verificarSesion } = require('../middlewares/autenticacion');
const controlador = require('../controladores/capacitacionControlador');

router.use(verificarSesion);
router.post('/completadas', controlador.registrar);
router.get('/totales', controlador.consultarTotales);

module.exports = router;
