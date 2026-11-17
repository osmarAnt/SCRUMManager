const capacitacionDAO = require('../dao/capacitacionDAO');

const tiposPermitidos = [
    'SCRUM_MASTER',
    'PRODUCT_OWNER',
    'DESARROLLADOR'
];

const registrar = async (req, res) => {
    const { tipoCapacitacion, idIntento } = req.body || {};

    if (!tiposPermitidos.includes(tipoCapacitacion)) {
        return res.status(400).json({ mensaje: 'Capacitación inválida.' });
    }

    if (typeof idIntento !== 'string' || !/^[a-f0-9]{32}$/.test(idIntento)) {
        return res.status(400).json({ mensaje: 'Intento de capacitación inválido.' });
    }

    try {
        // El usuario se obtiene de la sesión, nunca de los datos del navegador.
        await capacitacionDAO.registrar(
            req.session.idUsuario,
            tipoCapacitacion,
            idIntento
        );

        res.json({
            registrada: true,
            mensaje: 'Capacitación registrada correctamente.'
        });
    } catch (error) {
        console.error('Error al registrar capacitación:', error.code || error.message);
        res.status(500).json({ mensaje: 'No se pudo registrar la capacitación.' });
    }
};

const consultarTotales = async (req, res) => {
    try {
        const totales = await capacitacionDAO.consultarTotales(req.session.idUsuario);
        res.json({ totales });
    } catch (error) {
        console.error('Error al consultar capacitaciones:', error.code || error.message);
        res.status(500).json({ mensaje: 'No se pudieron consultar tus capacitaciones.' });
    }
};

module.exports = { registrar, consultarTotales };
