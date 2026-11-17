const notificacionDAO = require('../dao/notificacionDAO');

// CONSULTAR NOTIFICACIONES
exports.listar = async (req, res) => {
    try {
        const datos = await notificacionDAO.listar(
            req.session.idUsuario
        );

        res.json(datos);

    } catch (error) {
        console.error('Error al consultar notificaciones:', error);

        res.status(500).json({
            mensaje: 'No se pudieron cargar las notificaciones.'
        });
    }
};

// MARCAR UNA NOTIFICACIÓN COMO LEÍDA
exports.marcarLeida = async (req, res) => {
    const id = Number(req.params.idNotificacion);

    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({
            mensaje: 'Notificación inválida.'
        });
    }

    try {
        const encontrada = await notificacionDAO.marcarLeida(
            req.session.idUsuario,
            id
        );

        if (!encontrada) {
            return res.status(404).json({
                mensaje: 'Notificación no encontrada.'
            });
        }

        res.json({
            mensaje: 'Notificación marcada como leída.'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'No se pudo marcar la notificación.'
        });
    }
};

// MARCAR TODAS COMO LEÍDAS
exports.marcarTodas = async (req, res) => {
    try {
        const cantidad = await notificacionDAO.marcarTodas(
            req.session.idUsuario
        );

        res.json({
            mensaje: 'Notificaciones marcadas como leídas.',
            cantidad
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'No se pudieron marcar las notificaciones.'
        });
    }
};