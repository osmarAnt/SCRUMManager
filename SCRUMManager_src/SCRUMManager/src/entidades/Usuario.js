class Usuario {
    constructor(id_usuario, nombre, username, password, rol, activo) {
        this.id_usuario = id_usuario;
        this.nombre = nombre;
        this.username = username;
        this.password = password;
        this.rol = rol;
        this.activo = activo;
    }
}

module.exports = Usuario;
