const conexion = require('../base_de_datos/conexion');
const Usuario = require('../entidades/Usuario');

const buscarPorCredenciales = (username, password, callback) => {
    const consulta = `
        SELECT *
        FROM usuarios
        WHERE username = ?
        AND password = ?
        AND activo = TRUE
    `;
    conexion.query(consulta, [username, password], (error, resultados) => {
        if (error) {
            return callback(error, null);
        }
        if (resultados.length === 0 || resultados[0].password !== password) {
            return callback(null, null);
        }
        const datos = resultados[0];
        const usuario = new Usuario(
            datos.id_usuario,
            datos.nombre,
            datos.username,
            datos.password,
            datos.rol,
            datos.activo
        );
        callback(null, usuario);
    });
};

const crearUsuario = (nombre, username, password, callback) => {
    const consulta = `
        INSERT INTO usuarios (nombre, username, password, rol)
        VALUES (?, ?, ?, 'Desarrollador')
    `;
    conexion.query(consulta, [nombre, username, password], (error, resultado) => {
        if (error) {
            return callback(error, null);
        }
        callback(null, resultado.insertId);
    });
};

module.exports = {
    buscarPorCredenciales,
    crearUsuario
};