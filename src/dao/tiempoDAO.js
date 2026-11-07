const conexion = require('../base_de_datos/conexion');
const { sumarHoras } = require('../utilidades/tiempos');

const consultar = async (sql, parametros) => (await conexion.promise().query(sql, parametros))[0];

// PB-32: guarda el registro SOLO si la historia es de ese proyecto y está asignada a ese usuario.
// Una sola sentencia (INSERT ... SELECT): no hay hueco entre comprobar y guardar.
// Devuelve { registrado: true, id_registro, titulo }, { noEncontrada: true } o { sinPermiso: true }.
const registrar = async (idProyecto, idHistoria, idUsuario, horas, fecha) => {
    const [resultado] = await conexion.promise().query(
        `INSERT INTO registros_tiempo (id_historia, id_usuario, fecha_trabajo, horas)
         SELECT h.id_historia, ?, ?, ?
         FROM product_backlog h
         WHERE h.id_historia = ? AND h.id_proyecto = ? AND h.id_responsable = ?`,
        [idUsuario, fecha, horas, idHistoria, idProyecto, idUsuario]
    );
    const historias = await consultar(
        'SELECT titulo, id_responsable FROM product_backlog WHERE id_historia = ? AND id_proyecto = ?',
        [idHistoria, idProyecto]
    );
    if (resultado.affectedRows === 1) {
        return { registrado: true, id_registro: resultado.insertId, titulo: historias[0].titulo };
    }
    return historias.length ? { sinPermiso: true } : { noEncontrada: true };
};

// PB-32: lo que necesita el desarrollador para registrar: sus historias asignadas en el proyecto
// y SUS registros más recientes (nunca los de otros).
const obtenerMisTiempos = async (idProyecto, idUsuario) => {
    const [historias, registros, totales] = await Promise.all([
        consultar(
            `SELECT h.id_historia, h.titulo, h.estado_historia, s.numero AS sprint_numero,
                    (SELECT COALESCE(SUM(t.horas), 0) FROM registros_tiempo t
                      WHERE t.id_historia = h.id_historia AND t.id_usuario = ?) AS mis_horas
             FROM product_backlog h
             LEFT JOIN sprints s ON s.id_sprint = h.id_sprint
             WHERE h.id_proyecto = ? AND h.id_responsable = ?
             ORDER BY h.id_historia`,
            [idUsuario, idProyecto, idUsuario]
        ),
        consultar(
            `SELECT t.id_registro, t.id_historia, h.titulo,
                    DATE_FORMAT(t.fecha_trabajo, '%Y-%m-%d') AS fecha_trabajo, t.horas
             FROM registros_tiempo t
             INNER JOIN product_backlog h ON h.id_historia = t.id_historia
             WHERE h.id_proyecto = ? AND t.id_usuario = ?
             ORDER BY t.fecha_trabajo DESC, t.id_registro DESC
             LIMIT 30`,
            [idProyecto, idUsuario]
        ),
        consultar(
            `SELECT COALESCE(SUM(t.horas), 0) AS total, COUNT(*) AS registros
             FROM registros_tiempo t
             INNER JOIN product_backlog h ON h.id_historia = t.id_historia
             WHERE h.id_proyecto = ? AND t.id_usuario = ?`,
            [idProyecto, idUsuario]
        )
    ]);
    return {
        historias: historias.map((h) => ({ ...h, mis_horas: sumarHoras([h.mis_horas]) })),
        registros: registros.map((r) => ({ ...r, horas: Number(r.horas) })),
        total_horas: sumarHoras([totales[0].total]),
        total_registros: Number(totales[0].registros)
    };
};

