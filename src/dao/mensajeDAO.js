const conexion = require('../base_de_datos/conexion');

const listarPorProyecto = (idProyecto, idUsuario, callback) => {
    const consulta = `
        SELECT m.id_mensaje, m.titulo, m.contenido, m.fecha_creacion,
            COALESCE(u.nombre, 'Usuario eliminado') AS autor,
            u.username AS username_autor,
            (m.id_autor = ? OR l.id_usuario IS NOT NULL) AS leido, l.fecha_lectura
        FROM mensajes_product_owner m
        LEFT JOIN usuarios u ON u.id_usuario = m.id_autor
        LEFT JOIN lecturas_mensajes_product_owner l
            ON l.id_mensaje = m.id_mensaje AND l.id_usuario = ?
        WHERE m.id_proyecto = ?
        ORDER BY m.fecha_creacion DESC, m.id_mensaje DESC
    `;
    conexion.query(consulta, [idUsuario, idUsuario, idProyecto], callback);
};

const crearMensaje = (idProyecto, idAutor, titulo, contenido, callback) => {
    const consulta = `
        INSERT INTO mensajes_product_owner (id_proyecto, id_autor, titulo, contenido)
        SELECT pu.id_proyecto, pu.id_usuario, ?, ?
        FROM proyecto_usuarios pu
        INNER JOIN proyectos p ON p.id_proyecto = pu.id_proyecto
        INNER JOIN usuarios u ON u.id_usuario = pu.id_usuario
        WHERE pu.id_proyecto = ? AND pu.id_usuario = ?
        AND pu.rol = 'Product Owner' AND pu.activo = TRUE
        AND p.activo = TRUE AND u.activo = TRUE
    `;
    conexion.query(consulta, [titulo, contenido, idProyecto, idAutor], callback);
};

const marcarLeido = (idProyecto, idMensaje, idUsuario, callback) => {
    const consulta = `
        INSERT INTO lecturas_mensajes_product_owner (id_mensaje, id_usuario)
        SELECT m.id_mensaje, pu.id_usuario
        FROM mensajes_product_owner m
        INNER JOIN proyectos p ON p.id_proyecto = m.id_proyecto
        INNER JOIN proyecto_usuarios pu ON pu.id_proyecto = m.id_proyecto
        INNER JOIN usuarios u ON u.id_usuario = pu.id_usuario
        WHERE pu.id_usuario = ? AND m.id_mensaje = ? AND m.id_proyecto = ?
        AND pu.activo = TRUE AND p.activo = TRUE AND u.activo = TRUE
        ON DUPLICATE KEY UPDATE id_mensaje = lecturas_mensajes_product_owner.id_mensaje
    `;
    conexion.query(consulta, [idUsuario, idMensaje, idProyecto], (error) => {
        if (error) {
            return callback(error);
        }
        const lectura = `
            SELECT l.fecha_lectura
            FROM lecturas_mensajes_product_owner l
            INNER JOIN mensajes_product_owner m ON m.id_mensaje = l.id_mensaje
            INNER JOIN proyectos p ON p.id_proyecto = m.id_proyecto
            INNER JOIN proyecto_usuarios pu
                ON pu.id_proyecto = m.id_proyecto AND pu.id_usuario = l.id_usuario
            INNER JOIN usuarios u ON u.id_usuario = l.id_usuario
            WHERE m.id_proyecto = ? AND l.id_mensaje = ? AND l.id_usuario = ?
            AND p.activo = TRUE AND pu.activo = TRUE AND u.activo = TRUE
        `;
        conexion.query(lectura, [idProyecto, idMensaje, idUsuario], (errorLectura, filas) => {
            callback(errorLectura, errorLectura ? null : filas[0] || null);
        });
    });
};

module.exports = {
    listarPorProyecto,
    crearMensaje,
    marcarLeido
};
