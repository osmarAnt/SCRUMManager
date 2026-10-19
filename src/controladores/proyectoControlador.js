const path = require('path');
const proyectoDAO = require('../dao/proyectoDAO');
const sprintDAO = require('../dao/sprintDAO');

const DURACION_MAXIMA_SPRINT = 31;
const CARACTERES_DE_CONTROL = /[\u0000-\u001f\u007f]/;

const errorServidor = (res, contexto, error) => {
    console.error(`${contexto}:`, error.code || error.message);
    return res.status(500).json({ mensaje: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' });
};

const leerIdProyecto = (req) => {
    return /^\d{1,10}$/.test(req.params.id) ? Number(req.params.id) : null;
};

// Valida y normaliza nombre y objetivo (PB-04 y PB-05). Devuelve { error } o { nombre, objetivo }.
const validarDatosProyecto = (cuerpo) => {
    const { nombre, objetivo } = cuerpo || {};
    if (typeof nombre !== 'string' || (objetivo !== undefined && objetivo !== null && typeof objetivo !== 'string')) {
        return { error: 'Escribe el nombre del proyecto.' };
    }
    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 3 || nombreLimpio.length > 120 || CARACTERES_DE_CONTROL.test(nombreLimpio)) {
        return { error: 'El nombre del proyecto debe tener entre 3 y 120 caracteres.' };
    }
    const objetivoLimpio = (objetivo || '').trim();
    if (objetivoLimpio.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(objetivoLimpio)) {
        return { error: 'El objetivo no puede superar los 1000 caracteres.' };
    }
    return { nombre: nombreLimpio, objetivo: objetivoLimpio || null };
};

// Convierte 'AAAA-MM-DD' a milisegundos UTC; devuelve null si no es una fecha real.
const leerFecha = (valor) => {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return null;
    }
    const [anio, mes, dia] = valor.split('-').map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) {
        return null;
    }
    return fecha.getTime();
};

// Valida los datos del Sprint (PB-13). La duración se calcula aquí, nunca se confía en la del cliente.
const validarDatosSprint = (cuerpo) => {
    const { objetivo, fecha_inicio: fechaInicio, fecha_fin: fechaFin } = cuerpo || {};
    if (typeof objetivo !== 'string' || !objetivo.trim()) {
        return { error: 'Escribe el objetivo del Sprint.' };
    }
    const objetivoLimpio = objetivo.trim();
    if (objetivoLimpio.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(objetivoLimpio)) {
        return { error: 'El objetivo del Sprint no puede superar los 1000 caracteres.' };
    }
    const inicio = leerFecha(fechaInicio);
    const fin = leerFecha(fechaFin);
    if (inicio === null || fin === null) {
        return { error: 'Indica una fecha de inicio y una fecha de fin válidas.' };
    }
    if (fin < inicio) {
        return { error: 'La fecha de fin no puede ser anterior a la fecha de inicio.' };
    }
    const duracionDias = Math.round((fin - inicio) / 86400000) + 1;
    if (duracionDias > DURACION_MAXIMA_SPRINT) {
        return { error: `Un Sprint no puede durar más de ${DURACION_MAXIMA_SPRINT} días.` };
    }
    return { objetivo: objetivoLimpio, fechaInicio, fechaFin, duracionDias };
};

// Comprueba que el usuario pertenezca al proyecto. Si exigirScrumMaster, además debe administrarlo.
// Responde y devuelve null si no procede; si procede devuelve el rol.
const autorizarAcceso = async (req, res, idProyecto, exigirScrumMaster) => {
    const rol = await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario);
    if (!rol) {
        res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        return null;
    }
    if (exigirScrumMaster && rol !== 'Scrum Master') {
        res.status(403).json({ mensaje: 'Solo el Scrum Master del proyecto puede hacer este cambio.' });
        return null;
    }
    return rol;
};

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
                username: req.session.usuario,
                rol: req.session.rol
            },
            proyectos
        });
    });
};

