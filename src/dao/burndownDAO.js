const conexion = require('../base_de_datos/conexion');
const { ESTADOS_COMPLETADOS, listarFechas } = require('../utilidades/burndown');

const MARCAS_COMPLETADOS = ESTADOS_COMPLETADOS.map(() => '?').join(', ');

// "Hoy" según la base de datos, en el mismo formato y zona horaria que las columnas DATE.
const obtenerHoy = async () => {
    const [[fila]] = await conexion.promise().query(
        "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoy"
    );
    return fila.hoy;
};

// Puntos actuales de un Sprint, calculados a partir del estado de sus historias (nunca se capturan a mano).
const calcularPuntos = async (idSprint) => {
    const [[fila]] = await conexion.promise().query(
        `SELECT
            COALESCE(SUM(puntos), 0) AS total,
            COALESCE(SUM(CASE WHEN estado_historia IN (${MARCAS_COMPLETADOS}) THEN puntos ELSE 0 END), 0) AS completados
         FROM product_backlog
         WHERE id_sprint = ?`,
        [...ESTADOS_COMPLETADOS, idSprint]
    );
    const total = Number(fila.total);
    const completados = Number(fila.completados);
    return {
        puntos_totales: total,
        puntos_completados: completados,
        puntos_restantes: total - completados
    };
};

const guardarFila = async (idSprint, fecha, puntos) => {
    await conexion.promise().query(
        `INSERT INTO burndown_historial
            (id_sprint, fecha, puntos_totales, puntos_completados, puntos_restantes)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            puntos_totales = VALUES(puntos_totales),
            puntos_completados = VALUES(puntos_completados),
            puntos_restantes = VALUES(puntos_restantes)`,
        [idSprint, fecha, puntos.puntos_totales, puntos.puntos_completados, puntos.puntos_restantes]
    );
};

const listarHistorial = async (idSprint) => {
    const [filas] = await conexion.promise().query(
        `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
                puntos_totales, puntos_completados, puntos_restantes
         FROM burndown_historial
         WHERE id_sprint = ?
         ORDER BY fecha ASC`,
        [idSprint]
    );
    return filas;
};

// Guarda la "foto" de hoy de TODOS los Sprints que todavía no terminan (los pasados quedan congelados).
// Se llama automáticamente después de cada cambio en historias, estados, puntos o revisiones.
const registrarSprintsVigentes = async () => {
    await conexion.promise().query(
        `INSERT INTO burndown_historial
            (id_sprint, fecha, puntos_totales, puntos_completados, puntos_restantes)
         SELECT s.id_sprint, CURDATE(),
                COALESCE(SUM(h.puntos), 0),
                COALESCE(SUM(CASE WHEN h.estado_historia IN (${MARCAS_COMPLETADOS}) THEN h.puntos ELSE 0 END), 0),
                COALESCE(SUM(h.puntos), 0)
                    - COALESCE(SUM(CASE WHEN h.estado_historia IN (${MARCAS_COMPLETADOS}) THEN h.puntos ELSE 0 END), 0)
         FROM sprints s
         LEFT JOIN product_backlog h ON h.id_sprint = s.id_sprint
         WHERE s.fecha_fin >= CURDATE()
         GROUP BY s.id_sprint
         ON DUPLICATE KEY UPDATE
            puntos_totales = VALUES(puntos_totales),
            puntos_completados = VALUES(puntos_completados),
            puntos_restantes = VALUES(puntos_restantes)`,
        [...ESTADOS_COMPLETADOS, ...ESTADOS_COMPLETADOS]
    );
};

// Deja el historial del Sprint al día y lo devuelve ordenado por fecha, junto con los puntos actuales.
//  1. Guarda (o actualiza) la foto de hoy mientras el Sprint no haya terminado.
//  2. Los días que nadie registró (sin cambios ni consultas) repiten el último valor conocido, porque sin
//     cambios los puntos no se mueven. Se guardan para que el historial quede completo.
const sincronizarSprint = async (sprint, hoy) => {
    const actuales = await calcularPuntos(sprint.id_sprint);
    if (hoy <= sprint.fecha_fin) {
        await guardarFila(sprint.id_sprint, hoy, actuales);
    }

    let filas = await listarHistorial(sprint.id_sprint);
    const ultimoDia = hoy < sprint.fecha_fin ? hoy : sprint.fecha_fin;

    if (ultimoDia >= sprint.fecha_inicio) {
        const porFecha = new Map(filas.map((fila) => [fila.fecha, fila]));
        let anterior = filas.filter((fila) => fila.fecha < sprint.fecha_inicio).pop() || null;
        const primeraDelSprint = filas.find(
            (fila) => fila.fecha >= sprint.fecha_inicio && fila.fecha <= ultimoDia
        ) || null;
        const nuevas = [];

        listarFechas(sprint.fecha_inicio, ultimoDia).forEach((fecha) => {
            const existente = porFecha.get(fecha);
            if (existente) {
                anterior = existente;
                return;
            }
            const origen = anterior || primeraDelSprint || actuales;
            const fila = {
                fecha,
                puntos_totales: origen.puntos_totales,
                puntos_completados: origen.puntos_completados,
                puntos_restantes: origen.puntos_restantes
            };
            nuevas.push(fila);
            anterior = fila;
        });

        for (const fila of nuevas) {
            await conexion.promise().query(
                `INSERT IGNORE INTO burndown_historial
                    (id_sprint, fecha, puntos_totales, puntos_completados, puntos_restantes)
                 VALUES (?, ?, ?, ?, ?)`,
                [sprint.id_sprint, fila.fecha, fila.puntos_totales, fila.puntos_completados, fila.puntos_restantes]
            );
        }
        if (nuevas.length) {
            filas = await listarHistorial(sprint.id_sprint);
        }
    }

    return { historial: filas, actuales };
};

module.exports = {
    obtenerHoy,
    calcularPuntos,
    registrarSprintsVigentes,
    sincronizarSprint
};
