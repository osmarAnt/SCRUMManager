const pool = require('../base_de_datos/conexion');

// CONSULTAR NOTIFICACIONES DEL USUARIO
const listar = async (idUsuario) => {
    const [notificaciones] = await pool.promise().query(`
        SELECT
            n.id_notificacion,
            n.id_proyecto,
            n.id_historia,
            h.id_sprint,
            n.titulo_historia,
            n.leida,
            DATE_FORMAT(n.fecha_creacion, '%d/%m/%Y %H:%i') AS fecha,
            p.nombre AS proyecto
        FROM notificaciones_historias n

        INNER JOIN proyectos p
            ON p.id_proyecto = n.id_proyecto
            AND p.activo = TRUE

        LEFT JOIN product_backlog h
            ON h.id_historia = n.id_historia
            AND h.id_proyecto = n.id_proyecto

        INNER JOIN proyecto_usuarios pu
            ON pu.id_proyecto = n.id_proyecto
            AND pu.id_usuario = n.id_usuario
            AND pu.activo = TRUE

        WHERE n.id_usuario = ?

        ORDER BY n.id_notificacion DESC
        LIMIT 30
    `, [idUsuario]);

    const [[conteo]] = await pool.promise().query(`
        SELECT COUNT(*) AS pendientes
        FROM notificaciones_historias n

        INNER JOIN proyectos p
            ON p.id_proyecto = n.id_proyecto
            AND p.activo = TRUE

        INNER JOIN proyecto_usuarios pu
            ON pu.id_proyecto = n.id_proyecto
            AND pu.id_usuario = n.id_usuario
            AND pu.activo = TRUE

        WHERE n.id_usuario = ?
        AND n.leida = FALSE
    `, [idUsuario]);

    return {
        notificaciones,
        pendientes: conteo.pendientes
    };
};

// MARCAR UNA NOTIFICACIÓN COMO LEÍDA
const marcarLeida = async (idUsuario, idNotificacion) => {
    const [resultado] = await pool.promise().query(`
        UPDATE notificaciones_historias n
        INNER JOIN proyecto_usuarios pu
            ON pu.id_proyecto = n.id_proyecto
            AND pu.id_usuario = n.id_usuario
            AND pu.activo = TRUE
        SET n.leida = TRUE
        WHERE n.id_notificacion = ?
        AND n.id_usuario = ?
    `, [idNotificacion, idUsuario]);

    return resultado.affectedRows > 0;
};

// MARCAR TODAS COMO LEÍDAS
const marcarTodas = async (idUsuario) => {
    const [resultado] = await pool.promise().query(`
        UPDATE notificaciones_historias n
        INNER JOIN proyecto_usuarios pu
            ON pu.id_proyecto = n.id_proyecto
            AND pu.id_usuario = n.id_usuario
            AND pu.activo = TRUE
        SET n.leida = TRUE
        WHERE n.id_usuario = ?
        AND n.leida = FALSE
    `, [idUsuario]);

    return resultado.affectedRows;
};

module.exports = {
    listar,
    marcarLeida,
    marcarTodas
};