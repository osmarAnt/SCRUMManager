const foroDAO = require('../dao/foroDAO');

const conexiones = new Map();

const responderError = (res, error) => {
    console.error('Error en el foro del proyecto:', error.code || error.message);
    return res.status(500).json({ mensaje: 'No se pudo completar la operación del foro. Inténtalo de nuevo.' });
};

const autorizar = async (req, res) => {
    if (!/^[1-9]\d{0,9}$/.test(req.params.id) || Number(req.params.id) > 2147483647) {
        res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        return null;
    }
    const idProyecto = Number(req.params.id);
    if (!await foroDAO.esIntegrante(idProyecto, req.session.idUsuario)) {
        res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        return null;
    }
    return idProyecto;
};

const listarMensajes = async (req, res) => {
    try {
        const idProyecto = await autorizar(req, res);
        if (!idProyecto) return;
        const mensajes = await foroDAO.listarPorProyecto(idProyecto);
        res.json({ idUsuario: req.session.idUsuario, mensajes });
    } catch (error) {
        responderError(res, error);
    }
};

const cerrarConexion = (cliente, evento) => {
    clearInterval(cliente.latido);
    const grupo = conexiones.get(cliente.idProyecto);
    if (grupo) {
        grupo.delete(cliente);
        if (!grupo.size) conexiones.delete(cliente.idProyecto);
    }
    if (!cliente.res.destroyed && !cliente.res.writableEnded) {
        if (evento) cliente.res.write(`event: ${evento}\ndata: {}\n\n`);
        cliente.res.end();
    }
};

// Cada evento vuelve a comprobar la sesión y la pertenencia al proyecto.
// El evento solo indica que hay cambios; los mensajes se consultan con una petición autorizada.
const enviarEvento = async (cliente, actualizar) => {
    if (cliente.comprobando || cliente.res.destroyed || cliente.res.writableEnded) return;
    cliente.comprobando = true;
    try {
        const sesionValida = await new Promise((resolve) => {
            cliente.req.session.reload((error) => {
                resolve(!error && cliente.req.session.idUsuario === cliente.idUsuario);
            });
        });
        if (!sesionValida) return cerrarConexion(cliente, 'sesion');
        if (!await foroDAO.esIntegrante(cliente.idProyecto, cliente.idUsuario)) {
            return cerrarConexion(cliente, 'acceso');
        }
        if (!cliente.res.destroyed && !cliente.res.writableEnded) {
            cliente.res.write(actualizar ? 'event: actualizar\ndata: {}\n\n' : ': conectado\n\n');
        }
    } catch (error) {
        cerrarConexion(cliente);
    } finally {
        cliente.comprobando = false;
        // Conserva una notificación si llegó mientras se comprobaba otra.
        if (cliente.pendiente && !cliente.res.destroyed && !cliente.res.writableEnded) {
            cliente.pendiente = false;
            enviarEvento(cliente, true);
        }
    }
};

const publicarMensaje = async (req, res) => {
    try {
        const idProyecto = await autorizar(req, res);
        if (!idProyecto) return;
        const contenido = typeof req.body?.contenido === 'string' ? req.body.contenido.trim() : '';
        if (!contenido || contenido.length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(contenido)) {
            return res.status(400).json({ mensaje: 'Escribe un mensaje de entre 1 y 5000 caracteres.' });
        }
        const idMensaje = await foroDAO.crearMensaje(idProyecto, req.session.idUsuario, contenido);
        if (!idMensaje) {
            return res.status(403).json({ mensaje: 'Ya no tienes permiso para publicar en este proyecto.' });
        }
        const grupo = conexiones.get(idProyecto);
        if (grupo) {
            grupo.forEach((cliente) => {
                if (cliente.comprobando) cliente.pendiente = true;
                else enviarEvento(cliente, true);
            });
        }
        res.status(201).json({ id_mensaje: idMensaje });
    } catch (error) {
        responderError(res, error);
    }
};

const conectarMensajes = async (req, res) => {
    try {
        const idProyecto = await autorizar(req, res);
        if (!idProyecto || res.destroyed) return;
        res.set({
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-store, no-transform',
            'X-Accel-Buffering': 'no'
        });
        res.flushHeaders();
        const cliente = { req, res, idProyecto, idUsuario: req.session.idUsuario, latido: null };
        if (!conexiones.has(idProyecto)) conexiones.set(idProyecto, new Set());
        conexiones.get(idProyecto).add(cliente);
        res.on('close', () => cerrarConexion(cliente));
        res.write('retry: 3000\n\nevent: actualizar\ndata: {}\n\n');
        cliente.latido = setInterval(() => enviarEvento(cliente, false), 20000);
        cliente.latido.unref();
    } catch (error) {
        if (res.headersSent) return res.end();
        responderError(res, error);
    }
};

module.exports = { listarMensajes, publicarMensaje, conectarMensajes };
