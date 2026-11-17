const conexion = require('../base_de_datos/conexion');
const crearInvitacion = async (
    idProyecto,
    username,
    rol,
    idInvitador
) => {
    const tx = await conexion.crearConexion();
    try {
        await tx.beginTransaction();
        const fallar = async (codigo) => {
            await tx.rollback();
            return { error: codigo };
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
            `SELECT rol
             FROM proyecto_usuarios
             WHERE id_proyecto = ?
             AND id_usuario = ?
             AND activo = TRUE
             FOR UPDATE`,
            [idProyecto, idInvitador]
        );
        if (
            administradores[0]?.rol !== 'Scrum Master'
        ) {
            return await fallar('sin_permiso');
        }
        const [usuarios] = await tx.query(
            `SELECT id_usuario, nombre, username
             FROM usuarios
             WHERE username = ?
             AND activo = TRUE
             LIMIT 1`,
            [username]
        );
        if (!usuarios.length) {
            return await fallar('usuario_inexistente');
        }
        const invitado = usuarios[0];
        if (invitado.id_usuario === idInvitador) {
            return await fallar('mismo_usuario');
        }
        const [integrantes] = await tx.query(
            `SELECT id_usuario
             FROM proyecto_usuarios
             WHERE id_proyecto = ?
             AND id_usuario = ?
             LIMIT 1`,
            [idProyecto, invitado.id_usuario]
        );
        if (integrantes.length) {
            return await fallar('ya_integrante');
        }
        const [previas] = await tx.query(

            `SELECT id_invitacion, estado

     FROM invitaciones_proyecto

     WHERE id_proyecto = ?
     AND id_invitado = ?

     LIMIT 1`,

            [idProyecto, invitado.id_usuario]

        );
        if (previas.length) {
            if (previas[0].estado === 'Pendiente') {
                return await fallar('ya_invitado');
            }
            await tx.query(
                `UPDATE invitaciones_proyecto
         SET
            rol = ?,
            id_invitador = ?,
            estado = 'Pendiente',
            fecha_creacion = CURRENT_TIMESTAMP,
            fecha_respuesta = NULL
         WHERE id_invitacion = ?`,
                [
                    rol,
                    idInvitador,
                    previas[0].id_invitacion
                ]
            );
            await tx.commit();
            return {
                invitacion: {
                    id_invitacion: previas[0].id_invitacion,
                    id_proyecto: idProyecto,
                    id_invitado: invitado.id_usuario,
                    nombre: invitado.nombre,
                    username: invitado.username,
                    rol,
                    estado: 'Pendiente'
                }
            };
        }
        const [resultado] = await tx.query(
            `INSERT INTO invitaciones_proyecto
            (
                id_proyecto,
                id_invitado,
                id_invitador,
                rol
            )
            VALUES (?, ?, ?, ?)`,
            [
                idProyecto,
                invitado.id_usuario,
                idInvitador,
                rol
            ]
        );
        await tx.commit();
        return {
            invitacion: {
                id_invitacion: resultado.insertId,
                id_proyecto: idProyecto,
                id_invitado: invitado.id_usuario,
                nombre: invitado.nombre,
                username: invitado.username,
                rol: rol,
                estado: 'Pendiente'
            }
        };
    } catch (error) {
        await tx.rollback().catch(() => {});
        if (error.code === 'ER_DUP_ENTRY') {
            return { error: 'ya_invitado' };
        }
        throw error;
    } finally {
        await tx.end().catch(() => {});
    }
};

const listarPendientes = async (idUsuario) => {
    const [filas] = await conexion.promise().query(
        `SELECT
            i.id_invitacion,
            i.id_proyecto,
            p.nombre AS proyecto,
            i.rol,
            i.fecha_creacion,
            u.nombre AS invitador,
            u.username AS usuario_invitador

         FROM invitaciones_proyecto i

         INNER JOIN proyectos p
            ON p.id_proyecto = i.id_proyecto
            AND p.activo = TRUE

         INNER JOIN usuarios u
            ON u.id_usuario = i.id_invitador

         WHERE i.id_invitado = ?
         AND i.estado = 'Pendiente'

         ORDER BY
            i.fecha_creacion DESC,
            i.id_invitacion DESC`,
        [idUsuario]
    );
    return filas;
};

