const express = require('express');
const router = express.Router();
const backlogControlador = require('../controladores/backlogControlador');

router.post('/backlog', backlogControlador.crearHistoria);
router.get('/backlog/:id_proyecto', backlogControlador.obtenerBacklogPorProyecto);
router.delete('/backlog/:id', backlogControlador.eliminarHistoria);



module.exports = router;