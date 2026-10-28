// src/dao/backlogDAO.js
const pool = require('../base_de_datos/conexion');

const BacklogDAO = {
    // ===== JESÚS: PB-14 - AGREGAR HISTORIA AL SPRINT =====
    agregarAlSprint: async (idProyecto, idSprint, idHistoria) => {
        const query = `
            UPDATE product_backlog AS historia
            INNER JOIN sprints AS sprint
                ON sprint.id_sprint = ?
                AND sprint.id_proyecto = historia.id_proyecto
            SET historia.id_sprint = sprint.id_sprint
            WHERE historia.id_historia = ?
                AND historia.id_proyecto = ?
                AND historia.id_sprint IS NULL
                AND sprint.estado = 'Planificado'
        `;
        const [resultado] = await pool.promise().query(query, [
            idSprint, idHistoria, idProyecto
        ]);
        return resultado.affectedRows > 0;
    },

    // ===== JESÚS: PB-15 - QUITAR HISTORIA DEL SPRINT =====
    quitarDelSprint: async (idProyecto, idSprint, idHistoria) => {
        const query = `
            UPDATE product_backlog
            SET id_sprint = NULL, id_responsable = NULL
            WHERE id_proyecto = ?
                AND id_sprint = ?
                AND id_historia = ?
                AND estado_historia = 'Pendiente'
        `;
        const [resultado] = await pool.promise().query(query, [
            idProyecto, idSprint, idHistoria
        ]);
        return resultado.affectedRows > 0;
    },

    // ===== JESÚS: PB-16 - ASIGNAR RESPONSABLE =====
    asignarResponsable: async (idProyecto, idSprint, idHistoria, idResponsable) => {
        const query = `
            UPDATE product_backlog AS historia
            INNER JOIN proyecto_usuarios AS integrante
                ON integrante.id_proyecto = historia.id_proyecto
                AND integrante.id_usuario = ?
                AND integrante.rol = 'Desarrollador'
                AND integrante.activo = TRUE
            INNER JOIN usuarios AS usuario
                ON usuario.id_usuario = integrante.id_usuario
                AND usuario.activo = TRUE
            SET historia.id_responsable = integrante.id_usuario
            WHERE historia.id_proyecto = ?
                AND historia.id_sprint = ?
                AND historia.id_historia = ?
        `;
        const [resultado] = await pool.promise().query(query, [
            idResponsable, idProyecto, idSprint, idHistoria
        ]);
        return resultado.affectedRows > 0;
    },

    // ===== JESÚS: PB-17 - ACTUALIZAR ESTADO =====
    actualizarEstadoSprint: async (idProyecto, idSprint, idHistoria, estado) => {
        const [resultado] = await pool.promise().query(
            `UPDATE product_backlog
             SET estado_historia = ?
             WHERE id_proyecto = ?
                AND id_sprint = ?
                AND id_historia = ?
                AND estado_historia NOT IN ('En revision', 'Aprobada')`,
            [estado, idProyecto, idSprint, idHistoria]
        );

        if (resultado.affectedRows > 0) return true;

        const [historias] = await pool.promise().query(
            `SELECT estado_historia FROM product_backlog
             WHERE id_proyecto = ?
                AND id_sprint = ?
                AND id_historia = ?`,
            [idProyecto, idSprint, idHistoria]
        );

        return historias.length > 0 && historias[0].estado_historia === estado;
    },

    // ===== OSMAR: CREAR HISTORIA =====
    crear: async (datos) => {
        const { id_proyecto, titulo, descripcion, puntos, prioridad } = datos;
        const query = `
            INSERT INTO product_backlog
            (id_proyecto, titulo, descripcion, puntos, prioridad)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [resultado] = await pool.promise().query(query, [
            id_proyecto, titulo, descripcion, puntos || null, prioridad || 'Media'
        ]);
        return resultado.insertId;
    },

    // ===== OSMAR: OBTENER HISTORIAS DEL PROYECTO =====
    obtenerPorProyecto: async (id_proyecto) => {
        const query = `
            SELECT h.*,
                r.decision AS ultima_decision,
                r.observaciones AS ultima_observacion,
                DATE_FORMAT(r.fecha_revision, '%Y-%m-%d %H:%i') AS ultima_fecha_revision
            FROM product_backlog h
            LEFT JOIN revisiones_historia r ON r.id_revision = (
                SELECT MAX(id_revision)
                FROM revisiones_historia
                WHERE id_historia = h.id_historia
            )
            WHERE h.id_proyecto = ?
            ORDER BY h.orden ASC
        `;
        const [rows] = await pool.promise().query(query, [id_proyecto]);
        return rows;
    },

    // ===== OSMAR: ELIMINAR HISTORIA =====
    eliminar: async (id_historia) => {
        const [rows] = await pool.promise().query(
            'SELECT id_sprint FROM product_backlog WHERE id_historia = ?',
            [id_historia]
        );

        if (rows.length > 0 && rows[0].id_sprint !== null) {
            throw new Error('La historia ya está en un Sprint y no se puede eliminar.');
        }

        const [resultado] = await pool.promise().query(
            'DELETE FROM product_backlog WHERE id_historia = ?',
            [id_historia]
        );
        return resultado.affectedRows;
    },

    // ===== OSMAR: ACTUALIZAR HISTORIA =====
    actualizar: async (id_historia, datos) => {
        const { titulo, descripcion, puntos, prioridad } = datos;
        const [resultado] = await pool.promise().query(
            `UPDATE product_backlog
             SET titulo = ?, descripcion = ?, puntos = ?, prioridad = ?
             WHERE id_historia = ?`,
            [titulo, descripcion, puntos, prioridad, id_historia]
        );
        return resultado.affectedRows;
    },

    // ===== CRITERIOS DE ACEPTACIÓN =====
    crearCriterio: async (id_historia, descripcion) => {
        const [resultado] = await pool.promise().query(
            'INSERT INTO criterios_aceptacion (id_historia, descripcion) VALUES (?, ?)',
            [id_historia, descripcion]
        );
        return resultado.insertId;
    },

    obtenerCriteriosPorHistoria: async (id_historia) => {
        const [rows] = await pool.promise().query(
            'SELECT * FROM criterios_aceptacion WHERE id_historia = ?',
            [id_historia]
        );
        return rows;
    },

    // ===== VALOR Y ESFUERZO POR REQUISITO =====
    actualizarValorNegocio: async (idProyecto, idHistoria, valorNegocio) => {
        const [resultado] = await pool.promise().query(
            `UPDATE product_backlog
             SET valor_negocio = ?
             WHERE id_proyecto = ? AND id_historia = ?`,
            [valorNegocio, idProyecto, idHistoria]
        );
        return resultado.affectedRows > 0;
    },

    // ===== OSMAR: PB-24 - OBTENER PROYECTO DEL SPRINT =====
    obtenerProyectoDeSprint: async (idSprint) => {
        const [filas] = await pool.promise().query(
            `SELECT id_proyecto
             FROM sprints
             WHERE id_sprint = ?
             LIMIT 1`,
            [idSprint]
        );
        return filas[0]?.id_proyecto ?? null;
    },

    // ===== OSMAR: PB-24 - OBTENER HISTORIAS DEL KANBAN =====
    obtenerKanbanPorSprint: async (idSprint, idProyecto) => {
        const query = `
            SELECT
                h.id_historia,
                h.id_proyecto,
                h.id_sprint,
                h.titulo,
                h.descripcion,
                h.puntos,
                h.prioridad,
                h.estado_historia,
                h.id_responsable,
                u.nombre AS nombre_responsable
            FROM product_backlog h
            LEFT JOIN usuarios u
                ON u.id_usuario = h.id_responsable
            WHERE h.id_sprint = ?
                AND h.id_proyecto = ?
            ORDER BY h.orden ASC, h.id_historia ASC
        `;

        const [historias] = await pool.promise().query(query, [
            idSprint, idProyecto
        ]);
        return historias;
    }
};

module.exports = BacklogDAO;