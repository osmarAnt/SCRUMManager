// PB-32: el desarrollador registra horas en sus historias asignadas.
// PB-33: el Scrum Master consulta el acumulado por historia y por desarrollador.
const proyectoDAO = require('../dao/proyectoDAO');
const tiempoDAO = require('../dao/tiempoDAO');
const {
    HORAS_MAXIMAS_POR_REGISTRO,
    DIAS_HACIA_ATRAS_PERMITIDOS,
    fechaLocal,
    validarRegistroTiempo
} = require('../utilidades/tiempos');

const idPositivo = (valor) =>
    /^\d{1,10}$/.test(String(valor)) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0;

const errorServidor = (res, contexto, error) => {
    console.error(`${contexto}:`, error.code || error.message);
    return res.status(500).json({ mensaje: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' });
};

// Comprueba que el usuario tenga EL rol pedido en ESE proyecto (el rol del proyecto, no el de la cuenta).
// Si no procede responde y devuelve null.
const autorizarRol = async (req, res, rolRequerido, mensajeSinPermiso) => {
    if (!idPositivo(req.params.id)) {
        res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        return null;
    }
    const idProyecto = Number(req.params.id);
    const rol = await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario);
    if (!rol) {
        res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        return null;
    }
    if (rol !== rolRequerido) {
        res.status(403).json({ mensaje: mensajeSinPermiso });
        return null;
    }
    return idProyecto;
};

// PB-32: guardar un registro de horas.
const registrarTiempo = async (req, res) => {
    try {
        const idProyecto = await autorizarRol(
            req, res, 'Desarrollador', 'Solo un desarrollador del proyecto puede registrar horas.'
        );
        if (!idProyecto) {
            return;
        }
        if (!idPositivo(req.params.idHistoria)) {
            return res.status(404).json({ mensaje: 'No encontramos esa historia.' });
        }
        const datos = validarRegistroTiempo(req.body);
        if (datos.error) {
            return res.status(400).json({ mensaje: datos.error });
        }
        // El usuario sale de la sesión: el navegador no puede registrar horas a nombre de otra persona.
        const resultado = await tiempoDAO.registrar(
            idProyecto, Number(req.params.idHistoria), req.session.idUsuario, datos.horas, datos.fecha
        );
        if (resultado.noEncontrada) {
            return res.status(404).json({ mensaje: 'No encontramos esa historia.' });
        }
        if (resultado.sinPermiso) {
            return res.status(403).json({ mensaje: 'Solo puedes registrar horas en historias asignadas a tu cuenta.' });
        }
        res.status(201).json({
            mensaje: `Registraste ${datos.horas} h en "${resultado.titulo}" (${datos.fecha}).`,
            registro: { id_registro: resultado.id_registro, horas: datos.horas, fecha_trabajo: datos.fecha }
        });
    } catch (error) {
        errorServidor(res, 'Error al registrar horas', error);
    }
};

// PB-32: historias asignadas al desarrollador, sus registros y las reglas de la fecha para el formulario.
const consultarMisTiempos = async (req, res) => {
    try {
        const idProyecto = await autorizarRol(
            req, res, 'Desarrollador', 'Solo un desarrollador del proyecto puede registrar horas.'
        );
        if (!idProyecto) {
            return;
        }
        const datos = await tiempoDAO.obtenerMisTiempos(idProyecto, req.session.idUsuario);
        const ahora = new Date();
        res.json({
            ...datos,
            // La pantalla usa las mismas fechas límite que valida el servidor.
            hoy: fechaLocal(ahora),
            fecha_minima: fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - DIAS_HACIA_ATRAS_PERMITIDOS)),
            horas_maximas: HORAS_MAXIMAS_POR_REGISTRO
        });
    } catch (error) {
        errorServidor(res, 'Error al consultar mis tiempos', error);
    }
};

// PB-33: resumen de tiempo del proyecto (solo Scrum Master).
const consultarResumen = async (req, res) => {
    try {
        const idProyecto = await autorizarRol(
            req, res, 'Scrum Master', 'Solo el Scrum Master del proyecto puede consultar el resumen de tiempo.'
        );
        if (!idProyecto) {
            return;
        }
        res.json(await tiempoDAO.obtenerResumen(idProyecto));
    } catch (error) {
        errorServidor(res, 'Error al consultar el resumen de tiempo', error);
    }
};

module.exports = {
    registrarTiempo,
    consultarMisTiempos,
    consultarResumen
};
