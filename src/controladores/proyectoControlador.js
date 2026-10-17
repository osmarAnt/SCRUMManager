const path = require('path');
const proyectoDAO = require('../dao/proyectoDAO');

const mostrarProyectos = (req, res) => {
    res.sendFile(
        path.join(__dirname, '..', '..', 'vistas', 'proyectos.html')
    );
};

const listarProyectos = (req, res) => {
    proyectoDAO.listarPorUsuario(req.session.idUsuario, (error, proyectos) => {
        if (error) {
            console.error('Error al consultar proyectos:', error.code);
            return res.status(500).json({ mensaje: 'No se pudieron cargar tus proyectos. Inténtalo de nuevo.' });
        }
        res.json({
            usuario: {
                nombre: req.session.nombre,
                username: req.session.usuario
            },
            proyectos
        });
    });
};

module.exports = {
    mostrarProyectos,
    listarProyectos
};
