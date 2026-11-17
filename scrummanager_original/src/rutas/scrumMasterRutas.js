const express = require('express');
const router = express.Router();
const scrumMasterControlador = require('../controladores/scrumMasterControlador');
const { verificarRol } = require('../middlewares/autenticacion');

router.get(
    '/',
    verificarRol('Scrum Master'),
    scrumMasterControlador.mostrarPanelScrumMaster
);

module.exports = router;
