const express = require('express');
const router = express.Router();
const backlogControlador = require('../controladores/backlogControlador');

router.post('/backlog', backlogControlador.crearHistoria);
router.get('/backlog/:id_proyecto', backlogControlador.obtenerBacklogPorProyecto);
router.delete('/backlog/:id', backlogControlador.eliminarHistoria);
router.put('/backlog/:id', backlogControlador.actualizarHistoria);

// CORRECCIÓN: Agregamos /backlog al inicio para que coincida con el frontend
router.get('/backlog/criterios/:id_historia', backlogControlador.obtenerCriterios);
router.post('/backlog/criterios', backlogControlador.crearCriterio);

module.exports = router;