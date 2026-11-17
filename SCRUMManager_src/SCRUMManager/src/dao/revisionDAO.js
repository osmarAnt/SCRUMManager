const conexion = require('../base_de_datos/conexion');

// Estados de una historia que forman parte del flujo de revisión.
const ESTADOS_EN_REVISION_O_REVISADA = ['En revision', 'Aprobada', 'Rechazada'];

const FORMATO_FECHA = "'%Y-%m-%d %H:%i'";

// PB-19: historias enviadas a revisión (primero las pendientes de revisar) y las ya revisadas,
// con los conteos que se muestran en la lista.
const listarParaRevision = async (idProyecto) => {
    const [filas] = await conexion.promise().query(
        `SELECT h.id_historia, h.titulo, h.puntos, h.prioridad, h.estado_historia,
                s.numero AS sprint_numero,
                u.nombre AS responsable,
                (SELECT COUNT(*) FROM evidencias_historia e
                  WHERE e.id_historia = h.id_historia) AS total_evidencias,
                (SELECT COUNT(*) FROM criterios_aceptacion c
                  WHERE c.id_historia = h.id_historia) AS total_criterios,
                (SELECT COUNT(*) FROM criterios_aceptacion c
                  WHERE c.id_historia = h.id_historia AND c.completado = TRUE) AS criterios_cumplidos,
                r.decision AS ultima_decision,
                DATE_FORMAT(r.fecha_revision, ${FORMATO_FECHA}) AS fecha_ultima_revision
         FROM product_backlog h
         LEFT JOIN sprints s ON s.id_sprint = h.id_sprint
         LEFT JOIN usuarios u ON u.id_usuario = h.id_responsable
         LEFT JOIN revisiones_historia r ON r.id_revision = (
             SELECT MAX(id_revision) FROM revisiones_historia WHERE id_historia = h.id_historia
         )
         WHERE h.id_proyecto = ?
           AND h.estado_historia IN (?)
         ORDER BY (h.estado_historia = 'En revision') DESC, h.id_historia DESC`,
        [idProyecto, ESTADOS_EN_REVISION_O_REVISADA]
    );
    return filas;
};

// PB-19: al abrir la revisión se ven criterios, archivos (evidencias), responsable e historial.
// Devuelve null si la historia no existe en el proyecto o no está en el flujo de revisión.
const obtenerDetalle = async (idProyecto, idHistoria) => {
    const consultar = async (sql, parametros) => (await conexion.promise().query(sql, parametros))[0];

    const historias = await consultar(
        `SELECT h.id_historia, h.titulo, h.descripcion, h.puntos, h.prioridad, h.estado_historia,
                s.numero AS sprint_numero,
                u.id_usuario AS id_responsable, u.nombre AS responsable, u.username AS usuario_responsable
         FROM product_backlog h
         LEFT JOIN sprints s ON s.id_sprint = h.id_sprint
         LEFT JOIN usuarios u ON u.id_usuario = h.id_responsable
         WHERE h.id_historia = ? AND h.id_proyecto = ?`,
        [idHistoria, idProyecto]
    );
    if (!historias.length || !ESTADOS_EN_REVISION_O_REVISADA.includes(historias[0].estado_historia)) {
        return null;
    }
    const [criterios, evidencias, historial] = await Promise.all([
        consultar(
            `SELECT id_criterio, descripcion, completado
             FROM criterios_aceptacion WHERE id_historia = ? ORDER BY id_criterio`,
            [idHistoria]
        ),
        consultar(
            `SELECT e.id_evidencia, e.nombre_original, e.tipo_mime, e.tamano_bytes,
                    DATE_FORMAT(e.fecha_subida, ${FORMATO_FECHA}) AS fecha_subida,
                    u.nombre AS subido_por
             FROM evidencias_historia e
             LEFT JOIN usuarios u ON u.id_usuario = e.id_usuario
             WHERE e.id_historia = ? ORDER BY e.id_evidencia`,
            [idHistoria]
        ),
        consultar(
            `SELECT r.id_revision, r.decision, r.observaciones,
                    DATE_FORMAT(r.fecha_revision, ${FORMATO_FECHA}) AS fecha_revision,
                    u.nombre AS revisor
             FROM revisiones_historia r
             LEFT JOIN usuarios u ON u.id_usuario = r.id_revisor
             WHERE r.id_historia = ? ORDER BY r.id_revision DESC`,
            [idHistoria]
        )
    ]);
    return {
        historia: historias[0],
        criterios: criterios.map((criterio) => ({ ...criterio, completado: Boolean(criterio.completado) })),
        evidencias,
        historial
    };
};

// Datos de un archivo de evidencia, comprobando que pertenezca a esa historia y a ese proyecto.
const obtenerEvidencia = async (idProyecto, idHistoria, idEvidencia) => {
    const [filas] = await conexion.promise().query(
        `SELECT e.nombre_original, e.nombre_archivo, e.tipo_mime
         FROM evidencias_historia e
         INNER JOIN product_backlog h ON h.id_historia = e.id_historia
         WHERE e.id_evidencia = ? AND e.id_historia = ? AND h.id_proyecto = ?`,
        [idEvidencia, idHistoria, idProyecto]
    );
    return filas[0] || null;
};

// PB-20: registra la decisión y cambia el estado de la historia en una sola transacción.
// La historia se bloquea con FOR UPDATE: si dos revisores deciden a la vez, el segundo
// encuentra que ya no está en revisión y no se duplica ni se pisa la decisión.
// Devuelve { revision }, { noEncontrada: true } o { estadoActual }.
const registrarDecision = async (idProyecto, idHistoria, idRevisor, decision, observaciones) => {
    const transaccion = await conexion.crearConexion();
    try {
        await transaccion.beginTransaction();
        const [historias] = await transaccion.query(
            `SELECT estado_historia FROM product_backlog
             WHERE id_historia = ? AND id_proyecto = ? FOR UPDATE`,
            [idHistoria, idProyecto]
        );
        if (!historias.length) {
            await transaccion.rollback();
            return { noEncontrada: true };
        }
        if (historias[0].estado_historia !== 'En revision') {
            await transaccion.rollback();
            return { estadoActual: historias[0].estado_historia };
        }
        const [resultado] = await transaccion.query(
            `INSERT INTO revisiones_historia (id_historia, id_revisor, decision, observaciones)
             VALUES (?, ?, ?, ?)`,
            [idHistoria, idRevisor, decision, observaciones]
        );
        await transaccion.query(
            'UPDATE product_backlog SET estado_historia = ? WHERE id_historia = ?',
            [decision, idHistoria]
        );
        await transaccion.commit();
        return { revision: { id_revision: resultado.insertId, decision, observaciones } };
    } catch (error) {
        await transaccion.rollback().catch(() => {});
        throw error;
    } finally {
        await transaccion.end().catch(() => {});
    }
};

// Estado actual de una historia dentro de un Sprint (para dar un mensaje claro en PB-17).
const obtenerEstadoEnSprint = async (idProyecto, idSprint, idHistoria) => {
    const [filas] = await conexion.promise().query(
        `SELECT estado_historia FROM product_backlog
         WHERE id_proyecto = ? AND id_sprint = ? AND id_historia = ?`,
        [idProyecto, idSprint, idHistoria]
    );
    return filas.length ? filas[0].estado_historia : null;
};

module.exports = {
    listarParaRevision,
    obtenerDetalle,
    obtenerEvidencia,
    registrarDecision,
    obtenerEstadoEnSprint
};
