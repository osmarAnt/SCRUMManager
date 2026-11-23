const conexion = require('../base_de_datos/conexion');

const mazo = ['1', '2', '3', '5', '8', '13', '21', '34', '?'];
const idValido = (id) => Number.isInteger(id) && id > 0 && id <= 2147483647;

class ErrorMesa extends Error {
    constructor(estado, mensaje) {
        super(mensaje);
        this.estado = estado;
    }
}

let preparacionEnCurso = null;

async function crearTablasDeVotacion() {
    const db = conexion.promise();
    await db.query(
        `CREATE TABLE IF NOT EXISTS planning_rondas (
            id_ronda INT NOT NULL AUTO_INCREMENT,
            id_proyecto INT NOT NULL,
            id_historia INT NOT NULL,
            numero INT NOT NULL,
            fase ENUM('votacion', 'revelada', 'repetida', 'cerrada', 'cancelada') NOT NULL DEFAULT 'votacion',
            puntos_acordados INT NULL,
            PRIMARY KEY (id_ronda),
            INDEX idx_planning_proyecto_ronda (id_proyecto, id_ronda),
            CONSTRAINT fk_planning_proyecto FOREIGN KEY (id_proyecto)
                REFERENCES proyectos (id_proyecto) ON DELETE CASCADE,
            CONSTRAINT fk_planning_historia FOREIGN KEY (id_historia)
                REFERENCES product_backlog (id_historia) ON DELETE CASCADE
        ) ENGINE=InnoDB`
    );
    await db.query(
        `CREATE TABLE IF NOT EXISTS planning_votos (
            id_ronda INT NOT NULL,
            id_usuario INT NOT NULL,
            carta VARCHAR(3) NULL,
            PRIMARY KEY (id_ronda, id_usuario),
            CONSTRAINT fk_planning_voto_ronda FOREIGN KEY (id_ronda)
                REFERENCES planning_rondas (id_ronda) ON DELETE CASCADE,
            CONSTRAINT fk_planning_voto_usuario FOREIGN KEY (id_usuario)
                REFERENCES usuarios (id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB`
    );
}

async function conMesa(idProyecto, idUsuario, escritura, operar) {
    try {
        return await transaccionMesa(idProyecto, idUsuario, escritura, operar);
    } catch (error) {
        const faltaTabla = error.code === 'ER_NO_SUCH_TABLE' &&
            /\bplanning_(rondas|votos)\b/i.test(error.sqlMessage || error.message);
        if (!faltaTabla) throw error;
        if (!preparacionEnCurso) {
            preparacionEnCurso = crearTablasDeVotacion().finally(() => { preparacionEnCurso = null; });
        }
        await preparacionEnCurso;
        return transaccionMesa(idProyecto, idUsuario, escritura, operar);
    }
}

async function transaccionMesa(idProyecto, idUsuario, escritura, operar) {
    const tx = await conexion.crearConexion();
    try {
        await tx.beginTransaction();
        if (escritura) {
            await tx.query('SELECT id_proyecto FROM proyectos WHERE id_proyecto = ? FOR UPDATE', [idProyecto]);
        }
        const [miembros] = await tx.query(
            `SELECT pu.id_usuario, u.nombre, u.username, pu.rol
             FROM proyecto_usuarios pu
             JOIN usuarios u ON u.id_usuario = pu.id_usuario AND u.activo = TRUE
             JOIN proyectos p ON p.id_proyecto = pu.id_proyecto AND p.activo = TRUE
             WHERE pu.id_proyecto = ? AND pu.activo = TRUE
             ORDER BY u.nombre, u.id_usuario`,
            [idProyecto]
        );
        const actor = miembros.find((miembro) => miembro.id_usuario === idUsuario);
        if (!actor) throw new ErrorMesa(404, 'No encontramos ese proyecto.');

        const [[ronda]] = await tx.query(
            `SELECT id_ronda, id_historia, numero, fase, puntos_acordados
             FROM planning_rondas WHERE id_proyecto = ? ORDER BY id_ronda DESC LIMIT 1`,
            [idProyecto]
        );
        const desarrolladores = miembros.filter((miembro) => miembro.rol === 'Desarrollador');
        const resultado = await operar(tx, actor, desarrolladores, ronda || null);
        await tx.commit();
        return resultado;
    } catch (error) {
        await tx.rollback().catch(() => {});
        throw error;
    } finally {
        await tx.end().catch(() => {});
    }
}

