const fs = require('fs');
const proyectoDAO = require('../dao/proyectoDAO');
const revisionDAO = require('../dao/revisionDAO');
const { rutaDeEvidencia } = require('../utilidades/evidencias');

// Solo estos tipos se muestran dentro del navegador; el resto se descarga.
// (Nunca se sirve HTML ni SVG en línea: un archivo subido no debe poder ejecutar scripts.)
const TIPOS_EN_LINEA = new Set([
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'
]);

const DECISIONES = ['Aprobada', 'Rechazada'];
const LONGITUD_MAXIMA_OBSERVACIONES = 2000;
const LONGITUD_MINIMA_RECHAZO = 5;

const errorServidor = (res, contexto, error) => {
    console.error(`${contexto}:`, error.code || error.message);
    return res.status(500).json({ mensaje: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' });
};

const idPositivo = (valor) =>
    /^\d{1,10}$/.test(String(valor)) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0;

// Solo el Product Owner de ESE proyecto (rol dentro del proyecto, no el rol global de la cuenta).
// Responde y devuelve false si no procede.
const autorizarProductOwner = async (req, res, idProyecto, mensajeError) => {
    const rol = await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario);
    if (!rol) {
        mensajeError(404, 'No encontramos ese proyecto.');
        return false;
    }
    if (rol !== 'Product Owner') {
        mensajeError(403, 'Solo el Product Owner del proyecto puede revisar entregables.');
        return false;
    }
    return true;
};

const responderJson = (res) => (estado, mensaje) => res.status(estado).json({ mensaje });
const responderTexto = (res) => (estado, mensaje) => res.status(estado).type('text/plain').send(mensaje);

// Valida la decisión (PB-20). Devuelve { error } o { decision, observaciones }.
const validarDecision = (cuerpo) => {
    const { decision, observaciones } = cuerpo || {};
    if (!DECISIONES.includes(decision)) {
        return { error: 'Selecciona si el entregable se aprueba o se rechaza.' };
    }
    if (observaciones !== undefined && observaciones !== null && typeof observaciones !== 'string') {
        return { error: 'Las observaciones no son válidas.' };
    }
    const texto = (observaciones || '').trim();
    if (texto.length > LONGITUD_MAXIMA_OBSERVACIONES) {
        return { error: `Las observaciones no pueden superar los ${LONGITUD_MAXIMA_OBSERVACIONES} caracteres.` };
    }
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(texto)) {
        return { error: 'Las observaciones contienen caracteres no permitidos.' };
    }
    if (decision === 'Rechazada' && texto.length < LONGITUD_MINIMA_RECHAZO) {
        return {
            error: `Explica el motivo del rechazo (mínimo ${LONGITUD_MINIMA_RECHAZO} caracteres) para que el equipo sepa qué corregir.`
        };
    }
    return { decision, observaciones: texto || null };
};

// PB-19: lista de historias enviadas a revisión.
const listarRevisiones = async (req, res) => {
    if (!idPositivo(req.params.id)) {
        return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
    }
    const idProyecto = Number(req.params.id);
    try {
        if (!await autorizarProductOwner(req, res, idProyecto, responderJson(res))) {
            return;
        }
        res.json({ historias: await revisionDAO.listarParaRevision(idProyecto) });
    } catch (error) {
        errorServidor(res, 'Error al consultar las revisiones', error);
    }
};

// PB-19: detalle de una historia en revisión (criterios, evidencias, responsable e historial).
const consultarRevision = async (req, res) => {
    const { id, idHistoria } = req.params;
    if (!idPositivo(id) || !idPositivo(idHistoria)) {
        return res.status(404).json({ mensaje: 'No encontramos esa historia.' });
    }
    try {
        if (!await autorizarProductOwner(req, res, Number(id), responderJson(res))) {
            return;
        }
        const detalle = await revisionDAO.obtenerDetalle(Number(id), Number(idHistoria));
        if (!detalle) {
            return res.status(404).json({ mensaje: 'Esa historia no está en revisión.' });
        }
        res.json(detalle);
    } catch (error) {
        errorServidor(res, 'Error al consultar la revisión', error);
    }
};

// PB-19: abre o descarga un archivo de evidencia.
const abrirEvidencia = async (req, res) => {
    const { id, idHistoria, idEvidencia } = req.params;
    const responder = responderTexto(res);
    if (!idPositivo(id) || !idPositivo(idHistoria) || !idPositivo(idEvidencia)) {
        return responder(404, 'No encontramos ese archivo.');
    }
    try {
        if (!await autorizarProductOwner(req, res, Number(id), responder)) {
            return;
        }
        const evidencia = await revisionDAO.obtenerEvidencia(Number(id), Number(idHistoria), Number(idEvidencia));
        if (!evidencia) {
            return responder(404, 'No encontramos ese archivo.');
        }
        // El nombre guardado nunca puede salirse de la carpeta de evidencias.
        const ruta = rutaDeEvidencia(evidencia.nombre_archivo);
        if (!ruta) {
            return responder(404, 'No encontramos ese archivo.');
        }
        const estadistica = await fs.promises.stat(ruta).catch(() => null);
        if (!estadistica || !estadistica.isFile()) {
            return responder(404, 'El archivo ya no está disponible en el servidor.');
        }
        const enLinea = TIPOS_EN_LINEA.has(evidencia.tipo_mime);
        res.set({
            'Content-Type': enLinea ? evidencia.tipo_mime : 'application/octet-stream',
            'Content-Length': String(estadistica.size),
            'Content-Disposition': `${enLinea ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(evidencia.nombre_original)}`,
            'X-Content-Type-Options': 'nosniff'
        });
        fs.createReadStream(ruta)
            .on('error', () => res.destroy())
            .pipe(res);
    } catch (error) {
        console.error('Error al abrir la evidencia:', error.code || error.message);
        responder(500, 'No se pudo abrir el archivo.');
    }
};

// PB-20: aprobar o rechazar con observaciones.
const registrarDecision = async (req, res) => {
    const { id, idHistoria } = req.params;
    if (!idPositivo(id) || !idPositivo(idHistoria)) {
        return res.status(404).json({ mensaje: 'No encontramos esa historia.' });
    }
    const datos = validarDecision(req.body);
    if (datos.error) {
        return res.status(400).json({ mensaje: datos.error });
    }
    try {
        if (!await autorizarProductOwner(req, res, Number(id), responderJson(res))) {
            return;
        }
        const resultado = await revisionDAO.registrarDecision(
            Number(id), Number(idHistoria), req.session.idUsuario, datos.decision, datos.observaciones
        );
        if (resultado.noEncontrada) {
            return res.status(404).json({ mensaje: 'No encontramos esa historia.' });
        }
        if (resultado.estadoActual) {
            return res.status(409).json({
                mensaje: 'Esta historia ya no está en revisión. Actualiza la lista para ver su estado actual.'
            });
        }
        res.status(201).json({
            mensaje: datos.decision === 'Aprobada'
                ? 'Entregable aprobado. La decisión quedó registrada.'
                : 'Entregable rechazado. Tus observaciones quedaron registradas para el equipo.',
            revision: resultado.revision
        });
    } catch (error) {
        errorServidor(res, 'Error al registrar la decisión', error);
    }
};

module.exports = {
    listarRevisiones,
    consultarRevision,
    abrirEvidencia,
    registrarDecision
};
