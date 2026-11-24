// Sprint 7 · Bloque 3 (Francisco) · HU-10: Definition of Done por historia y por Sprint.
const conexion = require('../base_de_datos/conexion');

const consultar = async (sql, parametros) => (await conexion.promise().query(sql, parametros))[0];
const booleano = (fila) => ({ ...fila, cumplido: Boolean(fila.cumplido) });

const historiaDelProyecto = async (idProyecto, idHistoria) => {
    const filas = await consultar(
        `SELECT id_historia, titulo, id_sprint, id_responsable, estado_historia
         FROM product_backlog WHERE id_historia = ? AND id_proyecto = ?`,
        [idHistoria, idProyecto]
    );
    return filas[0] || null;
};

const sprintDelProyecto = async (idProyecto, idSprint) => {
    const filas = await consultar(
        'SELECT id_sprint, numero, estado FROM sprints WHERE id_sprint = ? AND id_proyecto = ?',
        [idSprint, idProyecto]
    );
    return filas[0] || null;
};

const listarDeHistoria = async (idHistoria) => (await consultar(
    'SELECT id_requisito, descripcion, cumplido FROM dod_requisitos WHERE id_historia = ? ORDER BY id_requisito',
    [idHistoria]
)).map(booleano);

const listarDeSprint = async (idSprint) => (await consultar(
    'SELECT id_requisito, descripcion, cumplido FROM dod_requisitos WHERE id_sprint = ? ORDER BY id_requisito',
    [idSprint]
)).map(booleano);

const criteriosDeHistoria = async (idHistoria) => (await consultar(
    'SELECT id_criterio, descripcion, completado FROM criterios_aceptacion WHERE id_historia = ? ORDER BY id_criterio',
    [idHistoria]
)).map((fila) => ({ ...fila, completado: Boolean(fila.completado) }));

// destino: { id_historia } o { id_sprint } (nunca ambos).
const agregar = async (idProyecto, destino, descripcion) => {
    const [resultado] = await conexion.promise().query(
        'INSERT INTO dod_requisitos (id_proyecto, id_sprint, id_historia, descripcion) VALUES (?, ?, ?, ?)',
        [idProyecto, destino.id_sprint ?? null, destino.id_historia ?? null, descripcion]
    );
    return { id_requisito: resultado.insertId, descripcion, cumplido: false };
};

// Requisito con los datos de su historia o Sprint (para revisar permisos y bloqueos).
const obtener = async (idProyecto, idRequisito) => {
    const filas = await consultar(
        `SELECT d.id_requisito, d.id_sprint, d.id_historia, d.descripcion, d.cumplido,
                h.id_responsable, h.estado_historia, s.estado AS estado_sprint
         FROM dod_requisitos d
         LEFT JOIN product_backlog h ON h.id_historia = d.id_historia
         LEFT JOIN sprints s ON s.id_sprint = d.id_sprint
         WHERE d.id_requisito = ? AND d.id_proyecto = ?`,
        [idRequisito, idProyecto]
    );
    return filas[0] ? booleano(filas[0]) : null;
};

const marcar = async (idRequisito, cumplido) => {
    await conexion.promise().query(
        'UPDATE dod_requisitos SET cumplido = ? WHERE id_requisito = ?',
        [cumplido, idRequisito]
    );
};

const eliminar = async (idRequisito) => {
    await conexion.promise().query('DELETE FROM dod_requisitos WHERE id_requisito = ?', [idRequisito]);
};

module.exports = {
    historiaDelProyecto,
    sprintDelProyecto,
    listarDeHistoria,
    listarDeSprint,
    criteriosDeHistoria,
    agregar,
    obtener,
    marcar,
    eliminar
};
