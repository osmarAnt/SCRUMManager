const conexion = require('../base_de_datos/conexion');

// El foro pertenece a un proyecto y está disponible para todos sus integrantes activos.
const esIntegrante = async (idProyecto, idUsuario) => {
    const [filas] = await conexion.promise().query(
        `SELECT 1 FROM proyecto_usuarios pu
         INNER JOIN proyectos p ON p.id_proyecto = pu.id_proyecto
         INNER JOIN usuarios u ON u.id_usuario = pu.id_usuario
         WHERE pu.id_proyecto = ? AND pu.id_usuario = ?
         AND pu.activo = TRUE AND p.activo = TRUE AND u.activo = TRUE`,
        [idProyecto, idUsuario]
    );
    return filas.length > 0;
};

const listarPorProyecto = async (idProyecto) => {
    const [mensajes] = await conexion.promise().query(
        `SELECT m.id_mensaje, m.id_autor, m.contenido,
             COALESCE(u.username, 'Usuario eliminado') AS usuario
         FROM mensajes_foro m
         LEFT JOIN usuarios u ON u.id_usuario = m.id_autor
         WHERE m.id_proyecto = ?
         ORDER BY m.id_mensaje ASC`,
        [idProyecto]
    );
    return mensajes;
};

// La identidad sale de la sesión. La consulta vuelve a comprobar el acceso al insertar.
const crearMensaje = async (idProyecto, idUsuario, contenido) => {
    const [resultado] = await conexion.promise().query(
        `INSERT INTO mensajes_foro (id_proyecto, id_autor, contenido)
         SELECT pu.id_proyecto, pu.id_usuario, ?
         FROM proyecto_usuarios pu
         INNER JOIN proyectos p ON p.id_proyecto = pu.id_proyecto
         INNER JOIN usuarios u ON u.id_usuario = pu.id_usuario
         WHERE pu.id_proyecto = ? AND pu.id_usuario = ?
         AND pu.activo = TRUE AND p.activo = TRUE AND u.activo = TRUE`,
        [contenido, idProyecto, idUsuario]
    );
    return resultado.affectedRows ? resultado.insertId : null;
};

module.exports = { esIntegrante, listarPorProyecto, crearMensaje };
