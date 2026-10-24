const conexion = require('../base_de_datos/conexion');
const { MAXIMO_ARCHIVOS_POR_HISTORIA } = require('../utilidades/evidencias');

// PB-57: en qué estados de la historia se pueden adjuntar o quitar archivos,
// y desde cuáles se puede enviar a revisión.
const ESTADOS_EDITABLES = ['En curso', 'Terminada', 'Rechazada'];
const ESTADOS_ENVIABLES = ['Terminada', 'Rechazada'];

const fallo = (status, mensaje) => {
    const error = new Error(mensaje);
    error.status = status;
    return error;
};

// Mensaje claro según el estado en que está la historia.
const explicarEstado = (estado) => {
    switch (estado) {
        case 'Pendiente':
            return 'La historia todavía no se inicia. Márcala como "En curso" para adjuntar evidencias.';
        case 'En revision':
            return 'La historia está en revisión; ya no puedes cambiar sus archivos hasta que el Product Owner decida.';
        case 'Aprobada':
            return 'La historia ya fue aprobada por el Product Owner.';
        default:
            return 'La historia no admite cambios en este estado.';
    }
};

const consultar = async (sql, parametros) => (await conexion.promise().query(sql, parametros))[0];

// Datos de la historia y sus evidencias (sin bloquear). Devuelve null si no existe en el proyecto.
const obtenerContexto = async (idProyecto, idHistoria) => {
    const historias = await consultar(
        `SELECT id_historia, titulo, estado_historia, id_responsable
         FROM product_backlog WHERE id_historia = ? AND id_proyecto = ?`,
        [idHistoria, idProyecto]
    );
    if (!historias.length) {
        return null;
    }
    const evidencias = await consultar(
        `SELECT e.id_evidencia, e.nombre_original, e.tipo_mime, e.tamano_bytes,
                DATE_FORMAT(e.fecha_subida, '%Y-%m-%d %H:%i') AS fecha_subida,
                u.nombre AS subido_por
         FROM evidencias_historia e
         LEFT JOIN usuarios u ON u.id_usuario = e.id_usuario
         WHERE e.id_historia = ? ORDER BY e.id_evidencia`,
        [idHistoria]
    );
    return { historia: historias[0], evidencias };
};

// Ejecuta una operación dentro de una transacción con la historia bloqueada, comprobando que
// siga existiendo y que el usuario sea su responsable.
const conHistoriaBloqueada = async (idProyecto, idHistoria, idUsuario, operacion) => {
    const transaccion = await conexion.crearConexion();
    try {
        await transaccion.beginTransaction();
        const [historias] = await transaccion.query(
            `SELECT estado_historia, id_responsable FROM product_backlog
             WHERE id_historia = ? AND id_proyecto = ? FOR UPDATE`,
            [idHistoria, idProyecto]
        );
        if (!historias.length) {
            throw fallo(404, 'No encontramos esa historia.');
        }
        if (Number(historias[0].id_responsable) !== Number(idUsuario)) {
            throw fallo(403, 'Solo el responsable de la historia puede gestionar sus evidencias.');
        }
        const resultado = await operacion(transaccion, historias[0].estado_historia);
        await transaccion.commit();
        return resultado;
    } catch (error) {
        await transaccion.rollback().catch(() => {});
        throw error;
    } finally {
        await transaccion.end().catch(() => {});
    }
};

const contarEvidencias = async (transaccion, idHistoria) => {
    const [[{ total }]] = await transaccion.query(
        'SELECT COUNT(*) AS total FROM evidencias_historia WHERE id_historia = ?',
        [idHistoria]
    );
    return Number(total);
};

// Registra un archivo ya guardado en disco.
const registrarEvidencia = (idProyecto, idHistoria, idUsuario, archivo) =>
    conHistoriaBloqueada(idProyecto, idHistoria, idUsuario, async (transaccion, estado) => {
        if (!ESTADOS_EDITABLES.includes(estado)) {
            throw fallo(409, explicarEstado(estado));
        }
        if (await contarEvidencias(transaccion, idHistoria) >= MAXIMO_ARCHIVOS_POR_HISTORIA) {
            throw fallo(409, `Una historia admite hasta ${MAXIMO_ARCHIVOS_POR_HISTORIA} archivos. Quita alguno para adjuntar otro.`);
        }
        const [resultado] = await transaccion.query(
            `INSERT INTO evidencias_historia
                (id_historia, id_usuario, nombre_original, nombre_archivo, tipo_mime, tamano_bytes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [idHistoria, idUsuario, archivo.nombreOriginal, archivo.nombreArchivo, archivo.tipoMime, archivo.tamano]
        );
        return {
            id_evidencia: resultado.insertId,
            nombre_original: archivo.nombreOriginal,
            tipo_mime: archivo.tipoMime,
            tamano_bytes: archivo.tamano
        };
    });

// Quita un archivo de la historia; devuelve el nombre guardado en disco para que se borre.
const eliminarEvidencia = (idProyecto, idHistoria, idUsuario, idEvidencia) =>
    conHistoriaBloqueada(idProyecto, idHistoria, idUsuario, async (transaccion, estado) => {
        if (!ESTADOS_EDITABLES.includes(estado)) {
            throw fallo(409, explicarEstado(estado));
        }
        const [evidencias] = await transaccion.query(
            'SELECT nombre_archivo FROM evidencias_historia WHERE id_evidencia = ? AND id_historia = ?',
            [idEvidencia, idHistoria]
        );
        if (!evidencias.length) {
            throw fallo(404, 'No encontramos ese archivo.');
        }
        await transaccion.query('DELETE FROM evidencias_historia WHERE id_evidencia = ?', [idEvidencia]);
        return { nombre_archivo: evidencias[0].nombre_archivo };
    });

// Envía la historia a revisión: debe estar terminada (o rechazada, si es una corrección) y
// tener al menos una evidencia. Pasa a 'En revision' para que el Product Owner la consulte (PB-19).
const enviarARevision = (idProyecto, idHistoria, idUsuario) =>
    conHistoriaBloqueada(idProyecto, idHistoria, idUsuario, async (transaccion, estado) => {
        if (!ESTADOS_ENVIABLES.includes(estado)) {
            throw fallo(
                409,
                estado === 'En curso'
                    ? 'Marca la historia como "Terminado" antes de enviarla a revisión.'
                    : explicarEstado(estado)
            );
        }
        if (await contarEvidencias(transaccion, idHistoria) < 1) {
            throw fallo(409, 'Adjunta al menos un archivo de evidencia antes de enviar la historia a revisión.');
        }
        await transaccion.query(
            "UPDATE product_backlog SET estado_historia = 'En revision' WHERE id_historia = ?",
            [idHistoria]
        );
        return { estado_historia: 'En revision' };
    });

module.exports = {
    ESTADOS_EDITABLES,
    ESTADOS_ENVIABLES,
    explicarEstado,
    obtenerContexto,
    registrarEvidencia,
    eliminarEvidencia,
    enviarARevision
};
