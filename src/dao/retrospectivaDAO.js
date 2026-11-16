// PB-34: acceso a los registros de retrospectiva del Sprint.
const conexion = require('../base_de_datos/conexion');

const RetrospectivaDAO = {
    // Lista los Sprints del proyecto para organizar las retrospectivas.
    obtenerSprints: async (idProyecto) => {
        const [filas] = await conexion.promise().query(
            `SELECT
                id_sprint,
                numero,
                objetivo,
                estado
             FROM sprints
             WHERE id_proyecto = ?
             ORDER BY numero ASC`,
            [idProyecto]
        );

        return filas;
    },

    // Consulta todas las aportaciones del proyecto, agrupables por Sprint.
    obtenerPorProyecto: async (idProyecto) => {
        const [filas] = await conexion.promise().query(
            `SELECT
                r.id_retrospectiva,
                r.id_proyecto,
                r.id_sprint,
                r.id_usuario,
                s.numero AS numero_sprint,
                s.objetivo AS objetivo_sprint,
                u.nombre AS nombre_usuario,
                u.username,
                r.aciertos,
                r.aspectos_mejorar,
                r.acciones_acordadas,
                DATE_FORMAT(
                    r.fecha_creacion,
                    '%d/%m/%Y %H:%i'
                ) AS fecha_creacion,
                DATE_FORMAT(
                    r.fecha_actualizacion,
                    '%d/%m/%Y %H:%i'
                ) AS fecha_actualizacion
             FROM retrospectivas_sprint r
             INNER JOIN sprints s
                ON s.id_sprint = r.id_sprint
                AND s.id_proyecto = r.id_proyecto
             INNER JOIN usuarios u
                ON u.id_usuario = r.id_usuario
             WHERE r.id_proyecto = ?
             ORDER BY s.numero ASC, r.fecha_actualizacion DESC`,
            [idProyecto]
        );

        return filas;
    },

    // Cada integrante puede guardar una aportación por Sprint.
    // Si vuelve a guardar, se actualiza su registro anterior.
    guardar: async (
        idProyecto,
        idSprint,
        idUsuario,
        aciertos,
        aspectosMejorar,
        accionesAcordadas
    ) => {
        const [resultado] = await conexion.promise().query(
            `INSERT INTO retrospectivas_sprint
                (
                    id_proyecto,
                    id_sprint,
                    id_usuario,
                    aciertos,
                    aspectos_mejorar,
                    acciones_acordadas
                )
             SELECT
                s.id_proyecto,
                s.id_sprint,
                pu.id_usuario,
                ?,
                ?,
                ?
             FROM sprints s
             INNER JOIN proyecto_usuarios pu
                ON pu.id_proyecto = s.id_proyecto
                AND pu.id_usuario = ?
                AND pu.activo = TRUE
             INNER JOIN proyectos p
                ON p.id_proyecto = s.id_proyecto
                AND p.activo = TRUE
             INNER JOIN usuarios u
                ON u.id_usuario = pu.id_usuario
                AND u.activo = TRUE
             WHERE s.id_proyecto = ?
                AND s.id_sprint = ?
             ON DUPLICATE KEY UPDATE
                id_retrospectiva = LAST_INSERT_ID(id_retrospectiva),
                aciertos = VALUES(aciertos),
                aspectos_mejorar = VALUES(aspectos_mejorar),
                acciones_acordadas = VALUES(acciones_acordadas),
                fecha_actualizacion = CURRENT_TIMESTAMP`,
            [
                aciertos,
                aspectosMejorar,
                accionesAcordadas,
                idUsuario,
                idProyecto,
                idSprint
            ]
        );

        return resultado.insertId || null;
    }
};

module.exports = RetrospectivaDAO;
