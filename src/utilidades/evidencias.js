// Reglas compartidas de los archivos de evidencia (PB-18 los sube, PB-19 los consulta).
const path = require('path');

// Carpeta donde se guardan los archivos (uploads/evidencias en la raíz del proyecto).
const DIRECTORIO_EVIDENCIAS = path.join(__dirname, '..', '..', 'uploads', 'evidencias');

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;
const MAXIMO_ARCHIVOS_POR_HISTORIA = 10;

const empiezaCon = (contenido, bytes) => bytes.every((byte, i) => contenido[i] === byte);
const texto = (contenido, desde, hasta) => contenido.toString('latin1', desde, hasta);
const esZip = (contenido) => empiezaCon(contenido, [0x50, 0x4b, 0x03, 0x04]);

// Solo se aceptan estos formatos. El tipo MIME se decide aquí (nunca el que diga el navegador)
// y se comprueba que el contenido corresponda a la extensión (los primeros bytes del archivo).
// No se admiten HTML ni SVG: un archivo subido no debe poder ejecutar scripts.
const TIPOS_PERMITIDOS = {
    '.png': { mime: 'image/png', coincide: (c) => empiezaCon(c, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
    '.jpg': { mime: 'image/jpeg', coincide: (c) => empiezaCon(c, [0xff, 0xd8, 0xff]) },
    '.jpeg': { mime: 'image/jpeg', coincide: (c) => empiezaCon(c, [0xff, 0xd8, 0xff]) },
    '.gif': { mime: 'image/gif', coincide: (c) => ['GIF87a', 'GIF89a'].includes(texto(c, 0, 6)) },
    '.webp': {
        mime: 'image/webp',
        coincide: (c) => c.length >= 12 && texto(c, 0, 4) === 'RIFF' && texto(c, 8, 12) === 'WEBP'
    },
    '.pdf': { mime: 'application/pdf', coincide: (c) => c.subarray(0, 1024).includes('%PDF-') },
    '.txt': { mime: 'text/plain', coincide: (c) => !c.subarray(0, 8192).includes(0) },
    '.zip': { mime: 'application/zip', coincide: esZip },
    '.docx': {
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        coincide: esZip
    },
    '.xlsx': {
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        coincide: esZip
    }
};

const EXTENSIONES_PERMITIDAS = Object.keys(TIPOS_PERMITIDOS);

// Ruta del archivo dentro de la carpeta de evidencias, o null si el nombre intenta salirse de ella.
const rutaDeEvidencia = (nombreArchivo) => {
    if (typeof nombreArchivo !== 'string' || !nombreArchivo || path.basename(nombreArchivo) !== nombreArchivo) {
        return null;
    }
    const ruta = path.join(DIRECTORIO_EVIDENCIAS, nombreArchivo);
    return path.dirname(ruta) === DIRECTORIO_EVIDENCIAS ? ruta : null;
};

// Deja solo el nombre del archivo (sin carpetas ni caracteres de control), máximo 200 caracteres.
const limpiarNombreOriginal = (valor) => {
    const base = String(valor || '')
        .split(/[\\/]/).pop()
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim();
    if (base.length <= 200) {
        return base;
    }
    const extension = path.extname(base);
    return base.slice(0, 200 - extension.length) + extension;
};

module.exports = {
    DIRECTORIO_EVIDENCIAS,
    TAMANO_MAXIMO_BYTES,
    MAXIMO_ARCHIVOS_POR_HISTORIA,
    TIPOS_PERMITIDOS,
    EXTENSIONES_PERMITIDAS,
    rutaDeEvidencia,
    limpiarNombreOriginal
};
