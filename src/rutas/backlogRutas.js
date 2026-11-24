const express = require('express');
const router = express.Router();
const backlogControlador = require('../controladores/backlogControlador');
const { verificarSesion } = require('../middlewares/autenticacion');

// Sprint 7 · Bloque 1 (Nino): TODAS las rutas del backlog exigen sesión (TC-03-04).
router.post('/backlog', verificarSesion, backlogControlador.crearHistoria);
router.get('/backlog/:id_proyecto', verificarSesion, backlogControlador.obtenerBacklogPorProyecto);
router.delete('/backlog/:id', verificarSesion, backlogControlador.eliminarHistoria);
// ===== JESÚS: PB-28 - EDITAR HISTORIA =====
router.put(
    '/backlog/:id',
    verificarSesion,
    backlogControlador.actualizarHistoria
);

// ===== JESÚS: PB-29 - VER HISTORIAL =====
router.get(
    '/backlog/:id_proyecto/historias/:id_historia/historial',
    verificarSesion,
    backlogControlador.consultarHistorial
);

// CORRECCIÓN: Agregamos /backlog al inicio para que coincida con el frontend
router.get('/backlog/criterios/:id_historia', verificarSesion, backlogControlador.obtenerCriterios);
router.post('/backlog/criterios', verificarSesion, backlogControlador.crearCriterio);
// Sprint 7 · Bloque 3 (Francisco) · HU-09: marcar criterio cumplido / pendiente
router.put('/backlog/criterios/:id_criterio/completado', verificarSesion, backlogControlador.marcarCriterio);

router.put('/backlog/:id_proyecto/historias/:id_historia/valor-negocio', verificarSesion, backlogControlador.actualizarValorNegocio);

// Ruta para PB-24: Obtener Kanban por Sprint
router.get('/backlog/kanban/:id_sprint', verificarSesion, backlogControlador.obtenerKanban);
module.exports = router;