// PB-04
const crearProyecto = async (req, res) => {
    if (req.session.rol !== 'Scrum Master') {
        return res.status(403).json({
            mensaje: 'Solo el Scrum Master puede crear proyectos.'
        });

    }
    const datos = validarDatosProyecto(req.body);
    if (datos.error) {
        return res.status(400).json({ mensaje: datos.error });
    }
    try {
        const idProyecto = await proyectoDAO.crearProyecto(datos.nombre, datos.objetivo, req.session.idUsuario);
        res.status(201).json({
            mensaje: 'Proyecto creado correctamente.',
            proyecto: { id_proyecto: idProyecto, nombre: datos.nombre, objetivo: datos.objetivo, rol: 'Scrum Master' }
        });
    } catch (error) {
        errorServidor(res, 'Error al crear el proyecto', error);
    }
};

const mostrarProyecto = (req, res) => {
    if (leerIdProyecto(req) === null) {
        return res.redirect('/proyectos');
    }
    res.sendFile(
        path.join(__dirname, '..', '..', 'vistas', 'proyecto.html')
    );
};

// PB-05 y PB-13: datos del proyecto y sus Sprints para cualquier integrante.
const consultarProyecto = async (req, res) => {
    const idProyecto = leerIdProyecto(req);
    if (idProyecto === null) {
        return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
    }
    try {
        const rol = await autorizarAcceso(req, res, idProyecto, false);
        if (!rol) {
            return;
        }
        const [proyecto, sprints] = await Promise.all([
            proyectoDAO.obtenerPorId(idProyecto),
            sprintDAO.listarPorProyecto(idProyecto)
        ]);
        if (!proyecto) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        res.json({
            usuario: {
                nombre: req.session.nombre,
                username: req.session.usuario,
                rol: req.session.rol
            },
            proyecto,
            rol,
            puedeAdministrar: rol === 'Scrum Master',
            puedeInvitar:
                req.session.rol === 'Scrum Master' &&
                rol === 'Scrum Master',
            sprints
        });
    } catch (error) {
        errorServidor(res, 'Error al consultar el proyecto', error);
    }
};

// PB-05
const actualizarProyecto = async (req, res) => {
    const idProyecto = leerIdProyecto(req);
    if (idProyecto === null) {
        return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
    }
    const datos = validarDatosProyecto(req.body);
    if (datos.error) {
        return res.status(400).json({ mensaje: datos.error });
    }
    try {
        const rol = await autorizarAcceso(req, res, idProyecto, true);
        if (!rol) {
            return;
        }
        const actualizado = await proyectoDAO.actualizarProyecto(idProyecto, datos.nombre, datos.objetivo);
        if (!actualizado) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        res.json({
            mensaje: 'Los datos del proyecto se actualizaron.',
            proyecto: { id_proyecto: idProyecto, nombre: datos.nombre, objetivo: datos.objetivo }
        });
    } catch (error) {
        errorServidor(res, 'Error al actualizar el proyecto', error);
    }
};

// PB-13
const crearSprint = async (req, res) => {
    const idProyecto = leerIdProyecto(req);
    if (idProyecto === null) {
        return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
    }
    const datos = validarDatosSprint(req.body);
    if (datos.error) {
        return res.status(400).json({ mensaje: datos.error });
    }
    try {
        const rol = await autorizarAcceso(req, res, idProyecto, true);
        if (!rol) {
            return;
        }
        const resultado = await sprintDAO.crearSprint(
            idProyecto, datos.objetivo, datos.fechaInicio, datos.fechaFin, datos.duracionDias
        );
        if (resultado.traslape) {
            return res.status(409).json({
                mensaje: `Las fechas se traslapan con el Sprint ${resultado.traslape} de este proyecto.`
            });
        }
        res.status(201).json({
            mensaje: 'Sprint registrado. Ya está disponible para planificarlo.',
            sprint: resultado.sprint
        });
    } catch (error) {
        errorServidor(res, 'Error al registrar el Sprint', error);
    }
};

module.exports = {
    mostrarProyectos,
    listarProyectos,
    crearProyecto,
    mostrarProyecto,
    consultarProyecto,
    actualizarProyecto,
    crearSprint
};
