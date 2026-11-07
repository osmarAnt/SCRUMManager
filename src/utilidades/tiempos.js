// PB-32 y PB-33: reglas del registro de tiempo.

const HORAS_MAXIMAS_POR_REGISTRO = 24;
const DIAS_HACIA_ATRAS_PERMITIDOS = 365;

const dosDigitos = (numero) => String(numero).padStart(2, '0');

// 'AAAA-MM-DD' con la hora LOCAL del servidor (toISOString usaría UTC y por la tarde/noche
// ya marcaría el día siguiente).
const fechaLocal = (fecha = new Date()) =>
    `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;

const hace = (dias, ahora = new Date()) =>
    fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - dias));

// true si 'AAAA-MM-DD' es un día que existe en el calendario (rechaza 2026-02-30, 2026-13-01...).
const esFechaReal = (texto) => {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if (!partes) {
        return false;
    }
    const [, anio, mes, dia] = partes.map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
};

// Valida lo que llega del formulario. Devuelve { error } o { horas, fecha } ya normalizados.
// Todas las reglas se comprueban aquí aunque el navegador ya las revise: el servidor manda.
const validarRegistroTiempo = (cuerpo, ahora = new Date()) => {
    const { horas, fecha_trabajo: fecha } = cuerpo || {};

    // --- Duración ---
    const texto = typeof horas === 'number' ? String(horas) : typeof horas === 'string' ? horas.trim() : '';
    if (texto === '') {
        return { error: 'Escribe la duración en horas.' };
    }
    if (!/^-?\d+(\.\d+)?$/.test(texto)) {
        return { error: 'La duración debe ser un número, por ejemplo 1.5 (usa punto decimal).' };
    }
    const duracion = Number(texto);
    if (duracion <= 0) {
        return { error: 'La duración debe ser mayor que 0.' };
    }
    if (duracion > HORAS_MAXIMAS_POR_REGISTRO) {
        return { error: `La duración no puede superar ${HORAS_MAXIMAS_POR_REGISTRO} horas por registro.` };
    }
    if (Math.abs(duracion * 100 - Math.round(duracion * 100)) > 1e-9) {
        return { error: 'Usa máximo 2 decimales en la duración (por ejemplo 1.25).' };
    }

    // --- Fecha de trabajo ---
    if (typeof fecha !== 'string' || fecha.trim() === '') {
        return { error: 'Selecciona la fecha de trabajo.' };
    }
    if (!esFechaReal(fecha)) {
        return { error: 'La fecha no es válida. Usa el formato AAAA-MM-DD con un día que exista.' };
    }
    if (fecha > fechaLocal(ahora)) {
        return { error: 'La fecha de trabajo no puede ser futura.' };
    }
    if (fecha < hace(DIAS_HACIA_ATRAS_PERMITIDOS, ahora)) {
        return { error: 'La fecha de trabajo no puede ser anterior a un año.' };
    }

    return { horas: Math.round(duracion * 100) / 100, fecha };
};

// Suma decimales sin errores de punto flotante (0.1 + 0.2 = 0.3): trabaja en centésimas.
const sumarHoras = (valores) =>
    valores.reduce((total, valor) => total + Math.round(Number(valor) * 100), 0) / 100;

module.exports = {
    HORAS_MAXIMAS_POR_REGISTRO,
    DIAS_HACIA_ATRAS_PERMITIDOS,
    fechaLocal,
    esFechaReal,
    validarRegistroTiempo,
    sumarHoras
};