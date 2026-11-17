const conexion = require('../base_de_datos/conexion');

// Francisco: PB-45. Todos los integrantes activos pueden consultar Planning Poker.
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

const obtenerHistorias = async (idProyecto) => {
    const [historias] = await conexion.promise().query(
        `SELECT h.id_historia, h.titulo, h.id_responsable,
                u.nombre AS responsable,
                s.id_sprint, s.numero AS sprint_numero,
                h.puntos, h.horas_estimadas
         FROM product_backlog h
         LEFT JOIN sprints s ON s.id_sprint = h.id_sprint
             AND s.id_proyecto = h.id_proyecto
         LEFT JOIN usuarios u ON u.id_usuario = h.id_responsable
         WHERE h.id_proyecto = ?
         ORDER BY s.id_sprint IS NULL, s.numero ASC, s.id_sprint ASC,
                  h.orden ASC, h.id_historia ASC`,
        [idProyecto]
    );
    return historias;
};

module.exports = { esIntegrante, obtenerHistorias };
