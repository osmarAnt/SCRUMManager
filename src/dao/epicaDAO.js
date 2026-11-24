// Sprint 7 · Bloque 2 (César) · HU-07: épicas del proyecto.
const conexion = require('../base_de_datos/conexion');

const consultar = async (sql, parametros) => (await conexion.promise().query(sql, parametros))[0];

// Épicas del proyecto con cuántas historias tiene cada una.
const listar = async (idProyecto) => consultar(
    `SELECT e.id_epica, e.nombre, e.color, e.descripcion,
            DATE_FORMAT(e.fecha_creacion, '%Y-%m-%d') AS fecha_creacion,
            (SELECT COUNT(*) FROM product_backlog h WHERE h.id_epica = e.id_epica) AS total_historias
     FROM epicas e
     WHERE e.id_proyecto = ?
     ORDER BY e.nombre ASC`,
    [idProyecto]
);

// Devuelve { id_epica } o { duplicada: true } si ya hay una épica con ese nombre en el proyecto.
const crear = async (idProyecto, idAutor, { nombre, color, descripcion }) => {
    try {
        const [resultado] = await conexion.promise().query(
            `INSERT INTO epicas (id_proyecto, nombre, color, descripcion, id_autor)
             VALUES (?, ?, ?, ?, ?)`,
            [idProyecto, nombre, color, descripcion, idAutor]
        );
        return { id_epica: resultado.insertId };
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return { duplicada: true };
        throw error;
    }
};

const existeEnProyecto = async (idProyecto, idEpica) => {
    const filas = await consultar(
        'SELECT 1 FROM epicas WHERE id_epica = ? AND id_proyecto = ? LIMIT 1',
        [idEpica, idProyecto]
    );
    return filas.length > 0;
};

module.exports = { listar, crear, existeEnProyecto };
