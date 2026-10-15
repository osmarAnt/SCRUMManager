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
        if (resultados.length === 0) {
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

module.exports = {
    buscarPorCredenciales
};
