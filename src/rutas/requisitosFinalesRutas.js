// Sprint 7: rutas de los requisitos finales de la evaluación.
// Se monta en /proyectos (ver app.js). Cada bloque indica a qué integrante le toca explicarlo.
const express = require('express');
const router = express.Router();
const { verificarSesion } = require('../middlewares/autenticacion');

const proyectoControlador = require('../controladores/proyectoControlador');
const epicaControlador = require('../controladores/epicaControlador');
const dodControlador = require('../controladores/dodControlador');
const impedimentoControlador = require('../controladores/impedimentoControlador');
const githubControlador = require('../controladores/githubControlador');

// ---------- Bloque 2 (César) · HU-07: épicas ----------
router.get('/:id/epicas', verificarSesion, epicaControlador.listar);
router.post('/:id/epicas', verificarSesion, epicaControlador.crear);

// ---------- Bloque 3 (Francisco) · HU-09 y HU-10: criterios y Definition of Done ----------
router.get('/:id/historias/:idHistoria/calidad', verificarSesion, dodControlador.consultarHistoria);
router.post('/:id/historias/:idHistoria/dod', verificarSesion, dodControlador.agregarAHistoria);
router.get('/:id/sprints/:idSprint/dod', verificarSesion, dodControlador.consultarSprint);
router.post('/:id/sprints/:idSprint/dod', verificarSesion, dodControlador.agregarASprint);
router.put('/:id/dod/:idRequisito', verificarSesion, dodControlador.marcar);
router.delete('/:id/dod/:idRequisito', verificarSesion, dodControlador.eliminar);
router.post('/:id/sprints/:idSprint/finalizar', verificarSesion, proyectoControlador.finalizarSprint);

// ---------- Bloque 4 (Jesús) · HU-16: impedimentos ----------
router.get('/:id/impedimentos', verificarSesion, impedimentoControlador.listar);
router.post('/:id/impedimentos', verificarSesion, impedimentoControlador.crear);
router.put('/:id/impedimentos/:idImpedimento/resolver', verificarSesion, impedimentoControlador.resolver);

// ---------- Bloque 5 (Osmar) · HU-05 y HU-13: eliminar proyecto y capacidad del Sprint ----------
router.delete('/:id', verificarSesion, proyectoControlador.eliminarProyecto);
router.put('/:id/sprints/:idSprint/capacidad', verificarSesion, proyectoControlador.actualizarCapacidadSprint);

// ---------- PB-62 (Nino): velocidad del equipo ----------
router.get('/:id/velocidad', verificarSesion, require('../controladores/velocidadControlador').consultarVelocidad);

// ---------- Bloque 6 (Emmanuel) · HU-22: GitHub ----------
router.get('/:id/github', verificarSesion, githubControlador.consultar);
router.put('/:id/github', verificarSesion, githubControlador.vincular);

module.exports = router;
