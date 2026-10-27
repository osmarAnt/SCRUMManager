// Cálculo del Burndown Chart. Son funciones puras (sin base de datos) para poder probarlas fácilmente.
// Las fechas siempre viajan como texto 'AAAA-MM-DD' y se operan en UTC para evitar desfases de zona horaria.

// Estados de una historia cuyos puntos ya NO cuentan como pendientes.
// 'Terminada': el equipo la terminó. 'En revision' y 'Aprobada': ya está entregada o aceptada.
// 'Rechazada' y los demás estados siguen pendientes.
const ESTADOS_COMPLETADOS = ['Terminada', 'En revision', 'Aprobada'];

const NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MS_DIA = 86400000;

const fechaAMs = (texto) => {
    const [anio, mes, dia] = texto.split('-').map(Number);
    return Date.UTC(anio, mes - 1, dia);
};

const msAFecha = (ms) => new Date(ms).toISOString().slice(0, 10);

// ['2026-10-19', '2026-10-20', ...] desde inicio hasta fin, ambos incluidos.
const listarFechas = (inicio, fin) => {
    const fechas = [];
    for (let ms = fechaAMs(inicio); ms <= fechaAMs(fin); ms += MS_DIA) {
        fechas.push(msAFecha(ms));
    }
    return fechas;
};

// '2026-10-19' -> 'Lun 19'
const etiquetaDia = (fecha) =>
    `${NOMBRES_DIA[new Date(fechaAMs(fecha)).getUTCDay()]} ${Number(fecha.slice(8, 10))}`;

const redondear = (valor) => Math.round(valor * 10) / 10;

// Arma los puntos de las dos líneas.
//  - Ideal: baja en línea recta desde la línea base hasta 0 en el último día del Sprint.
//  - Real:  puntos pendientes guardados en el historial de cada día (null si el día aún no llega).
// historial: [{ fecha, puntos_restantes }]
const construirSerie = ({ fechaInicio, fechaFin, hoy, lineaBase, historial }) => {
    const fechas = listarFechas(fechaInicio, fechaFin);
    const total = fechas.length;
    const porFecha = new Map(historial.map((fila) => [fila.fecha, fila]));

    const dias = [{
        indice: 0,
        fecha: null,
        etiqueta: 'Inicio',
        ideal: redondear(lineaBase),
        real: lineaBase
    }];

    fechas.forEach((fecha, posicion) => {
        const numero = posicion + 1;
        const fila = fecha <= hoy ? porFecha.get(fecha) : null;
        dias.push({
            indice: numero,
            fecha,
            etiqueta: etiquetaDia(fecha),
            ideal: redondear(lineaBase * (total - numero) / total),
            real: fila ? fila.puntos_restantes : null
        });
    });

    return dias;
};

// Resume dónde va el equipo comparando la línea real con la ideal en el último día registrado.
const resumirAvance = ({ dias, hoy, fechaInicio, fechaFin }) => {
    const registrados = dias.filter((dia) => dia.real !== null);
    const ultimo = registrados[registrados.length - 1];
    const restantes = ultimo.real;
    let ritmo;
    if (hoy < fechaInicio) {
        ritmo = 'Sin iniciar';
    } else if (restantes === 0) {
        ritmo = 'Completado';
    } else if (hoy > fechaFin) {
        ritmo = 'Con puntos pendientes';
    } else {
        ritmo = restantes <= ultimo.ideal ? 'En ritmo' : 'Atrasado';
    }
    return { restantes, idealHoy: ultimo.ideal, ritmo };
};

module.exports = {
    ESTADOS_COMPLETADOS,
    fechaAMs,
    listarFechas,
    etiquetaDia,
    construirSerie,
    resumirAvance
};
