// PB-34: controlador de retrospectivas del Sprint.
const retrospectivaDAO = require('../dao/retrospectivaDAO');
const proyectoDAO = require('../dao/proyectoDAO');

const errorServidor = (res, contexto, error) => {
    console.error(`${contexto}:`, error.code || error.message);
    return res.status(500).json({
        mensaje: 'Ocurrió un error en el servidor. Inténtalo de nuevo.'
    });
};

const leerIdProyecto = (req) => {
    return /^\d{1,10}$/.test(req.params.id) &&
        Number(req.params.id) > 0
        ? Number(req.params.id)
        : null;
};

const esIdPositivo = (valor) => {
    return /^\d{1,10}$/.test(String(valor)) &&
        Number.isSafeInteger(Number(valor)) &&
        Number(valor) > 0;
};

// Valida cada campo y devuelve el texto limpio o un mensaje de error.
const validarTexto = (valor, nombre) => {
    if (typeof valor !== 'string') {
        return { error: `${nombre} es obligatorio.` };
    }

    const texto = valor.trim();

    if (!texto) {
        return { error: `${nombre} es obligatorio.` };
    }

    if (texto.length > 3000) {
        return { error: `${nombre} no puede superar los 3000 caracteres.` };
    }

    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(texto)) {
        return { error: `${nombre} contiene caracteres no permitidos.` };
    }

    return { valor: texto };
};

// Verifica que el usuario tenga acceso al proyecto.
const autorizarProyecto = async (req, res, idProyecto) => {
    const rol = await proyectoDAO.obtenerRolEnProyecto(
        idProyecto,
        req.session.idUsuario
    );

    if (!rol) {
        res.status(404).json({
            mensaje: 'No encontramos ese proyecto.'
        });
        return null;
    }

    return rol;
};

// GET /proyectos/:id/retrospectivas
const listar = async (req, res) => {
    const idProyecto = leerIdProyecto(req);

    if (!idProyecto) {
        return res.status(404).json({
            mensaje: 'No encontramos ese proyecto.'
        });
    }

    try {
        const rol = await autorizarProyecto(req, res, idProyecto);
        if (!rol) return;

        const [sprints, retrospectivas] = await Promise.all([
            retrospectivaDAO.obtenerSprints(idProyecto),
            retrospectivaDAO.obtenerPorProyecto(idProyecto)
        ]);

        return res.json({
            id_usuario: req.session.idUsuario,
            sprints,
            retrospectivas
        });
    } catch (error) {
        return errorServidor(res, 'Error al consultar retrospectivas', error);
    }
};

// POST /proyectos/:id/retrospectivas
const guardar = async (req, res) => {
    const idProyecto = leerIdProyecto(req);

    if (!idProyecto) {
        return res.status(404).json({
            mensaje: 'No encontramos ese proyecto.'
        });
    }

    if (!esIdPositivo(req.body?.id_sprint)) {
        return res.status(400).json({
            mensaje: 'Selecciona un Sprint válido.'
        });
    }

    const aciertos = validarTexto(req.body?.aciertos, 'Los aciertos');
    const aspectosMejorar = validarTexto(
        req.body?.aspectos_mejorar,
        'Los aspectos por mejorar'
    );
    const accionesAcordadas = validarTexto(
        req.body?.acciones_acordadas,
        'Las acciones acordadas'
    );

    const errores = [
        aciertos.error,
        aspectosMejorar.error,
        accionesAcordadas.error
    ].filter(Boolean);

    if (errores.length) {
        return res.status(400).json({
            mensaje: errores.join(' ')
        });
    }

    try {
        const rol = await autorizarProyecto(req, res, idProyecto);
        if (!rol) return;

        const idRetrospectiva = await retrospectivaDAO.guardar(
            idProyecto,
            Number(req.body.id_sprint),
            req.session.idUsuario,
            aciertos.valor,
            aspectosMejorar.valor,
            accionesAcordadas.valor
        );

        if (!idRetrospectiva) {
            return res.status(404).json({
                mensaje: 'No se encontró ese Sprint dentro del proyecto.'
            });
        }

        return res.json({
            mensaje: 'La retrospectiva se guardó correctamente.',
            id_retrospectiva: idRetrospectiva
        });
    } catch (error) {
        return errorServidor(res, 'Error al guardar retrospectiva', error);
    }
};

module.exports = {
    listar,
    guardar
};
