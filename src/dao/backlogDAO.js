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
        const conexion = await pool.crearConexion();

        try {
            await conexion.beginTransaction();

            const [historias] = await conexion.execute(
                `SELECT titulo, id_responsable
             FROM product_backlog
             WHERE id_proyecto = ?
             AND id_sprint = ?
             AND id_historia = ?
             FOR UPDATE`,
                [idProyecto, idSprint, idHistoria]
            );

            if (!historias.length) {
                await conexion.rollback();
                return false;
            }

            const [resultado] = await conexion.execute(
                `UPDATE product_backlog AS historia
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
             AND historia.id_historia = ?`,
                [idResponsable, idProyecto, idSprint, idHistoria]
            );

            if (!resultado.affectedRows) {
                await conexion.rollback();
                return false;
            }

            // Notificar únicamente si cambió el responsable
            if (Number(historias[0].id_responsable) !== Number(idResponsable)) {
                await conexion.execute(
                    `INSERT INTO notificaciones_historias
                (id_usuario, id_proyecto, id_historia, titulo_historia)
                VALUES (?, ?, ?, ?)`,
                    [idResponsable, idProyecto, idHistoria, historias[0].titulo]
                );
            }

            await conexion.commit();
            return true;

        } catch (error) {
            await conexion.rollback();
            throw error;

        } finally {
            await conexion.end();
        }
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
    // Sprint 7 · Bloque 2: se guarda la épica (obligatoria).
    crear: async (datos) => {
        const { id_proyecto, titulo, descripcion, puntos, prioridad, id_epica } = datos;
        const query = `
            INSERT INTO product_backlog
            (id_proyecto, id_epica, titulo, descripcion, puntos, prioridad)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [resultado] = await pool.promise().query(query, [
            id_proyecto, id_epica, titulo, descripcion, puntos || null, prioridad || 'Media'
        ]);
        return resultado.insertId;
    },

    // Sprint 7 · Bloque 1: proyecto al que pertenece una historia (para revisar permisos).
    obtenerProyectoDeHistoria: async (idHistoria) => {
        const [filas] = await pool.promise().query(
            'SELECT id_proyecto FROM product_backlog WHERE id_historia = ? LIMIT 1',
            [idHistoria]
        );
        return filas.length ? Number(filas[0].id_proyecto) : null;
    },

    // ===== OSMAR: OBTENER HISTORIAS DEL PROYECTO =====
    
    // ===== OSMAR: OBTENER HISTORIAS DEL PROYECTO =====
    // JESÚS PB-28: identificar historias modificadas

    // Sprint 7: incluye la épica (nombre y color) y ordena por prioridad (TC-08-05):
    // al cambiar la prioridad de una historia cambia su posición en el backlog.
    obtenerPorProyecto: async (id_proyecto) => {
        const query = `
            SELECT h.*,
                e.nombre AS epica_nombre,
                e.color AS epica_color,
                EXISTS (
                    SELECT 1
                    FROM historial_cambios_historias hc
                    WHERE hc.id_historia = h.id_historia
                ) AS tiene_historial,
                r.decision AS ultima_decision,
                r.observaciones AS ultima_observacion,
                DATE_FORMAT(r.fecha_revision, '%Y-%m-%d %H:%i') AS ultima_fecha_revision
            FROM product_backlog h
            LEFT JOIN epicas e ON e.id_epica = h.id_epica
            LEFT JOIN revisiones_historia r ON r.id_revision = (
                SELECT MAX(id_revision)
                FROM revisiones_historia
                WHERE id_historia = h.id_historia
            )
            WHERE h.id_proyecto = ?
            ORDER BY FIELD(h.prioridad, 'Alta', 'Media', 'Baja'), h.orden ASC, h.id_historia ASC
        `;

        const [rows] = await pool.promise().query(
            query,
            [id_proyecto]
        );

        return rows;
    },


    // ===== OSMAR: ELIMINAR HISTORIA =====
    // Sprint 7: el borrado se limita al proyecto ya autorizado.
    eliminar: async (id_historia, id_proyecto) => {
        const [rows] = await pool.promise().query(
            'SELECT id_sprint FROM product_backlog WHERE id_historia = ? AND id_proyecto = ?',
            [id_historia, id_proyecto]
        )

        if (rows.length > 0 && rows[0].id_sprint !== null) {
            throw new Error('La historia ya está en un Sprint y no se puede eliminar.');
        }

        const [resultado] = await pool.promise().query(
            'DELETE FROM product_backlog WHERE id_historia = ? AND id_proyecto = ?',
            [id_historia, id_proyecto]
        );
        return resultado.affectedRows;
    },

    
    // ===== JESÚS: PB-28 - REGISTRAR MODIFICACIONES =====

    actualizar: async (idProyecto, idHistoria, idUsuario, datos) => {

        const conexion = await pool.crearConexion();

        try {
            await conexion.beginTransaction();

            // Obtener los datos actuales de la historia
            const [filas] = await conexion.query(
                `SELECT h.titulo, h.descripcion, h.puntos, h.prioridad,
                        h.id_epica, e.nombre AS epica_nombre
                 FROM product_backlog h
                 LEFT JOIN epicas e ON e.id_epica = h.id_epica
                 WHERE h.id_proyecto = ?
                 AND h.id_historia = ?
                 FOR UPDATE`,
                [idProyecto, idHistoria]
            );

            if (filas.length === 0) {
                await conexion.rollback();
                return {
                    encontrada: false,
                    modificado: false
                };
            }

            const anterior = filas[0];
            if (datos.puntos === undefined) datos = { ...datos, puntos: anterior.puntos };

            // Campos que vamos a comparar
            const campos = {
                titulo: 'Título',
                descripcion: 'Descripción',
                puntos: 'Puntos',
                prioridad: 'Prioridad'
            };

            const cambios = [];

            // Comparar datos anteriores con los nuevos
            for (const [campo, nombre] of Object.entries(campos)) {

                const antes = anterior[campo];
                const despues = datos[campo];

                if (antes !== despues) {
                    cambios.push({
                        campo: nombre,
                        antes: antes,
                        despues: despues
                    });
                }
            }

            // Sprint 7 · Bloque 2: el cambio de épica también queda en el historial (con su nombre).
            if (datos.id_epica !== undefined && Number(anterior.id_epica) !== Number(datos.id_epica)) {
                const [[nueva]] = await conexion.query(
                    'SELECT nombre FROM epicas WHERE id_epica = ? AND id_proyecto = ?',
                    [datos.id_epica, idProyecto]
                );
                cambios.push({
                    campo: 'Épica',
                    antes: anterior.epica_nombre ?? null,
                    despues: nueva ? nueva.nombre : null
                });
            } else {
                datos = { ...datos, id_epica: anterior.id_epica };
            }

            // Si no hubo cambios, no generar historial
            if (cambios.length === 0) {
                await conexion.rollback();

                return {
                    encontrada: true,
                    modificado: false
                };
            }

            // Actualizar la historia
            await conexion.query(
                `UPDATE product_backlog
                 SET titulo = ?,
                     descripcion = ?,
                     puntos = ?,
                     prioridad = ?,
                     id_epica = ?
                 WHERE id_proyecto = ?
                 AND id_historia = ?`,
                [
                    datos.titulo,
                    datos.descripcion,
                    datos.puntos,
                    datos.prioridad,
                    datos.id_epica,
                    idProyecto,
                    idHistoria
                ]
            );

            // Guardar el registro de modificaciones
            await conexion.query(
                `INSERT INTO historial_cambios_historias
                 (id_historia, id_usuario, cambios)
                 VALUES (?, ?, ?)`,
                [
                    idHistoria,
                    idUsuario,
                    JSON.stringify(cambios)
                ]
            );

            // Confirmar ambas operaciones
            await conexion.commit();

            return {
                encontrada: true,
                modificado: true
            };

        } catch (error) {

            await conexion.rollback().catch(() => {});
            throw error;

        } finally {
            await conexion.end();
        }
    },


    // ===== JESÚS: PB-29 - CONSULTAR HISTORIAL =====

    obtenerHistorial: async (idProyecto, idHistoria) => {

        const query = `
            SELECT
                hc.id_historial,
                DATE_FORMAT(
                    hc.fecha_modificacion,
                    '%d/%m/%Y %H:%i:%s'
                ) AS fecha,
                hc.cambios,
                COALESCE(
                    u.username,
                    'Usuario eliminado'
                ) AS usuario

            FROM historial_cambios_historias hc

            INNER JOIN product_backlog h
                ON h.id_historia = hc.id_historia

            LEFT JOIN usuarios u
                ON u.id_usuario = hc.id_usuario

            WHERE h.id_proyecto = ?
            AND h.id_historia = ?

            ORDER BY hc.id_historial DESC
        `;

        const [filas] = await pool.promise().query(
            query,
            [idProyecto, idHistoria]
        );

        return filas;
    },

    // ===== FIN PB-28 Y PB-29 =====


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
            'SELECT * FROM criterios_aceptacion WHERE id_historia = ? ORDER BY id_criterio ASC',
            [id_historia]
        );
        return rows;
    },

    // Sprint 7 · Bloque 3 · HU-09: datos del criterio y de su historia (para revisar permisos).
    obtenerCriterio: async (idCriterio) => {
        const [filas] = await pool.promise().query(
            `SELECT c.id_criterio, c.id_historia, c.completado,
                    h.id_proyecto, h.id_responsable, h.estado_historia
             FROM criterios_aceptacion c
             INNER JOIN product_backlog h ON h.id_historia = c.id_historia
             WHERE c.id_criterio = ?`,
            [idCriterio]
        );
        return filas[0] || null;
    },

    marcarCriterio: async (idCriterio, completado) => {
        const [resultado] = await pool.promise().query(
            'UPDATE criterios_aceptacion SET completado = ? WHERE id_criterio = ?',
            [completado, idCriterio]
        );
        return resultado.affectedRows > 0;
    },

    // Sprint 7 · Bloque 3 · HU-09 y HU-10: lo que falta para poder terminar una historia
    // (criterios de aceptación sin cumplir y requisitos de su Definition of Done sin cumplir).
    obtenerPendientesParaTerminar: async (idHistoria) => {
        const [[criterios], [dod]] = await Promise.all([
            pool.promise().query(
                'SELECT descripcion FROM criterios_aceptacion WHERE id_historia = ? AND completado = FALSE ORDER BY id_criterio',
                [idHistoria]
            ),
            pool.promise().query(
                'SELECT descripcion FROM dod_requisitos WHERE id_historia = ? AND cumplido = FALSE ORDER BY id_requisito',
                [idHistoria]
            )
        ]);
        return {
            criterios: criterios.map((fila) => fila.descripcion),
            dod: dod.map((fila) => fila.descripcion)
        };
    },

    // Sprint 7 · Bloque 1 · TC-14-04: responsable y estado de una historia del Sprint.
    obtenerHistoriaDeSprint: async (idProyecto, idSprint, idHistoria) => {
        const [filas] = await pool.promise().query(
            `SELECT id_historia, id_responsable, estado_historia
             FROM product_backlog
             WHERE id_proyecto = ? AND id_sprint = ? AND id_historia = ?`,
            [idProyecto, idSprint, idHistoria]
        );
        return filas[0] || null;
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
                u.nombre AS nombre_responsable,
                h.id_epica,
                e.nombre AS epica_nombre,
                e.color AS epica_color
            FROM product_backlog h
            LEFT JOIN usuarios u
                ON u.id_usuario = h.id_responsable
            LEFT JOIN epicas e
                ON e.id_epica = h.id_epica
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