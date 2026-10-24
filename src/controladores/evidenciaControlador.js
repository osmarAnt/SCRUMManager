// PB-18: el desarrollador responsable adjunta evidencias a su historia y la envía a revisión.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const proyectoDAO = require('../dao/proyectoDAO');
const evidenciaDAO = require('../dao/evidenciaDAO');
const {
    DIRECTORIO_EVIDENCIAS,
    TAMANO_MAXIMO_BYTES,
    MAXIMO_ARCHIVOS_POR_HISTORIA,
    TIPOS_PERMITIDOS,
    EXTENSIONES_PERMITIDAS,
    rutaDeEvidencia,
    limpiarNombreOriginal
} = require('../utilidades/evidencias');

const MEGABYTES_MAXIMOS = TAMANO_MAXIMO_BYTES / (1024 * 1024);

const idPositivo = (valor) =>
    /^\d{1,10}$/.test(String(valor)) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0;

// Responde con el estado del error si es uno controlado; si no, un 500 genérico.
const responderError = (res, contexto, error) => {
    if (error && error.status) {
        return res.status(error.status).json({ mensaje: error.message });
    }
    console.error(`${contexto}:`, error.code || error.message);
    return res.status(500).json({ mensaje: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' });
};

// Qué puede hacer el desarrollador según el estado de la historia y cuántos archivos tiene.
const describirSituacion = (estado, totalEvidencias) => {
    const puedeAdjuntar = evidenciaDAO.ESTADOS_EDITABLES.includes(estado);
    const puedeEnviar = evidenciaDAO.ESTADOS_ENVIABLES.includes(estado) && totalEvidencias > 0;
    const listaParaEnviar = totalEvidencias > 0
        ? 'Lista para enviar a revisión.'
        : 'Adjunta al menos un archivo de evidencia para poder enviarla a revisión.';
    const ayudas = {
        'Pendiente': 'La historia todavía no se inicia. Márcala como "En curso" para adjuntar evidencias.',
        'En curso': 'Puedes ir adjuntando evidencias. Para enviarla a revisión, primero márcala como "Terminado".',
        'Terminada': listaParaEnviar,
        'Rechazada': `El Product Owner rechazó la entrega. Corrige lo que indicó y adjunta nuevas evidencias si hace falta. ${listaParaEnviar}`,
        'En revision': 'Enviada a revisión. Esperando la decisión del Product Owner.',
        'Aprobada': 'El Product Owner aprobó esta historia.'
    };
    return { puedeAdjuntar, puedeEnviar, ayuda: ayudas[estado] || '' };
};

// Middleware: comprueba que el usuario sea Desarrollador del proyecto y responsable de la historia.
// Va antes de leer el archivo, para no recibir datos de quien no tiene permiso.
const autorizarResponsable = async (req, res, next) => {
    const { id, idHistoria } = req.params;
    if (!idPositivo(id) || !idPositivo(idHistoria)) {
        return res.status(404).json({ mensaje: 'No encontramos esa historia.' });
    }
    try {
        const idProyecto = Number(id);
        const rol = await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario);
        if (!rol) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        if (rol !== 'Desarrollador') {
            return res.status(403).json({ mensaje: 'Solo el desarrollador responsable puede adjuntar evidencias.' });
        }
        const contexto = await evidenciaDAO.obtenerContexto(idProyecto, Number(idHistoria));
        if (!contexto) {
            return res.status(404).json({ mensaje: 'No encontramos esa historia.' });
        }
        if (Number(contexto.historia.id_responsable) !== Number(req.session.idUsuario)) {
            return res.status(403).json({ mensaje: 'Solo el responsable de la historia puede gestionar sus evidencias.' });
        }
        req.contexto = { idProyecto, idHistoria: Number(idHistoria), ...contexto };
        next();
    } catch (error) {
        responderError(res, 'Error al autorizar evidencias', error);
    }
};

// Middleware de la subida: rechaza de entrada lo que no tiene caso leer (estado, límite, tamaño).
const validarSubida = (req, res, next) => {
    const { historia, evidencias } = req.contexto;
    if (!evidenciaDAO.ESTADOS_EDITABLES.includes(historia.estado_historia)) {
        return res.status(409).json({ mensaje: evidenciaDAO.explicarEstado(historia.estado_historia) });
    }
    if (evidencias.length >= MAXIMO_ARCHIVOS_POR_HISTORIA) {
        return res.status(409).json({
            mensaje: `Una historia admite hasta ${MAXIMO_ARCHIVOS_POR_HISTORIA} archivos. Quita alguno para adjuntar otro.`
        });
    }
    if (Number(req.get('content-length')) > TAMANO_MAXIMO_BYTES) {
        return res.status(413).json({ mensaje: `El archivo supera el límite de ${MEGABYTES_MAXIMOS} MB.` });
    }
    next();
};

// Middleware: lee el archivo (cuerpo binario) con respuestas en JSON ante cualquier problema.
const leerArchivo = (req, res, next) => {
    express.raw({ type: 'application/octet-stream', limit: TAMANO_MAXIMO_BYTES })(req, res, (error) => {
        if (!error) {
            return next();
        }
        if (error.type === 'entity.too.large') {
            return res.status(413).json({ mensaje: `El archivo supera el límite de ${MEGABYTES_MAXIMOS} MB.` });
        }
        return res.status(400).json({ mensaje: 'No se pudo leer el archivo.' });
    });
};

// Evidencias de la historia y qué acciones están disponibles.
const listarEvidencias = (req, res) => {
    const { historia, evidencias } = req.contexto;
    res.json({
        estado_historia: historia.estado_historia,
        ...describirSituacion(historia.estado_historia, evidencias.length),
        limites: {
            maximo_archivos: MAXIMO_ARCHIVOS_POR_HISTORIA,
            tamano_maximo_bytes: TAMANO_MAXIMO_BYTES,
            extensiones: EXTENSIONES_PERMITIDAS
        },
        evidencias
    });
};

const subirEvidencia = async (req, res) => {
    const { idProyecto, idHistoria } = req.contexto;
    const contenido = Buffer.isBuffer(req.body) ? req.body : null;
    if (!contenido || contenido.length === 0) {
        return res.status(400).json({ mensaje: 'No se recibió el archivo o está vacío.' });
    }

    let nombreOriginal;
    try {
        nombreOriginal = limpiarNombreOriginal(decodeURIComponent(req.get('x-nombre-archivo') || ''));
    } catch (error) {
        return res.status(400).json({ mensaje: 'El nombre del archivo no es válido.' });
    }
    const extension = path.extname(nombreOriginal).toLowerCase();
    const tipo = TIPOS_PERMITIDOS[extension];
    if (!nombreOriginal || !tipo) {
        return res.status(400).json({
            mensaje: `Formato no permitido. Puedes adjuntar: ${EXTENSIONES_PERMITIDAS.join(', ')}.`
        });
    }
    if (!tipo.coincide(contenido)) {
        return res.status(400).json({ mensaje: `El contenido de "${nombreOriginal}" no corresponde a un archivo ${extension}.` });
    }

    // El archivo se guarda con un nombre aleatorio: el nombre que envía el usuario nunca toca el disco.
    const nombreArchivo = `${crypto.randomUUID()}${extension}`;
    const ruta = rutaDeEvidencia(nombreArchivo);
    try {
        await fs.promises.mkdir(DIRECTORIO_EVIDENCIAS, { recursive: true });
        await fs.promises.writeFile(ruta, contenido, { flag: 'wx' });
    } catch (error) {
        return responderError(res, 'Error al guardar la evidencia', error);
    }
    try {
        const evidencia = await evidenciaDAO.registrarEvidencia(idProyecto, idHistoria, req.session.idUsuario, {
            nombreOriginal,
            nombreArchivo,
            tipoMime: tipo.mime,
            tamano: contenido.length
        });
        res.status(201).json({ mensaje: `Se adjuntó "${nombreOriginal}".`, evidencia });
    } catch (error) {
        // Si no se pudo registrar, no se deja un archivo huérfano en disco.
        await fs.promises.unlink(ruta).catch(() => {});
        responderError(res, 'Error al registrar la evidencia', error);
    }
};

const quitarEvidencia = async (req, res) => {
    const { idProyecto, idHistoria } = req.contexto;
    if (!idPositivo(req.params.idEvidencia)) {
        return res.status(404).json({ mensaje: 'No encontramos ese archivo.' });
    }
    try {
        const { nombre_archivo: nombreArchivo } = await evidenciaDAO.eliminarEvidencia(
            idProyecto, idHistoria, req.session.idUsuario, Number(req.params.idEvidencia)
        );
        const ruta = rutaDeEvidencia(nombreArchivo);
        if (ruta) {
            await fs.promises.unlink(ruta).catch(() => {});
        }
        res.json({ mensaje: 'Archivo quitado.' });
    } catch (error) {
        responderError(res, 'Error al quitar la evidencia', error);
    }
};

const enviarARevision = async (req, res) => {
    const { idProyecto, idHistoria } = req.contexto;
    try {
        await evidenciaDAO.enviarARevision(idProyecto, idHistoria, req.session.idUsuario);
        res.json({
            mensaje: 'Historia enviada a revisión. El Product Owner ya puede consultar tus evidencias.',
            estado_historia: 'En revision'
        });
    } catch (error) {
        responderError(res, 'Error al enviar la historia a revisión', error);
    }
};

module.exports = {
    autorizarResponsable,
    validarSubida,
    leerArchivo,
    listarEvidencias,
    subirEvidencia,
    quitarEvidencia,
    enviarARevision
};
