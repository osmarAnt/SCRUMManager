const conexion = require('../base_de_datos/conexion');

const registrar = async (idUsuario, tipoCapacitacion, idIntento) => {
    // Reintentar el mismo guardado no debe sumar otra capacitación.
    await conexion.promise().execute(`
        INSERT INTO capacitaciones_completadas
            (id_usuario, tipo_capacitacion, id_intento)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE id_registro = id_registro
    `, [idUsuario, tipoCapacitacion, idIntento]);
};

const consultarTotales = async (idUsuario) => {
    const [filas] = await conexion.promise().execute(`
        SELECT tipo_capacitacion, COUNT(*) AS total
        FROM capacitaciones_completadas
        WHERE id_usuario = ?
        GROUP BY tipo_capacitacion
    `, [idUsuario]);

    const totales = {
        SCRUM_MASTER: 0,
        PRODUCT_OWNER: 0,
        DESARROLLADOR: 0
    };

    filas.forEach(fila => {
        totales[fila.tipo_capacitacion] = Number(fila.total);
    });

    return totales;
};

module.exports = { registrar, consultarTotales };