const listarIntegrantes = async (
    idProyecto,
    incluirPendientes
) => {
    const [integrantes] = await conexion.promise().query(
        `SELECT
            u.id_usuario,
            u.nombre,
            u.username,
            pu.rol

         FROM proyecto_usuarios pu

         INNER JOIN usuarios u
            ON u.id_usuario = pu.id_usuario

         WHERE pu.id_proyecto = ?
         AND pu.activo = TRUE
         AND u.activo = TRUE

         ORDER BY
            FIELD(
                pu.rol,
                'Scrum Master',
                'Product Owner',
                'Desarrollador'
            ),
            u.nombre ASC`,
        [idProyecto]
    );
    let invitaciones = [];
    if (incluirPendientes) {
        [invitaciones] = await conexion.promise().query(
            `SELECT
                i.id_invitacion,
                u.nombre,
                u.username,
                i.rol,
                i.fecha_creacion

             FROM invitaciones_proyecto i

             INNER JOIN usuarios u
                ON u.id_usuario = i.id_invitado

             WHERE i.id_proyecto = ?
             AND i.estado = 'Pendiente'

             ORDER BY
                i.fecha_creacion DESC,
                i.id_invitacion DESC`,
            [idProyecto]
        );
    }
    return {
        integrantes,
        invitaciones
    };
};

const aceptarInvitacion = async (
    idInvitacion,
    idUsuario
) => {
    const tx = await conexion.crearConexion();
    try {
        await tx.beginTransaction();
        const fallar = async (codigo) => {
            await tx.rollback();
            return { error: codigo };
        };
        const [ubicaciones] = await tx.query(
            `SELECT id_proyecto
             FROM invitaciones_proyecto
             WHERE id_invitacion = ?
             AND id_invitado = ?`,
            [idInvitacion, idUsuario]
        );
        if (!ubicaciones.length) {
            return await fallar('invitacion_inexistente');
        }
        const idProyecto = ubicaciones[0].id_proyecto;
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
        const [invitaciones] = await tx.query(
            `SELECT
                id_invitacion,
                rol,
                estado

             FROM invitaciones_proyecto

             WHERE id_invitacion = ?
             AND id_invitado = ?
             AND id_proyecto = ?

             FOR UPDATE`,
            [idInvitacion, idUsuario, idProyecto]
        );
        if (!invitaciones.length) {
            return await fallar('invitacion_inexistente');
        }
        const invitacion = invitaciones[0];
        if (invitacion.estado !== 'Pendiente') {
            return await fallar('ya_respondida');
        }
        const [usuarios] = await tx.query(
            `SELECT id_usuario
             FROM usuarios
             WHERE id_usuario = ?
             AND activo = TRUE
             LIMIT 1`,
            [idUsuario]
        );
        if (!usuarios.length) {
            return await fallar('usuario_inexistente');
        }
        const [integrantes] = await tx.query(
            `SELECT id_usuario
             FROM proyecto_usuarios
             WHERE id_proyecto = ?
             AND id_usuario = ?`,
            [idProyecto, idUsuario]
        );
        if (integrantes.length) {
            return await fallar('ya_integrante');
        }
        await tx.query(
            `INSERT INTO proyecto_usuarios
            (
                id_proyecto,
                id_usuario,
                rol,
                activo
            )
            VALUES (?, ?, ?, TRUE)`,
            [
                idProyecto,
                idUsuario,
                invitacion.rol
            ]
        );
        await tx.query(
            `UPDATE invitaciones_proyecto
             SET
                estado = 'Aceptada',
                fecha_respuesta = CURRENT_TIMESTAMP

             WHERE id_invitacion = ?`,
            [idInvitacion]
        );
        await tx.commit();
        return {
            id_proyecto: idProyecto,
            rol: invitacion.rol
        };
    } catch (error) {
        await tx.rollback().catch(() => {});
        if (error.code === 'ER_DUP_ENTRY') {
            return { error: 'ya_integrante' };
        }
        throw error;
    } finally {
        await tx.end().catch(() => {});
    }
};

module.exports = {
    crearInvitacion,
    listarPendientes,
    listarIntegrantes,
    aceptarInvitacion
};