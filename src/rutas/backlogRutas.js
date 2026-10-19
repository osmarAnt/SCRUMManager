const express = require('express');
const router = express.Router();
const backlogControlador = require('../controladores/backlogControlador');

router.post('/backlog', backlogControlador.crearHistoria);
router.get('/backlog/:id_proyecto', backlogControlador.obtenerBacklogPorProyecto);
router.delete('/backlog/:id', backlogControlador.eliminarHistoria);
router.get('/criterios/:id_historia', backlogControlador.obtenerCriterios);
router.post('/criterios', backlogControlador.crearCriterio);
router.put('/backlog/:id', backlogControlador.actualizarHistoria);

module.exports = router;