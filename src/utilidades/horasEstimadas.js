// PB-46: reglas de las horas estimadas de una historia (las mismas en el navegador y el servidor).

const HORAS_ESTIMADAS_MAXIMAS = 999;

// Devuelve { error } o { horas } ya normalizadas. Vacío o null = quitar la estimación (horas: null).
const validarHorasEstimadas = (valor) => {
    if (valor === null || valor === undefined) return { horas: null };
    const texto = typeof valor === 'number' ? String(valor) : typeof valor === 'string' ? valor.trim() : null;
    if (texto === null) return { error: 'Las horas estimadas deben ser un número.' };
    if (texto === '') return { horas: null };
    if (!/^-?\d+(\.\d+)?$/.test(texto)) {
        return { error: 'Las horas estimadas deben ser un número, por ejemplo 6.5 (usa punto decimal).' };
    }
    const horas = Number(texto);
    if (horas <= 0) return { error: 'Las horas estimadas deben ser mayores que 0.' };
    if (horas > HORAS_ESTIMADAS_MAXIMAS) {
        return { error: `Las horas estimadas no pueden superar ${HORAS_ESTIMADAS_MAXIMAS} horas.` };
    }
    if (Math.abs(horas * 100 - Math.round(horas * 100)) > 1e-9) {
        return { error: 'Usa máximo 2 decimales en las horas estimadas (por ejemplo 2.25).' };
    }
    return { horas: Math.round(horas * 100) / 100 };
};

module.exports = { HORAS_ESTIMADAS_MAXIMAS, validarHorasEstimadas };
