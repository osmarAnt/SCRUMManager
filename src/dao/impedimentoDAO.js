// Sprint 7 · Bloque 4 (Jesús) · HU-16: impedimentos del Sprint.
const conexion = require('../base_de_datos/conexion');

const consultar = async (sql, parametros) => (await conexion.promise().query(sql, parametros))[0];

// Todos los impedimentos del proyecto (activos y resueltos): así se conserva el historial.
const listar = async (idProyecto) => consultar(
    `SELECT i.id_impedimento, i.titulo, i.descripcion, i.impacto, i.estado, i.solucion,
            i.id_sprint, s.numero AS sprint_numero, s.nombre AS sprint_nombre,
            i.id_autor, COALESCE(a.nombre, 'Usuario eliminado') AS autor,
            COALESCE(r.nombre, NULL) AS resolutor,
            DATE_FORMAT(i.fecha_registro, '%Y-%m-%d %H:%i') AS fecha_registro,
            DATE_FORMAT(i.fecha_resolucion, '%Y-%m-%d %H:%i') AS fecha_resolucion
     FROM impedimentos i
     LEFT JOIN sprints s ON s.id_sprint = i.id_sprint
     LEFT JOIN usuarios a ON a.id_usuario = i.id_autor
     LEFT JOIN usuarios r ON r.id_usuario = i.id_resolutor
     WHERE i.id_proyecto = ?
     ORDER BY i.estado = 'Resuelto', i.fecha_registro DESC, i.id_impedimento DESC`,
    [idProyecto]
);

const sprintEsDelProyecto = async (idProyecto, idSprint) => (await consultar(
    'SELECT 1 FROM sprints WHERE id_sprint = ? AND id_proyecto = ?',
    [idSprint, idProyecto]
)).length > 0;

const crear = async (idProyecto, idAutor, datos) => {
    const [resultado] = await conexion.promise().query(
        `INSERT INTO impedimentos (id_proyecto, id_sprint, titulo, descripcion, impacto, id_autor)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idProyecto, datos.id_sprint, datos.titulo, datos.descripcion, datos.impacto, idAutor]
    );
    return resultado.insertId;
};

const obtener = async (idProyecto, idImpedimento) => (await consultar(
    'SELECT id_impedimento, id_autor, estado FROM impedimentos WHERE id_impedimento = ? AND id_proyecto = ?',
    [idImpedimento, idProyecto]
))[0] || null;

// Solo resuelve si sigue activo (dos personas no lo resuelven a la vez).
const resolver = async (idProyecto, idImpedimento, idResolutor, solucion) => {
    const [resultado] = await conexion.promise().query(
        `UPDATE impedimentos
         SET estado = 'Resuelto', solucion = ?, id_resolutor = ?, fecha_resolucion = NOW()
         WHERE id_impedimento = ? AND id_proyecto = ? AND estado = 'Activo'`,
        [solucion, idResolutor, idImpedimento, idProyecto]
    );
    return resultado.affectedRows > 0;
};

module.exports = { listar, sprintEsDelProyecto, crear, obtener, resolver };
