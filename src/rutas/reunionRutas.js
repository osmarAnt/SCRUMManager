const express = require('express');
const router = express.Router();

const reunionControlador = require('../controladores/reunionControlador');
const { verificarSesion } = require('../middlewares/autenticacion');

// PB-42: apartado Reuniones.
// Se monta en /proyectos (ver app.js). El Scrum Master crea; todo el equipo consulta.

router.get(
    '/:id/reuniones',
    verificarSesion,
    reunionControlador.listar
);

router.post(
    '/:id/reuniones',
    verificarSesion,
    reunionControlador.crear
);

module.exports = router;
