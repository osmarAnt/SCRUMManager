const conexion = require('../base_de_datos/conexion');
const listarDisponibles = async (idProyecto, idActual) => {
    const [usuarios] = await conexion.promise().query(
        `SELECT
            u.id_usuario,
            u.nombre,
            u.username
         FROM usuarios u
         WHERE u.activo = TRUE
         AND u.id_usuario <> ?
         AND NOT EXISTS (
             SELECT 1
             FROM proyecto_usuarios pu
             WHERE pu.id_proyecto = ?
             AND pu.id_usuario = u.id_usuario
         )
         AND NOT EXISTS (
             SELECT 1
             FROM invitaciones_proyecto ip
             WHERE ip.id_proyecto = ?
             AND ip.id_invitado = u.id_usuario
             AND ip.estado = 'Pendiente'
         )
         ORDER BY u.nombre ASC, u.username ASC`,
        [idActual, idProyecto, idProyecto]
    );
    return usuarios;
};
const cambiarIntegrante = async (
    idProyecto,
    idActor,
    idIntegrante,
    nuevoRol = null
) => {
    const tx = await conexion.crearConexion();
    try {
        await tx.beginTransaction();
        const fallar = async (error) => {
            await tx.rollback();
            return { error };
        };
        const [proyectos] = await tx.query(
            `SELECT id_proyecto
             FROM proyectos
             WHERE id_proyecto = ?
             AND activo = TRUE
             FOR UPDATE`,
            [idProyecto]
        );
        if (!proyectos.length) {
            return await fallar('proyecto_inexistente');
        }
        const [administradores] = await tx.query(
            `SELECT
                pu.rol AS rol_proyecto,
                u.rol AS rol_cuenta
             FROM proyecto_usuarios pu
             INNER JOIN usuarios u
                ON u.id_usuario = pu.id_usuario
             WHERE pu.id_proyecto = ?
             AND pu.id_usuario = ?
             AND pu.activo = TRUE
             AND u.activo = TRUE
             FOR UPDATE`,
            [idProyecto, idActor]
        );
        if (
            administradores[0]?.rol_proyecto !== 'Scrum Master' ||
            administradores[0]?.rol_cuenta !== 'Scrum Master'
        ) {
            return await fallar('sin_permiso');
        }

        if (idActor === idIntegrante) {
            return await fallar('protegido');
        }
        const [miembros] = await tx.query(
            `SELECT rol
             FROM proyecto_usuarios
             WHERE id_proyecto = ?
             AND id_usuario = ?
             AND activo = TRUE
             FOR UPDATE`,
            [idProyecto, idIntegrante]
        );
        if (!miembros.length) {
            return await fallar('no_integrante');
        }

        if (miembros[0].rol === 'Scrum Master') {
            return await fallar('protegido');
        }

        if (nuevoRol === null) {
            await tx.query(
                `DELETE FROM proyecto_usuarios
                 WHERE id_proyecto = ?
                 AND id_usuario = ?`,
                [idProyecto, idIntegrante]
            );
        }

        else {
            await tx.query(
                `UPDATE proyecto_usuarios
                 SET rol = ?
                 WHERE id_proyecto = ?
                 AND id_usuario = ?`,
                [nuevoRol, idProyecto, idIntegrante]
            );
        }
        await tx.commit();
        return {
            correcto: true
        };
    } catch (error) {
        await tx.rollback().catch(() => {});
        throw error;
    } finally {
        await tx.end().catch(() => {});
    }
};

module.exports = {
    listarDisponibles,
    cambiarIntegrante
};