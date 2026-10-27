const proyectoDAO = require('../dao/proyectoDAO');
const mensajeDAO = require('../dao/mensajeDAO');
const conexiones = new Map();

const cerrarConexion = (cliente, evento) => {
    clearInterval(cliente.latido);
    const grupo = conexiones.get(cliente.idProyecto);
    if (grupo) {
        grupo.delete(cliente);
        if (!grupo.size) {
            conexiones.delete(cliente.idProyecto);
        }
    }
    if (!cliente.res.destroyed && !cliente.res.writableEnded) {
        if (evento) {
            cliente.res.write(`event: ${evento}\ndata: {}\n\n`);
        }
        cliente.res.end();
    }
};

const comprobarConexion = async (cliente) => {
    if (cliente.res.destroyed || cliente.res.writableEnded) {
        return false;
    }
    const sesionValida = await new Promise(resolve => {
        cliente.req.session.reload(error => resolve(!error && cliente.req.session.idUsuario === cliente.idUsuario));
    });
    if (!sesionValida) {
        cerrarConexion(cliente, 'sesion');
        return false;
    }
    const rol = await proyectoDAO.obtenerRolEnProyecto(cliente.idProyecto, cliente.idUsuario);
    if (!rol) {
        cerrarConexion(cliente, 'acceso');
        return false;
    }
    return !cliente.res.destroyed && !cliente.res.writableEnded;
};

const enviarEvento = async (cliente, actualizar) => {
    try {
        if (await comprobarConexion(cliente)) {
            cliente.res.write(actualizar ? 'event: actualizar\ndata: {}\n\n' : ': conectado\n\n');
        }
    } catch (error) {
        cerrarConexion(cliente);
    }
};

const notificarProyecto = (idProyecto, idUsuario) => {
    const grupo = conexiones.get(idProyecto);
    if (grupo) {
        grupo.forEach(cliente => {
            if (idUsuario === undefined || cliente.idUsuario === idUsuario) {
                enviarEvento(cliente, true);
            }
        });
    }
};

const responderError = (res, error) => {
    console.error('Error en los avisos del proyecto:', error.code || error.message);
    return res.status(500).json({ mensaje: 'No se pudo completar la operación. Inténtalo de nuevo.' });
};

// exigirPublicador: solo el Scrum Master o el Product Owner del proyecto pueden publicar avisos.
const autorizarProyecto = async (req, res, exigirPublicador) => {
    const valor = req.params.id;
    if (!/^[1-9]\d{0,9}$/.test(valor) || Number(valor) > 2147483647) {
        res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        return null;
    }
    const idProyecto = Number(valor);
    const rol = await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario);
    if (!rol) {
        res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        return null;
    }
    if (exigirPublicador && rol !== 'Product Owner' && rol !== 'Scrum Master') {
        res.status(403).json({ mensaje: 'Solo el Scrum Master o el Product Owner de este proyecto pueden publicar avisos.' });
        return null;
    }
    return { idProyecto, rol };
};

const validarMensaje = (cuerpo) => {
    const { titulo, contenido } = cuerpo || {};
    if (typeof titulo !== 'string' || typeof contenido !== 'string') {
        return { error: 'Escribe el título y el contenido del mensaje.' };
    }
    const tituloLimpio = titulo.trim();
    const contenidoLimpio = contenido.trim();
    if (tituloLimpio.length < 3 || tituloLimpio.length > 150 || /[\u0000-\u001f\u007f]/.test(tituloLimpio)) {
        return { error: 'El título debe tener entre 3 y 150 caracteres.' };
    }
    if (!contenidoLimpio || contenidoLimpio.length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(contenidoLimpio)) {
        return { error: 'El contenido debe tener entre 1 y 5000 caracteres.' };
    }
    return { titulo: tituloLimpio, contenido: contenidoLimpio };
};

const listarMensajes = async (req, res) => {
    try {
        const acceso = await autorizarProyecto(req, res, false);
        if (!acceso) {
            return;
        }
        mensajeDAO.listarPorProyecto(acceso.idProyecto, req.session.idUsuario, (error, mensajes) => {
            if (error) {
                return responderError(res, error);
            }
            res.json({ mensajes: mensajes.map(mensaje => ({ ...mensaje, leido: Boolean(mensaje.leido) })), puedePublicar: acceso.rol === 'Product Owner' || acceso.rol === 'Scrum Master', miRol: acceso.rol });
        });
    } catch (error) {
        responderError(res, error);
    }
};

const publicarMensaje = async (req, res) => {
    try {
        const acceso = await autorizarProyecto(req, res, true);
        if (!acceso) {
            return;
        }
        const datos = validarMensaje(req.body);
        if (datos.error) {
            return res.status(400).json({ mensaje: datos.error });
        }
        mensajeDAO.crearMensaje(acceso.idProyecto, req.session.idUsuario, datos.titulo, datos.contenido, (error, resultado) => {
            if (error) {
                return responderError(res, error);
            }
            if (!resultado.affectedRows) {
                return res.status(403).json({ mensaje: 'Ya no tienes permiso para publicar en este proyecto.' });
            }
            notificarProyecto(acceso.idProyecto);
            res.status(201).json({ mensaje: 'Aviso publicado. El equipo del proyecto ya puede consultarlo.', id_mensaje: resultado.insertId });
        });
    } catch (error) {
        responderError(res, error);
    }
};

const conectarMensajes = async (req, res) => {
    try {
        const acceso = await autorizarProyecto(req, res, false);
        if (!acceso) {
            return;
        }
        res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' });
        res.flushHeaders();
        const cliente = { req, res, idProyecto: acceso.idProyecto, idUsuario: req.session.idUsuario, latido: null };
        if (!conexiones.has(acceso.idProyecto)) {
            conexiones.set(acceso.idProyecto, new Set());
        }
        conexiones.get(acceso.idProyecto).add(cliente);
        res.on('close', () => cerrarConexion(cliente));
        res.write('retry: 3000\n\nevent: actualizar\ndata: {}\n\n');
        cliente.latido = setInterval(() => enviarEvento(cliente, false), 20000);
        cliente.latido.unref();
    } catch (error) {
        if (res.headersSent) {
            return res.end();
        }
        responderError(res, error);
    }
};

const marcarMensajeLeido = async (req, res) => {
    try {
        const acceso = await autorizarProyecto(req, res, false);
        if (!acceso) {
            return;
        }
        if (!/^[1-9]\d{0,9}$/.test(req.params.idMensaje) || Number(req.params.idMensaje) > 2147483647) {
            return res.status(404).json({ mensaje: 'No encontramos ese mensaje en este proyecto.' });
        }
        const idMensaje = Number(req.params.idMensaje);
        mensajeDAO.marcarLeido(acceso.idProyecto, idMensaje, req.session.idUsuario, (error, lectura) => {
            if (error) {
                return responderError(res, error);
            }
            if (!lectura) {
                return res.status(404).json({ mensaje: 'No encontramos ese mensaje en este proyecto.' });
            }
            notificarProyecto(acceso.idProyecto, req.session.idUsuario);
            res.json({ id_mensaje: idMensaje, leido: true, fecha_lectura: lectura.fecha_lectura });
        });
    } catch (error) {
        responderError(res, error);
    }
};

module.exports = {
    listarMensajes,
    publicarMensaje,
    conectarMensajes,
    marcarMensajeLeido
};
