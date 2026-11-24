// PB-62 (Nino) · Velocidad del equipo.
// Para cada Sprint FINALIZADO: puntos planeados (todas sus historias) y puntos completados
// (historias terminadas o aprobadas, la misma regla del Burndown). El promedio de los últimos
// 3 Sprints finalizados se sugiere como capacidad para planificar el siguiente.
const conexion = require('../base_de_datos/conexion');
const proyectoDAO = require('../dao/proyectoDAO');
const { ESTADOS_COMPLETADOS } = require('../utilidades/burndown');

const SPRINTS_PARA_PROMEDIO = 3;

const consultarVelocidad = async (req, res) => {
    const valor = req.params.id;
    if (!/^[1-9]\d{0,9}$/.test(String(valor))) {
        return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
    }
    const idProyecto = Number(valor);
    try {
        if (!await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario)) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        const marcas = ESTADOS_COMPLETADOS.map(() => '?').join(', ');
        const [filas] = await conexion.promise().query(
            `SELECT s.id_sprint, s.numero, s.nombre,
                    DATE_FORMAT(s.fecha_fin, '%Y-%m-%d') AS fecha_fin,
                    COALESCE(SUM(h.puntos), 0) AS planeados,
                    COALESCE(SUM(CASE WHEN h.estado_historia IN (${marcas}) THEN h.puntos ELSE 0 END), 0) AS completados
             FROM sprints s
             LEFT JOIN product_backlog h ON h.id_sprint = s.id_sprint
             WHERE s.id_proyecto = ? AND s.estado = 'Finalizado'
             GROUP BY s.id_sprint, s.numero, s.nombre, s.fecha_fin
             ORDER BY s.fecha_inicio ASC, s.numero ASC`,
            [...ESTADOS_COMPLETADOS, idProyecto]
        );
        const sprints = filas.map((fila) => ({
            id_sprint: fila.id_sprint,
            numero: Number(fila.numero),
            nombre: fila.nombre,
            fecha_fin: fila.fecha_fin,
            planeados: Number(fila.planeados),
            completados: Number(fila.completados)
        }));
        const ultimos = sprints.slice(-SPRINTS_PARA_PROMEDIO);
        const promedio = ultimos.length
            ? Math.round((ultimos.reduce((total, s) => total + s.completados, 0) / ultimos.length) * 10) / 10
            : null;
        res.json({
            sprints,
            promedio,
            sprints_promediados: ultimos.length,
            capacidad_sugerida: promedio === null ? null : Math.round(promedio)
        });
    } catch (error) {
        console.error('Error al consultar la velocidad:', error.code || error.message);
        res.status(500).json({ mensaje: 'No se pudo calcular la velocidad del equipo.' });
    }
};

module.exports = { consultarVelocidad };
