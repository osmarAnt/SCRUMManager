const proyectoDAO = require('../dao/proyectoDAO');
const reunionDAO = require('../dao/reunionDAO');

const MODALIDADES = ['Presencial', 'En linea'];

const responderError = (res, error) => {
    console.error('Error en las reuniones del proyecto:', error.code || error.message);
    return res.status(500).json({ mensaje: 'No se pudo completar la operación. Inténtalo de nuevo.' });
};

// Devuelve el proyecto y el rol del usuario, o responde el error y devuelve null.
const autorizarProyecto = async (req, res) => {
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
    return { idProyecto, rol };
};

// 'AAAA-MM-DDTHH:MM' (campo datetime-local) o 'AAAA-MM-DD HH:MM' -> 'AAAA-MM-DD HH:MM:00', o null si no es una fecha real.
const normalizarFecha = (valor) => {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/.exec(String(valor || '').trim());
    if (!coincidencia) {
        return null;
    }
    const [, anio, mes, dia, hora, minuto] = coincidencia.map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia, hora, minuto));
    const valida = fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1
        && fecha.getUTCDate() === dia && hora < 24 && minuto < 60 && anio >= 2000 && anio <= 2100;
    return valida ? `${coincidencia[1]}-${coincidencia[2]}-${coincidencia[3]} ${coincidencia[4]}:${coincidencia[5]}:00` : null;
};

const validarReunion = (cuerpo) => {
    const { titulo, descripcion, fecha, modalidad, lugar_enlace: lugar } = cuerpo || {};
    if ([titulo, descripcion, fecha, modalidad, lugar].some((campo) => typeof campo !== 'string')) {
        return { error: 'Completa título, descripción, fecha, modalidad y lugar o enlace.' };
    }

    const tituloLimpio = titulo.trim();
    if (tituloLimpio.length < 3 || tituloLimpio.length > 150 || /[\u0000-\u001f\u007f]/.test(tituloLimpio)) {
        return { error: 'El título debe tener entre 3 y 150 caracteres.' };
    }

    const descripcionLimpia = descripcion.trim();
    if (!descripcionLimpia || descripcionLimpia.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(descripcionLimpia)) {
        return { error: 'La descripción debe tener entre 1 y 2000 caracteres.' };
    }

    const fechaNormalizada = normalizarFecha(fecha);
    if (!fechaNormalizada) {
        return { error: 'Elige una fecha y hora válidas para la reunión.' };
    }

    const modalidadNormalizada = modalidad.trim().toLowerCase() === 'presencial'
        ? 'Presencial'
        : ['en linea', 'en línea'].includes(modalidad.trim().toLowerCase()) ? 'En linea' : null;
    if (!MODALIDADES.includes(modalidadNormalizada)) {
        return { error: 'La modalidad debe ser presencial o en línea.' };
    }

    const lugarLimpio = lugar.trim();
    if (modalidadNormalizada === 'Presencial') {
        if (lugarLimpio.length < 3 || lugarLimpio.length > 200 || /[\u0000-\u001f\u007f]/.test(lugarLimpio)) {
            return { error: 'Escribe el lugar de la reunión (entre 3 y 200 caracteres).' };
        }
    } else {
        let url;
        try {
            url = new URL(lugarLimpio);
        } catch (error) {
            url = null;
        }
        if (!url || !['http:', 'https:'].includes(url.protocol) || lugarLimpio.length > 500 || /\s/.test(lugarLimpio)) {
            return { error: 'Escribe un enlace de videollamada válido que empiece con http:// o https://.' };
        }
    }

    return {
        titulo: tituloLimpio,
        descripcion: descripcionLimpia,
        fecha: fechaNormalizada,
        modalidad: modalidadNormalizada,
        lugar_enlace: lugarLimpio
    };
};

// GET /proyectos/:id/reuniones — cualquier integrante del proyecto.
const listar = async (req, res) => {
    try {
        const acceso = await autorizarProyecto(req, res);
        if (!acceso) {
            return;
        }
        const reuniones = await reunionDAO.listarPorProyecto(acceso.idProyecto);
        res.json({ reuniones, puedeCrear: acceso.rol === 'Scrum Master', miRol: acceso.rol });
    } catch (error) {
        responderError(res, error);
    }
};

// POST /proyectos/:id/reuniones — solo el Scrum Master.
const crear = async (req, res) => {
    try {
        const acceso = await autorizarProyecto(req, res);
        if (!acceso) {
            return;
        }
        if (acceso.rol !== 'Scrum Master') {
            return res.status(403).json({ mensaje: 'Solo el Scrum Master de este proyecto puede crear reuniones.' });
        }
        const datos = validarReunion(req.body);
        if (datos.error) {
            return res.status(400).json({ mensaje: datos.error });
        }
        const resultado = await reunionDAO.crear(acceso.idProyecto, req.session.idUsuario, datos);
        if (!resultado.affectedRows) {
            return res.status(403).json({ mensaje: 'Ya no tienes permiso para crear reuniones en este proyecto.' });
        }
        res.status(201).json({ mensaje: 'Reunión creada. El equipo ya puede consultarla.', id_reunion: resultado.insertId });
    } catch (error) {
        responderError(res, error);
    }
};

module.exports = {
    listar,
    crear
};