async function leerCartas(tx, ronda, idUsuario) {
    const publicas = ['revelada', 'cerrada'].includes(ronda.fase);
    const [filas] = await tx.query(
        `SELECT v.id_usuario, u.nombre, u.username, v.carta IS NOT NULL AS listo,
                CASE WHEN ? = 1 OR v.id_usuario = ? THEN v.carta ELSE NULL END AS carta
         FROM planning_votos v JOIN usuarios u ON u.id_usuario = v.id_usuario
         WHERE v.id_ronda = ? ORDER BY u.nombre, v.id_usuario`,
        [publicas ? 1 : 0, idUsuario, ronda.id_ronda]
    );
    return filas;
}

function puntosPorConsenso(participantes) {
    const primera = participantes[0]?.carta;
    if (!mazo.includes(primera) || primera === '?') return null;
    return participantes.every((persona) => persona.carta === primera) ? Number(primera) : null;
}

function consultar(idProyecto, idUsuario) {
    return conMesa(idProyecto, idUsuario, false, async (tx, actor, desarrolladores, ronda) => {
        if (ronda) {
            ronda.participantes = await leerCartas(tx, ronda, idUsuario);
            ronda.consenso = ronda.fase === 'revelada' ? puntosPorConsenso(ronda.participantes) : null;
        }
        return { id_usuario: idUsuario, rol: actor.rol, mazo, desarrolladores, ronda };
    });
}

async function crearRonda(tx, idProyecto, idHistoria, numero, votantes) {
    const [resultado] = await tx.query(
        'INSERT INTO planning_rondas (id_proyecto, id_historia, numero) VALUES (?, ?, ?)',
        [idProyecto, idHistoria, numero]
    );
    await tx.query('INSERT INTO planning_votos (id_ronda, id_usuario) VALUES ?',
        [votantes.map((id) => [resultado.insertId, id])]);
}

async function guardarAcuerdo(tx, idProyecto, ronda, idUsuario, participantes) {
    const puntos = puntosPorConsenso(participantes);
    if (puntos === null) throw new ErrorMesa(409, 'Comenten las diferencias o dudas y voten de nuevo hasta coincidir en una carta numérica.');
    const [[historia]] = await tx.query(
        'SELECT puntos FROM product_backlog WHERE id_proyecto = ? AND id_historia = ? FOR UPDATE',
        [idProyecto, ronda.id_historia]
    );
    if (!historia) throw new ErrorMesa(404, 'La historia ya no está en este proyecto.');
    if (historia.puntos !== puntos) {
        await tx.query('UPDATE product_backlog SET puntos = ? WHERE id_historia = ? AND id_proyecto = ?',
            [puntos, ronda.id_historia, idProyecto]);
        const cambio = { campo: 'Puntos (Planning Poker)', antes: historia.puntos, despues: puntos };
        await tx.query('INSERT INTO historial_cambios_historias (id_historia, id_usuario, cambios) VALUES (?, ?, ?)',
            [ronda.id_historia, idUsuario, JSON.stringify([cambio])]);
    }
    await tx.query("UPDATE planning_rondas SET fase = 'cerrada', puntos_acordados = ? WHERE id_ronda = ?",
        [puntos, ronda.id_ronda]);
}

