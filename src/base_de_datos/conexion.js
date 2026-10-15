const mysql = require('mysql2');
const mysqlPromesas = require('mysql2/promise');

const configuracion = {
    host: 'localhost',
    user: 'userScrument',
    password: 'scrument123',
    database: 'scrument'
};

const conexion = mysql.createConnection(configuracion);

conexion.connect((error) => {
    if (error) {
        console.error('No jaló:', error.message);
        return;
    }
    console.log('Si jaló');
});

conexion.crearConexion = () => {
    return mysqlPromesas.createConnection(configuracion);
};

module.exports = conexion;
