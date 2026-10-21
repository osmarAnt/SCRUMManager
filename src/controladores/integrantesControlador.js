const proyectoDAO = require('../dao/proyectoDAO');
const integrantesDAO = require('../dao/integrantesDAO');

const idValido = (valor) => {
    return (
        typeof valor === 'string' &&
        /^[1-9]\d{0,9}$/.test(valor) &&
        Number(valor) <= 2147483647
    );
};

const errores = {
    proyecto_inexistente: [
        404,
        'No existe ese proyecto.'
    ],
    sin_permiso: [
        403,
        'Solo el Scrum Master del proyecto puede administrar integrantes.'
    ],
    no_integrante: [
        404,
        'Ese usuario ya no pertenece al proyecto.'
    ],
    protegido: [
        403,
        'No puedes editar ni eliminar al Scrum Master del proyecto.'
    ]
};


const responderError = (res, codigo) => {
    const [estado, mensaje] = errores[codigo] || [
        500,
        'No se pudo completar la operación.'
    ];
    return res.status(estado).json({
        mensaje
    });
};

const puedeGestionar = async (req, idProyecto) => {
    if (req.session.rol !== 'Scrum Master') {
        return false;
    }

    const rol = await proyectoDAO.obtenerRolEnProyecto(
        idProyecto,
        req.session.idUsuario
    );
    return rol === 'Scrum Master';

};

const disponibles = async (req, res) => {
    if (!idValido(req.params.id)) {
        return res.status(400).json({
            mensaje: 'Proyecto inválido.'
        });
    }

    try {
        const idProyecto = Number(req.params.id);
        const autorizado = await puedeGestionar(
            req,
            idProyecto
        );
        if (!autorizado) {
            return responderError(res, 'sin_permiso');
        }
        const usuarios = await integrantesDAO.listarDisponibles(
            idProyecto,
            req.session.idUsuario
        );
        return res.json({
            usuarios
        });

    } catch (error) {
        console.error('Error al listar usuarios:', error);
        return res.status(500).json({
            mensaje: 'No se pudieron cargar los usuarios.'
        });
    }
};

const actualizar = async (req, res) => {
    if (
        !idValido(req.params.id) ||
        !idValido(req.params.idUsuario)
    ) {
        return res.status(400).json({
            mensaje: 'Identificador inválido.'
        });
    }

    const rol = req.body?.rol;
    if (
        rol !== 'Product Owner' &&
        rol !== 'Desarrollador'
    ) {
        return res.status(400).json({
            mensaje: 'El rol debe ser Product Owner o Desarrollador.'
        });
    }

    try {
        const resultado = await integrantesDAO.cambiarIntegrante(
            Number(req.params.id),
            req.session.idUsuario,
            Number(req.params.idUsuario),
            rol
        );
        if (resultado.error) {
            return responderError(
                res,
                resultado.error
            );
        }

        return res.json({
            mensaje: 'Rol del integrante actualizado.'
        });
    } catch (error) {
        console.error('Error al editar integrante:', error);
        return res.status(500).json({
            mensaje: 'No se pudo cambiar el rol.'
        });
    }
};

const eliminar = async (req, res) => {
    if (
        !idValido(req.params.id) ||
        !idValido(req.params.idUsuario)
    ) {
        return res.status(400).json({
            mensaje: 'Identificador inválido.'
        });
    }
    try {
        const resultado = await integrantesDAO.cambiarIntegrante(
            Number(req.params.id),
            req.session.idUsuario,
            Number(req.params.idUsuario)
        );
        if (resultado.error) {
            return responderError(
                res,
                resultado.error
            );
        }
        return res.json({
            mensaje: 'Integrante eliminado del proyecto.'
        });
    } catch (error) {
        console.error('Error al eliminar integrante:', error);
        return res.status(500).json({
            mensaje: 'No se pudo eliminar al integrante.'
        });
    }
};

module.exports = {
    disponibles,
    actualizar,
    eliminar
};