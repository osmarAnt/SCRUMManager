const path = require('path');
const usuarioDAO = require('../dao/usuarioDAO');

const mostrarLogin = (req, res) => {
    res.sendFile(
        path.join(__dirname, '..', '..', 'vistas', 'login.html')
    );
};

const iniciarSesion = (req, res) => {
    const { username, password } = req.body;
    usuarioDAO.buscarPorCredenciales(username, password, (error, usuario) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                mensaje: 'Error en el servidor'
            });
        }
        if (!usuario) {
            return res.status(401).json({
                mensaje: 'Usuario o contraseña incorrectos'
            });
        }
        req.session.usuario = usuario.username;
        req.session.idUsuario = usuario.id_usuario;
        req.session.nombre = usuario.nombre;
        req.session.rol = usuario.rol;
        if (usuario.rol === 'Scrum Master') {
            return res.json({
                redireccion: '/scrum-master'
            });
        }
        if (usuario.rol === 'Product Owner') {
            return res.json({
                redireccion: '/product-owner'
            });
        }
        if (usuario.rol === 'Desarrollador') {
            return res.json({
                redireccion: '/desarrollador'
            });
        }
        return res.status(403).json({
            mensaje: 'Rol no reconocido'
        });
    });
};

const cerrarSesion = (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).send('Error al cerrar sesión');
        }
        res.redirect('/login');
    });
};

module.exports = {
    mostrarLogin,
    iniciarSesion,
    cerrarSesion
};
