const conexion = require('../base_de_datos/conexion');

// Cualquier integrante del proyecto puede consultar las reuniones.
// La fecha se entrega como texto 'AAAA-MM-DD HH:MM' (sin zona horaria) para que no se mueva la hora.
const listarPorProyecto = async (idProyecto) => {
    const [filas] = await conexion.promise().query(
        `SELECT r.id_reunion, r.titulo, r.tipo, r.descripcion,
                DATE_FORMAT(r.fecha_reunion, '%Y-%m-%d %H:%i') AS fecha_reunion,
                r.modalidad, r.lugar_enlace, r.fecha_creacion,
                COALESCE(u.nombre, 'Usuario eliminado') AS autor,
                u.username AS username_autor
         FROM reuniones r
         LEFT JOIN usuarios u ON u.id_usuario = r.id_autor
         WHERE r.id_proyecto = ?
         ORDER BY r.fecha_reunion ASC, r.id_reunion ASC`,
        [idProyecto]
    );
    return filas;
};

// Solo el Scrum Master activo del proyecto puede crear reuniones: si el rol no coincide no se inserta nada
// (affectedRows = 0), aunque alguien llame a la API directamente.
const crear = async (idProyecto, idAutor, datos) => {
    const [resultado] = await conexion.promise().query(
        `INSERT INTO reuniones
            (id_proyecto, id_autor, titulo, tipo, descripcion, fecha_reunion, modalidad, lugar_enlace)
         SELECT pu.id_proyecto, pu.id_usuario, ?, ?, ?, ?, ?, ?
         FROM proyecto_usuarios pu
         INNER JOIN proyectos p ON p.id_proyecto = pu.id_proyecto
         INNER JOIN usuarios u ON u.id_usuario = pu.id_usuario
         WHERE pu.id_proyecto = ? AND pu.id_usuario = ?
         AND pu.rol = 'Scrum Master' AND pu.activo = TRUE
         AND p.activo = TRUE AND u.activo = TRUE`,
        [datos.titulo, datos.tipo, datos.descripcion, datos.fecha, datos.modalidad, datos.lugar_enlace, idProyecto, idAutor]
    );
    return resultado;
};

// Sprint 7 · Bloque 6 (Emmanuel) · HU-17: el Scrum Master edita o elimina una reunión.
const actualizar = async (idProyecto, idReunion, datos) => {
    const [resultado] = await conexion.promise().query(
        `UPDATE reuniones
         SET titulo = ?, tipo = ?, descripcion = ?, fecha_reunion = ?, modalidad = ?, lugar_enlace = ?
         WHERE id_reunion = ? AND id_proyecto = ?`,
        [datos.titulo, datos.tipo, datos.descripcion, datos.fecha, datos.modalidad, datos.lugar_enlace, idReunion, idProyecto]
    );
    return resultado.affectedRows > 0;
};

const existe = async (idProyecto, idReunion) => {
    const [filas] = await conexion.promise().query(
        'SELECT 1 FROM reuniones WHERE id_reunion = ? AND id_proyecto = ?',
        [idReunion, idProyecto]
    );
    return filas.length > 0;
};

const eliminar = async (idProyecto, idReunion) => {
    const [resultado] = await conexion.promise().query(
        'DELETE FROM reuniones WHERE id_reunion = ? AND id_proyecto = ?',
        [idReunion, idProyecto]
    );
    return resultado.affectedRows > 0;
};

module.exports = {
    listarPorProyecto,
    crear,
    actualizar,
    existe,
    eliminar
};
