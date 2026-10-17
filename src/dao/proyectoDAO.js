const conexion = require('../base_de_datos/conexion');

const listarPorUsuario = (idUsuario, callback) => {
    const consulta = `
        SELECT p.id_proyecto, p.nombre, p.objetivo, pu.rol
        FROM proyectos p
        INNER JOIN proyecto_usuarios pu ON pu.id_proyecto = p.id_proyecto
        WHERE pu.id_usuario = ?
        AND pu.activo = TRUE
        AND p.activo = TRUE
        ORDER BY p.nombre ASC, p.id_proyecto ASC
    `;
    conexion.query(consulta, [idUsuario], (error, resultados) => {
        if (error) {
            return callback(error, null);
        }
        callback(null, resultados);
    });
};

module.exports = {
    listarPorUsuario
};
