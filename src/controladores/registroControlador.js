const path = require('path');
const usuarioDAO = require('../dao/usuarioDAO');

const mostrarRegistro = (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (req.session.usuario && req.session.idUsuario) {
        return res.redirect('/proyectos');
    }
    res.sendFile(
        path.join(__dirname, '..', '..', 'vistas', 'registro.html')
    );
};

const registrarCuenta = (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { nombre, username, password } = req.body || {};
    if (typeof nombre !== 'string' || typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ mensaje: 'Completa tu nombre, nombre de usuario y contraseña.' });
    }
    const nombreCompleto = nombre.trim();
    const nombreUsuario = username.trim();
    if (nombreCompleto.length < 3 || nombreCompleto.length > 100 || /[\u0000-\u001f\u007f]/.test(nombreCompleto)) {
        return res.status(400).json({ mensaje: 'El nombre debe tener entre 3 y 100 caracteres.' });
    }
    if (nombreUsuario.length < 3 || nombreUsuario.length > 50 || /[\u0000-\u001f\u007f]/.test(nombreUsuario)) {
        return res.status(400).json({ mensaje: 'El nombre de usuario debe tener entre 3 y 50 caracteres.' });
    }
    if (!password.trim() || password.length < 4 || password.length > 50) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener entre 4 y 50 caracteres.' });
    }
    usuarioDAO.crearUsuario(nombreCompleto, nombreUsuario, password, (error) => {
        if (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ mensaje: 'Este nombre de usuario ya está registrado. Elige otro.' });
            }
            console.error('Error al registrar la cuenta:', error.code);
            return res.status(500).json({ mensaje: 'No se pudo crear la cuenta. Inténtalo de nuevo.' });
        }
        res.status(201).json({
            mensaje: 'Cuenta creada correctamente. Ya puedes iniciar sesión.',
            redireccion: '/login?registro=correcto'
        });
    });
};

module.exports = {
    mostrarRegistro,
    registrarCuenta
};