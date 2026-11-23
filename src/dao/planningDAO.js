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
        `SELECT h.id_historia, h.titulo, h.descripcion, h.id_responsable,
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
    const [criterios] = await conexion.promise().query(
        `SELECT c.id_historia, c.descripcion FROM criterios_aceptacion c
         JOIN product_backlog h ON h.id_historia = c.id_historia
         WHERE h.id_proyecto = ? ORDER BY c.id_criterio`,
        [idProyecto]
    );
    const porHistoria = new Map(historias.map((historia) => [historia.id_historia, historia]));
    for (const historia of historias) historia.criterios = [];
    for (const criterio of criterios) porHistoria.get(criterio.id_historia)?.criterios.push(criterio.descripcion);
    return historias;
};

// PB-46: guarda (o borra con NULL) las horas estimadas de una historia SOLO si pertenece al proyecto.
// Devuelve el título de la historia o null si no existe en ese proyecto.
// (Se busca primero: guardar el mismo valor puede reportar 0 filas afectadas sin ser un error.)
const guardarHorasEstimadas = async (idProyecto, idHistoria, horas) => {
    const [filas] = await conexion.promise().query(
        'SELECT titulo FROM product_backlog WHERE id_historia = ? AND id_proyecto = ?',
        [idHistoria, idProyecto]
    );
    if (!filas.length) return null;
    await conexion.promise().query(
        `UPDATE product_backlog SET horas_estimadas = ?
         WHERE id_historia = ? AND id_proyecto = ?`,
        [horas, idHistoria, idProyecto]
    );
    return filas[0].titulo;
};

module.exports = { esIntegrante, obtenerHistorias, guardarHorasEstimadas };
