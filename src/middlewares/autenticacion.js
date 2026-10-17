const verificarSesion = (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    if (!req.session || !req.session.usuario || !req.session.idUsuario) {
        if ((req.get('Accept') || '').includes('application/json')) {
            return res.status(401).json({ mensaje: 'Inicia sesión para continuar.' });
        }
        return res.redirect('/login');
    }
    next();
};

const verificarRol = (rolPermitido) => {
    return (req, res, next) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        if (!req.session || !req.session.usuario) {
            return res.redirect('/login');
        }
        if (req.session.rol !== rolPermitido) {
            return res.status(403).send(
                'No tienes permiso para acceder a esta página'
            );
        }
        next();
    };
};

module.exports = {
    verificarSesion,
    verificarRol
};
