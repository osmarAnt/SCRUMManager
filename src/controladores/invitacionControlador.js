const proyectoDAO = require('../dao/proyectoDAO');
const invitacionDAO = require('../dao/invitacionDAO');


const idValido = (valor) => {
    return (
        typeof valor === 'string' &&
        /^[1-9]\d{0,9}$/.test(valor) &&
        Number(valor) <= 2147483647
    );
};

const manejarError = (res, mensaje, error) => {
    console.error(
        mensaje,
        error.code || error.message
    );
    return res.status(500).json({
        mensaje: 'Ocurrió un error en el servidor.'
    });
};

const responderError = (res, codigo) => {
    const errores = {
        proyecto_inexistente: [
            404,
            'No encontramos ese proyecto.'
        ],
        sin_permiso: [
            403,
            'Solo el Scrum Master puede invitar integrantes.'
        ],
        usuario_inexistente: [
            404,
            'No existe una cuenta activa con ese usuario.'
        ],
        mismo_usuario: [
            400,
            'No puedes invitarte a ti mismo.'
        ],
        ya_integrante: [
            409,
            'El usuario ya forma parte del proyecto.'
        ],
        ya_invitado: [
            409,
            'Ya existe una invitación para este usuario.'
        ],
        invitacion_inexistente: [
            404,
            'No encontramos una invitación dirigida a tu cuenta.'
        ],
        ya_respondida: [
            409,
            'La invitación ya fue aceptada.'
        ]
    };
    const [estado, mensaje] = errores[codigo] || [
        500,
        'No se pudo completar la operación.'
    ];
    return res.status(estado).json({
        mensaje
    });
};

const invitar = async (req, res) => {
    // Verificar que sea scrum master
    if (req.session.rol !== 'Scrum Master') {
        return res.status(403).json({
            mensaje: 'Solo el Scrum Master puede enviar invitaciones.'
        });
    }
    if (!idValido(req.params.id)) {
        return res.status(400).json({
            mensaje: 'Identificador de proyecto no válido.'
        });

    }
    const { username, rol } = req.body || {};
    if (
        typeof username !== 'string' ||
        username.trim().length < 3 ||
        username.trim().length > 50 ||
        /[\u0000-\u001f\u007f]/.test(username.trim())
    ) {
        return res.status(400).json({
            mensaje: 'Escribe un nombre de usuario válido.'
        });
    }
    if (
        rol !== 'Product Owner' &&
        rol !== 'Desarrollador'
    ) {
        return res.status(400).json({
            mensaje: 'Selecciona un rol válido.'
        });
    }
    try {
        const respuesta = await invitacionDAO.crearInvitacion(
            Number(req.params.id),
            username.trim(),
            rol,
            req.session.idUsuario
        );
        if (respuesta.error) {
            return responderError(
                res,
                respuesta.error
            );
        }
        return res.status(201).json({
            mensaje: 'Invitación enviada correctamente.',
            invitacion: respuesta.invitacion
        });
    } catch (error) {
        return manejarError(
            res,
            'Error al enviar invitación:',
            error
        );
    }
};

const integrantes = async (req, res) => {
    if (!idValido(req.params.id)) {
        return res.status(400).json({
            mensaje: 'Identificador de proyecto no válido.'
        });
    }
    try {
        const idProyecto = Number(req.params.id);
        const rol = await proyectoDAO.obtenerRolEnProyecto(
            idProyecto,
            req.session.idUsuario
        );
        if (!rol) {
            return res.status(404).json({
                mensaje: 'No encontramos ese proyecto.'
            });
        }
        const datos = await invitacionDAO.listarIntegrantes(
            idProyecto,
            rol === 'Scrum Master'
        );
        return res.json(datos);
    } catch (error) {
        return manejarError(
            res,
            'Error al consultar integrantes:',
            error
        );
    }
};

const pendientes = async (req, res) => {
    try {
        const invitaciones =
            await invitacionDAO.listarPendientes(
                req.session.idUsuario
            );
        return res.json({
            invitaciones
        });
    } catch (error) {
        return manejarError(
            res,
            'Error al consultar invitaciones:',
            error
        );
    }

};

const aceptar = async (req, res) => {
    if (!idValido(req.params.id)) {
        return res.status(400).json({
            mensaje: 'Identificador de invitación no válido.'
        });
    }
    try {
        const resultado =
            await invitacionDAO.aceptarInvitacion(
                Number(req.params.id),
                req.session.idUsuario
            );
        if (resultado.error) {
            return responderError(
                res,
                resultado.error
            );
        }
        return res.json({
            mensaje: 'Invitación aceptada. Ya tienes acceso al proyecto.',
            proyecto: {
                id_proyecto: resultado.id_proyecto,
                rol: resultado.rol
            }
        });
    } catch (error) {
        return manejarError(
            res,
            'Error al aceptar invitación:',
            error
        );
    }
};

module.exports = {
    invitar,
    integrantes,
    pendientes,
    aceptar
};