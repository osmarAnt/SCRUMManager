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

// PB-04: crea el proyecto y registra al creador como Scrum Master en una sola transacción.
const crearProyecto = async (nombre, objetivo, idUsuario) => {
    const transaccion = await conexion.crearConexion();
    try {
        await transaccion.beginTransaction();
        const [resultado] = await transaccion.query(
            'INSERT INTO proyectos (nombre, objetivo) VALUES (?, ?)',
            [nombre, objetivo]
        );
        await transaccion.query(
            `INSERT INTO proyecto_usuarios (id_proyecto, id_usuario, rol)
             VALUES (?, ?, 'Scrum Master')`,
            [resultado.insertId, idUsuario]
        );
        await transaccion.commit();
        return resultado.insertId;
    } catch (error) {
        await transaccion.rollback().catch(() => {});
        throw error;
    } finally {
        await transaccion.end().catch(() => {});
    }
};

// Devuelve el rol del usuario dentro del proyecto, o null si no pertenece a él.
const obtenerRolEnProyecto = async (idProyecto, idUsuario) => {
    const [filas] = await conexion.promise().query(
        `SELECT pu.rol
         FROM proyecto_usuarios pu
         INNER JOIN proyectos p ON p.id_proyecto = pu.id_proyecto
         WHERE pu.id_proyecto = ?
         AND pu.id_usuario = ?
         AND pu.activo = TRUE
         AND p.activo = TRUE`,
        [idProyecto, idUsuario]
    );
    return filas.length ? filas[0].rol : null;
};

// PB-05: consulta de un proyecto.
const obtenerPorId = async (idProyecto) => {
    const [filas] = await conexion.promise().query(
        `SELECT id_proyecto, nombre, objetivo
         FROM proyectos
         WHERE id_proyecto = ? AND activo = TRUE`,
        [idProyecto]
    );
    return filas[0] || null;
};

// PB-05: actualización de nombre y objetivo.
const actualizarProyecto = async (idProyecto, nombre, objetivo) => {
    const [resultado] = await conexion.promise().query(
        `UPDATE proyectos SET nombre = ?, objetivo = ?
         WHERE id_proyecto = ? AND activo = TRUE`,
        [nombre, objetivo, idProyecto]
    );
    return resultado.affectedRows > 0;
};

module.exports = {
    listarPorUsuario,
    crearProyecto,
    obtenerRolEnProyecto,
    obtenerPorId,
    actualizarProyecto
};
