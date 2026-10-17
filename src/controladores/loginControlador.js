const path = require('path');
const usuarioDAO = require('../dao/usuarioDAO');

const mostrarLogin = (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (req.session.usuario && req.session.idUsuario) {
        return res.redirect('/proyectos');
    }
    res.sendFile(
        path.join(__dirname, '..', '..', 'vistas', 'login.html')
    );
};

const iniciarSesion = (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ mensaje: 'Escribe tu usuario y contraseña.' });
    }
    const nombreUsuario = username.trim();
    if (!nombreUsuario || nombreUsuario.length > 50 || !password.trim() || password.length > 50) {
        return res.status(400).json({ mensaje: 'Revisa tu usuario y contraseña.' });
    }
    usuarioDAO.buscarPorCredenciales(nombreUsuario, password, (error, usuario) => {
        if (error) {
            console.error('Error al iniciar sesión:', error.code);
            return res.status(500).json({
                mensaje: 'Error en el servidor'
            });
        }
        if (!usuario) {
            return res.status(401).json({
                mensaje: 'Usuario o contraseña incorrectos'
            });
        }
        if (!['Scrum Master', 'Product Owner', 'Desarrollador'].includes(usuario.rol)) {
            return res.status(403).json({ mensaje: 'Rol no reconocido' });
        }
        req.session.regenerate((errorSesion) => {
            if (errorSesion) {
                return res.status(500).json({ mensaje: 'No se pudo iniciar la sesión.' });
            }
            req.session.usuario = usuario.username;
            req.session.idUsuario = usuario.id_usuario;
            req.session.nombre = usuario.nombre;
            req.session.rol = usuario.rol;
            req.session.save((errorGuardado) => {
                if (errorGuardado) {
                    return res.status(500).json({ mensaje: 'No se pudo guardar la sesión.' });
                }
                res.json({ redireccion: '/proyectos' });
            });
        });
    });
};

const cerrarSesion = (req, res) => {
    res.set('Cache-Control', 'no-store');
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).send('Error al cerrar sesión');
        }
        res.clearCookie('connect.sid', { path: '/' });
        res.redirect('/login?sesion=cerrada');
    });
};

module.exports = {
    mostrarLogin,
    iniciarSesion,
    cerrarSesion
};