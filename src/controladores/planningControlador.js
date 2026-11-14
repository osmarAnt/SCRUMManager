const planningDAO = require('../dao/planningDAO');

// PB-45: historias agrupadas por Sprint; las que aún no tienen Sprint van al final.
const consultarPlanning = async (req, res) => {
    try {
        const valor = req.params.id;
        if (!/^[1-9]\d{0,9}$/.test(valor) || Number(valor) > 2147483647) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        const idProyecto = Number(valor);
        if (!await planningDAO.esIntegrante(idProyecto, req.session.idUsuario)) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }

        const historias = await planningDAO.obtenerHistorias(idProyecto);
        const grupos = new Map();
        historias.forEach((historia) => {
            const idSprint = historia.id_sprint === null ? null : Number(historia.id_sprint);
            if (!grupos.has(idSprint)) {
                grupos.set(idSprint, {
                    id_sprint: idSprint,
                    numero: historia.sprint_numero === null ? null : Number(historia.sprint_numero),
                    historias: []
                });
            }
            grupos.get(idSprint).historias.push({
                id_historia: Number(historia.id_historia),
                titulo: historia.titulo,
                id_responsable: historia.id_responsable === null ? null : Number(historia.id_responsable),
                responsable: historia.responsable,
                puntos: historia.puntos === null ? null : Number(historia.puntos),
                // No sustituir NULL por cero: todavía no se ha registrado una estimación.
                horas_estimadas: historia.horas_estimadas === null ? null : Number(historia.horas_estimadas)
            });
        });
        res.json({ grupos: [...grupos.values()], total_historias: historias.length });
    } catch (error) {
        console.error('Error al consultar Planning Poker:', error.code || error.message);
        res.status(500).json({ mensaje: 'No se pudo cargar Planning Poker. Inténtalo de nuevo.' });
    }
};

module.exports = { consultarPlanning };