function actualizar(idProyecto, idUsuario, accion, datos) {
    return conMesa(idProyecto, idUsuario, true, async (tx, actor, desarrolladores, ronda) => {
        const rolNecesario = accion === 'votar' ? 'Desarrollador' : 'Scrum Master';
        if (actor.rol !== rolNecesario) {
            throw new ErrorMesa(403, accion === 'votar' ? 'Votan los desarrolladores invitados a la ronda.' : 'El Scrum Master del proyecto dirige la mesa.');
        }
        if (datos.id_ronda !== (ronda?.id_ronda ?? null)) {
            throw new ErrorMesa(409, 'La mesa cambió. Revisa la ronda actual.');
        }
        const activa = ronda && ['votacion', 'revelada'].includes(ronda.fase);
        if (accion === 'iniciar') {
            if (activa) throw new ErrorMesa(409, 'Ya hay una votación abierta en este proyecto.');
            const votantes = datos.participantes;
            if (!idValido(datos.id_historia) || !Array.isArray(votantes) || !votantes.length) {
                throw new ErrorMesa(400, 'Elige una historia y al menos un desarrollador presente.');
            }
            const elegibles = new Set(desarrolladores.map((persona) => persona.id_usuario));
            if (new Set(votantes).size !== votantes.length || votantes.some((id) => !elegibles.has(id))) {
                throw new ErrorMesa(400, 'Revisa los participantes. Deben ser desarrolladores activos de este proyecto.');
            }
            const [[historia]] = await tx.query(
                'SELECT id_historia FROM product_backlog WHERE id_proyecto = ? AND id_historia = ? FOR UPDATE',
                [idProyecto, datos.id_historia]
            );
            if (!historia) throw new ErrorMesa(404, 'No encontramos esa historia en este proyecto.');
            await crearRonda(tx, idProyecto, datos.id_historia, 1, votantes);
            return;
        }
        if (!activa) throw new ErrorMesa(409, 'No hay una ronda abierta.');
        if (accion === 'cancelar') {
            await tx.query("UPDATE planning_rondas SET fase = 'cancelada' WHERE id_ronda = ?", [ronda.id_ronda]);
            return;
        }
        const participantes = await leerCartas(tx, ronda, idUsuario);
        if (accion === 'votar') {
            if (ronda.fase !== 'votacion') throw new ErrorMesa(409, 'Las cartas ya se revelaron.');
            if (!participantes.some((persona) => persona.id_usuario === idUsuario)) throw new ErrorMesa(403, 'Observas esta ronda. Tu cuenta no está en la lista de votantes.');
            if (!mazo.includes(datos.carta)) throw new ErrorMesa(400, 'Elige una carta del mazo.');
            await tx.query('UPDATE planning_votos SET carta = ? WHERE id_ronda = ? AND id_usuario = ?',
                [datos.carta, ronda.id_ronda, idUsuario]);
            return;
        }
        if (accion === 'revelar') {
            if (ronda.fase !== 'votacion' || !participantes.length || participantes.some((persona) => !persona.listo)) {
                throw new ErrorMesa(409, 'Las cartas se revelan cuando todos los participantes han votado.');
            }
            await tx.query("UPDATE planning_rondas SET fase = 'revelada' WHERE id_ronda = ?", [ronda.id_ronda]);
            return;
        }
        if (ronda.fase !== 'revelada') throw new ErrorMesa(409, 'Primero revela las cartas de esta ronda.');
        if (accion === 'repetir') {
            const elegibles = new Set(desarrolladores.map((persona) => persona.id_usuario));
            const votantes = participantes.map((persona) => persona.id_usuario).filter((id) => elegibles.has(id));
            if (!votantes.length) throw new ErrorMesa(409, 'Cancela la ronda y selecciona los desarrolladores disponibles.');
            await tx.query("UPDATE planning_rondas SET fase = 'repetida' WHERE id_ronda = ?", [ronda.id_ronda]);
            await crearRonda(tx, idProyecto, ronda.id_historia, ronda.numero + 1, votantes);
            return;
        }
        if (accion !== 'guardar') throw new ErrorMesa(400, 'Acción de Planning Poker desconocida.');
        await guardarAcuerdo(tx, idProyecto, ronda, idUsuario, participantes);
    });
}

module.exports = { consultar, actualizar, ErrorMesa };