// PB-33: resumen del proyecto. Se leen las historias, los desarrolladores y los registros agrupados
// por (historia, desarrollador); ambos totales se calculan desde esos mismos datos, así que
// la tabla por historia y la tabla por desarrollador siempre suman lo mismo.
const obtenerResumen = async (idProyecto) => {
    const [historias, integrantes, desglose] = await Promise.all([
        // Historias del Sprint (aunque aún no tengan horas) y cualquier otra que ya tenga registros.
        consultar(
            `SELECT h.id_historia, h.titulo, h.puntos, h.estado_historia,
                    s.numero AS sprint_numero, u.nombre AS responsable
             FROM product_backlog h
             LEFT JOIN sprints s ON s.id_sprint = h.id_sprint
             LEFT JOIN usuarios u ON u.id_usuario = h.id_responsable
             WHERE h.id_proyecto = ?
               AND (h.id_sprint IS NOT NULL
                    OR EXISTS (SELECT 1 FROM registros_tiempo t WHERE t.id_historia = h.id_historia))
             ORDER BY s.numero, h.id_historia`,
            [idProyecto]
        ),
        consultar(
            `SELECT u.id_usuario, u.nombre, u.username
             FROM proyecto_usuarios pu
             INNER JOIN usuarios u ON u.id_usuario = pu.id_usuario
             WHERE pu.id_proyecto = ? AND pu.rol = 'Desarrollador' AND pu.activo = TRUE`,
            [idProyecto]
        ),
        consultar(
            `SELECT t.id_historia, t.id_usuario, u.nombre, u.username,
                    SUM(t.horas) AS horas, COUNT(*) AS registros,
                    DATE_FORMAT(MAX(t.fecha_trabajo), '%Y-%m-%d') AS ultima_fecha
             FROM registros_tiempo t
             INNER JOIN product_backlog h ON h.id_historia = t.id_historia
             INNER JOIN usuarios u ON u.id_usuario = t.id_usuario
             WHERE h.id_proyecto = ?
             GROUP BY t.id_historia, t.id_usuario, u.nombre, u.username`,
            [idProyecto]
        )
    ]);

    // --- Por historia ---
    const porHistoria = historias.map((historia) => {
        const filas = desglose
            .filter((fila) => fila.id_historia === historia.id_historia)
            .sort((a, b) => Number(b.horas) - Number(a.horas));
        return {
            ...historia,
            horas_totales: sumarHoras(filas.map((fila) => fila.horas)),
            total_registros: filas.reduce((total, fila) => total + Number(fila.registros), 0),
            desarrolladores: filas.map((fila) => ({
                id_usuario: fila.id_usuario,
                nombre: fila.nombre,
                horas: sumarHoras([fila.horas])
            }))
        };
    }).sort((a, b) =>
        b.horas_totales - a.horas_totales || (a.sprint_numero ?? 0) - (b.sprint_numero ?? 0) || a.id_historia - b.id_historia
    );

    // --- Por desarrollador: los integrantes actuales (aunque no tengan horas) y quien tenga
    // registros aunque ya no esté en el proyecto (sus horas no se pierden). ---
    const personas = new Map(integrantes.map((i) => [i.id_usuario, { ...i, es_integrante: true }]));
    desglose.forEach((fila) => {
        if (!personas.has(fila.id_usuario)) {
            personas.set(fila.id_usuario, {
                id_usuario: fila.id_usuario, nombre: fila.nombre, username: fila.username, es_integrante: false
            });
        }
    });
    const porDesarrollador = [...personas.values()].map((persona) => {
        const filas = desglose.filter((fila) => fila.id_usuario === persona.id_usuario);
        return {
            ...persona,
            horas_totales: sumarHoras(filas.map((fila) => fila.horas)),
            total_registros: filas.reduce((total, fila) => total + Number(fila.registros), 0),
            historias_trabajadas: filas.length,
            ultima_fecha: filas.map((fila) => fila.ultima_fecha).sort().pop() || null
        };
    }).sort((a, b) => b.horas_totales - a.horas_totales || a.nombre.localeCompare(b.nombre, 'es'));

    return {
        totales: {
            horas: sumarHoras(desglose.map((fila) => fila.horas)),
            registros: desglose.reduce((total, fila) => total + Number(fila.registros), 0),
            historias_con_horas: new Set(desglose.map((fila) => fila.id_historia)).size,
            desarrolladores_con_horas: new Set(desglose.map((fila) => fila.id_usuario)).size
        },
        por_historia: porHistoria,
        por_desarrollador: porDesarrollador
    };
};

module.exports = {
    registrar,
    obtenerMisTiempos,
    obtenerResumen
};
