const express = require('express');
const router = express.Router();
const backlogControlador = require('../controladores/backlogControlador');
const { verificarSesion } = require('../middlewares/autenticacion');

router.post('/backlog', backlogControlador.crearHistoria);
router.get('/backlog/:id_proyecto', backlogControlador.obtenerBacklogPorProyecto);
router.delete('/backlog/:id', backlogControlador.eliminarHistoria);
router.put('/backlog/:id', backlogControlador.actualizarHistoria);

// CORRECCIÓN: Agregamos /backlog al inicio para que coincida con el frontend
router.get('/backlog/criterios/:id_historia', backlogControlador.obtenerCriterios);
router.post('/backlog/criterios', backlogControlador.crearCriterio);

router.put('/backlog/:id_proyecto/historias/:id_historia/valor-negocio', verificarSesion, backlogControlador.actualizarValorNegocio);

// Ruta para PB-24: Obtener Kanban por Sprint
router.get('/backlog/kanban/:id_sprint', verificarSesion, backlogControlador.obtenerKanban);
module.exports = router;