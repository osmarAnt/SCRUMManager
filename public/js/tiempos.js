// PB-32: el desarrollador registra horas y fecha de trabajo en sus historias asignadas.
// PB-33: el Scrum Master consulta el acumulado de horas por historia y por desarrollador.
(() => {
    'use strict';

    const panel = document.getElementById('panel-tiempos');
    if (!panel) {
        return;
    }

    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const porId = (id) => document.getElementById(id);

    const seccionDesarrollador = porId('tiempos-desarrollador');
    const seccionScrumMaster = porId('tiempos-scrum-master');
    const seccionSinAcceso = porId('tiempos-sin-acceso');

    // Desarrollador
    const estadoTiempos = porId('tiempos-estado');
    const formulario = porId('form-tiempo');
    const selectorHistoria = porId('historia-tiempo');
    const campoFecha = porId('fecha-tiempo');
    const campoHoras = porId('horas-tiempo');
    const errorTiempo = porId('error-tiempo');
    const confirmacionTiempo = porId('confirmacion-tiempo');
    const botonGuardar = porId('guardar-tiempo');
    const bloqueMisRegistros = porId('mis-registros-tiempo');
    const textoMisTotales = porId('mis-totales-tiempo');
    const cuerpoMisRegistros = porId('cuerpo-mis-registros');

    // Scrum Master
    const estadoResumen = porId('estado-resumen-tiempo');
    const errorResumen = porId('error-resumen-tiempo');
    const contenidoResumen = porId('contenido-resumen-tiempo');
    const cuerpoHistorias = porId('cuerpo-resumen-historias');
    const cuerpoDesarrolladores = porId('cuerpo-resumen-desarrolladores');

    const ETIQUETAS_ESTADO = { 'Terminada': 'Terminado', 'En revision': 'En revisión' };

    let rol = null;
    let pestanaActiva = false;
    let limites = { hoy: '', fecha_minima: '', horas_maximas: 24 };
    let enviando = false;

    const crear = (etiqueta, { clase, texto } = {}, hijos = []) => {
        const nodo = document.createElement(etiqueta);
        if (clase) nodo.className = clase;
        if (texto !== undefined) nodo.textContent = texto;
        nodo.append(...hijos);
        return nodo;
    };

    const formatearHoras = (horas) =>
        `${Number(horas).toLocaleString('es-MX', { maximumFractionDigits: 2 })} h`;

    // 'AAAA-MM-DD' -> '23 oct 2026' (sin zonas horarias: es una fecha de calendario)
    const formatearFecha = (texto) => {
        const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto || '');
        if (!partes) return '—';
        const [, anio, mes, dia] = partes.map(Number);
        return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString('es-MX', {
            day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
        });
    };

    const pedir = async (url, metodo = 'GET', cuerpo) => {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: {
                Accept: 'application/json',
                ...(cuerpo ? { 'Content-Type': 'application/json' } : {})
            },
            cache: 'no-store',
            body: cuerpo ? JSON.stringify(cuerpo) : undefined
        });
        if (respuesta.status === 401) {
            window.location.replace('/login');
            return null;
        }
        const resultado = await respuesta.json().catch(() => ({}));
        return { ok: respuesta.ok, estado: respuesta.status, resultado };
    };

    const filaVacia = (columnas, texto) => {
        const celda = crear('td', { texto });
        celda.colSpan = columnas;
        celda.className = 'sin-horas';
        return crear('tr', {}, [celda]);
    };

    // ---------- PB-32: registrar horas ----------

    // Mismas reglas (y mismos mensajes) que el servidor; el servidor las vuelve a comprobar.
    const esFechaReal = (texto) => {
        const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
        if (!partes) return false;
        const [, anio, mes, dia] = partes.map(Number);
        const fecha = new Date(Date.UTC(anio, mes - 1, dia));
        return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
    };

    const validar = (idHistoria, fecha, textoHoras) => {
        if (!idHistoria) return 'Selecciona la historia.';
        const texto = textoHoras.trim();
        if (texto === '') return 'Escribe la duración en horas.';
        if (!/^-?\d+(\.\d+)?$/.test(texto)) return 'La duración debe ser un número, por ejemplo 1.5 (usa punto decimal).';
        const duracion = Number(texto);
        if (duracion <= 0) return 'La duración debe ser mayor que 0.';
        if (duracion > limites.horas_maximas) return `La duración no puede superar ${limites.horas_maximas} horas por registro.`;
        if (Math.abs(duracion * 100 - Math.round(duracion * 100)) > 1e-9) return 'Usa máximo 2 decimales en la duración (por ejemplo 1.25).';
        if (!fecha) return 'Selecciona la fecha de trabajo.';
        if (!esFechaReal(fecha)) return 'La fecha no es válida. Usa el formato AAAA-MM-DD con un día que exista.';
        if (fecha > limites.hoy) return 'La fecha de trabajo no puede ser futura.';
        if (fecha < limites.fecha_minima) return 'La fecha de trabajo no puede ser anterior a un año.';
        return '';
    };

    const pintarHistorias = (historias) => {
        const seleccionada = selectorHistoria.value;
        selectorHistoria.replaceChildren(...historias.map((historia) => {
            const partes = [
                historia.titulo,
                historia.sprint_numero ? `Sprint ${historia.sprint_numero}` : 'Sin Sprint',
                ETIQUETAS_ESTADO[historia.estado_historia] || historia.estado_historia,
                `mis horas: ${formatearHoras(historia.mis_horas)}`
            ];
            return new Option(partes.join(' · '), historia.id_historia);
        }));
        if (historias.some((h) => String(h.id_historia) === seleccionada)) {
            selectorHistoria.value = seleccionada;
        }
    };

    const pintarMisRegistros = (datos) => {
        bloqueMisRegistros.hidden = datos.total_registros === 0;
        textoMisTotales.textContent =
            `Has registrado ${formatearHoras(datos.total_horas)} en ${datos.total_registros} ` +
            `${datos.total_registros === 1 ? 'registro' : 'registros'}` +
            (datos.total_registros > datos.registros.length ? ` (se muestran los ${datos.registros.length} más recientes).` : '.');
        cuerpoMisRegistros.replaceChildren(...datos.registros.map((registro) => crear('tr', {}, [
            crear('td', { texto: formatearFecha(registro.fecha_trabajo) }),
            crear('td', { clase: 'nombre-historia', texto: registro.titulo }),
            crear('td', { clase: 'numero horas', texto: formatearHoras(registro.horas) })
        ])));
    };

    const cargarMisTiempos = async () => {
        try {
            const respuesta = await pedir(`/proyectos/${idProyecto}/tiempos/mios`);
            if (!respuesta) return;
            if (!respuesta.ok) {
                throw new Error(respuesta.resultado.mensaje || 'No se pudieron cargar tus historias.');
            }
            const datos = respuesta.resultado;
            limites = { hoy: datos.hoy, fecha_minima: datos.fecha_minima, horas_maximas: datos.horas_maximas };
            campoFecha.max = datos.hoy;
            campoFecha.min = datos.fecha_minima;
            if (!campoFecha.value) campoFecha.value = datos.hoy;

            const hayHistorias = datos.historias.length > 0;
            formulario.hidden = !hayHistorias;
            estadoTiempos.hidden = hayHistorias;
            if (hayHistorias) {
                pintarHistorias(datos.historias);
            } else {
                estadoTiempos.textContent =
                    'No tienes historias asignadas en este proyecto. Cuando el Scrum Master te asigne una, podrás registrar horas aquí.';
            }
            pintarMisRegistros(datos);
        } catch (error) {
            console.error(error);
            estadoTiempos.hidden = false;
            estadoTiempos.textContent = error.message || 'No se pudieron cargar tus historias.';
        }
    };

    const registrarHoras = async (evento) => {
        evento.preventDefault();
        if (enviando) return;
        confirmacionTiempo.hidden = true;
        errorTiempo.textContent = '';

        const mensaje = validar(selectorHistoria.value, campoFecha.value, campoHoras.value);
        if (mensaje) {
            errorTiempo.textContent = mensaje;
            return;
        }

        enviando = true;
        botonGuardar.disabled = true;
        try {
            const respuesta = await pedir(
                `/proyectos/${idProyecto}/historias/${selectorHistoria.value}/tiempos`,
                'POST',
                { horas: campoHoras.value.trim(), fecha_trabajo: campoFecha.value }
            );
            if (!respuesta) return;
            if (!respuesta.ok) {
                errorTiempo.textContent = respuesta.resultado.mensaje || 'No se pudo registrar el tiempo.';
                if (respuesta.estado === 403 || respuesta.estado === 404) {
                    await cargarMisTiempos(); // por ejemplo, la historia fue reasignada
                }
                return;
            }
            confirmacionTiempo.textContent = respuesta.resultado.mensaje;
            confirmacionTiempo.hidden = false;
            campoHoras.value = '';
            await cargarMisTiempos();
            campoHoras.focus();
        } catch (error) {
            console.error(error);
            errorTiempo.textContent = 'No se pudo conectar con el servidor.';
        } finally {
            enviando = false;
            botonGuardar.disabled = false;
        }
    };

    // ---------- PB-33: resumen del Scrum Master ----------

    const filaHistoria = (historia) => {
        const nombre = crear('td', {}, [crear('span', { clase: 'nombre-historia', texto: historia.titulo })]);
        if (historia.desarrolladores.length > 1) {
            nombre.append(crear('span', {
                clase: 'detalle-fila',
                texto: historia.desarrolladores.map((d) => `${d.nombre}: ${formatearHoras(d.horas)}`).join(' · ')
            }));
        }
        return crear('tr', {}, [
            nombre,
            crear('td', { texto: historia.sprint_numero ? `Sprint ${historia.sprint_numero}` : 'Sin Sprint' }),
            crear('td', { texto: historia.responsable || 'Sin asignar' }),
            crear('td', { clase: 'numero', texto: String(historia.total_registros) }),
            crear('td', {
                clase: `numero horas${historia.horas_totales === 0 ? ' sin-horas' : ''}`,
                texto: formatearHoras(historia.horas_totales)
            })
        ]);
    };

    const filaDesarrollador = (persona) => {
        const nombre = crear('td', {}, [crear('span', { clase: 'nombre-historia', texto: persona.nombre })]);
        if (!persona.es_integrante) {
            nombre.append(crear('span', { clase: 'detalle-fila ex-integrante', texto: 'Ya no está en el proyecto' }));
        }
        return crear('tr', {}, [
            nombre,
            crear('td', { clase: 'numero', texto: String(persona.historias_trabajadas) }),
            crear('td', { clase: 'numero', texto: String(persona.total_registros) }),
            crear('td', { texto: formatearFecha(persona.ultima_fecha) }),
            crear('td', {
                clase: `numero horas${persona.horas_totales === 0 ? ' sin-horas' : ''}`,
                texto: formatearHoras(persona.horas_totales)
            })
        ]);
    };

    const cargarResumen = async () => {
        errorResumen.textContent = '';
        estadoResumen.hidden = false;
        estadoResumen.textContent = 'Cargando el resumen...';
        try {
            const respuesta = await pedir(`/proyectos/${idProyecto}/tiempos/resumen`);
            if (!respuesta) return;
            if (!respuesta.ok) {
                throw new Error(respuesta.resultado.mensaje || 'No se pudo cargar el resumen de tiempo.');
            }
            const { totales, por_historia: porHistoria, por_desarrollador: porDesarrollador } = respuesta.resultado;
            porId('total-horas-tiempo').textContent = formatearHoras(totales.horas);
            porId('total-registros-tiempo').textContent = String(totales.registros);
            porId('total-historias-tiempo').textContent = String(totales.historias_con_horas);
            porId('total-desarrolladores-tiempo').textContent = String(totales.desarrolladores_con_horas);
            cuerpoHistorias.replaceChildren(...(porHistoria.length
                ? porHistoria.map(filaHistoria)
                : [filaVacia(5, 'Todavía no hay historias en Sprints.')]));
            cuerpoDesarrolladores.replaceChildren(...(porDesarrollador.length
                ? porDesarrollador.map(filaDesarrollador)
                : [filaVacia(5, 'Todavía no hay desarrolladores en el proyecto.')]));
            contenidoResumen.hidden = false;
            estadoResumen.hidden = totales.registros > 0;
            estadoResumen.textContent = 'Todavía no hay horas registradas en este proyecto.';
        } catch (error) {
            console.error(error);
            contenidoResumen.hidden = true;
            estadoResumen.hidden = true;
            errorResumen.textContent = error.message || 'No se pudo cargar el resumen de tiempo.';
        }
    };

    // ---------- Pestaña y rol ----------

    // Se carga cuando se conocen las dos cosas: el rol (proyecto.js) y que la pestaña está abierta (pestanas.js).
    const actualizar = () => {
        seccionDesarrollador.hidden = rol !== 'Desarrollador';
        seccionScrumMaster.hidden = rol !== 'Scrum Master';
        seccionSinAcceso.hidden = rol === null || rol === 'Desarrollador' || rol === 'Scrum Master';
        if (!pestanaActiva) return;
        if (rol === 'Desarrollador') cargarMisTiempos();
        if (rol === 'Scrum Master') cargarResumen();
    };

    document.addEventListener('proyecto-cargado', (evento) => {
        rol = evento.detail.rol;
        actualizar();
    });

    document.addEventListener('pestana-activa', (evento) => {
        const abierta = evento.detail.id === 'tiempos';
        if (abierta === pestanaActiva) return;
        pestanaActiva = abierta;
        actualizar();
    });

    formulario.addEventListener('submit', registrarHoras);
    [selectorHistoria, campoFecha, campoHoras].forEach((campo) => {
        campo.addEventListener('input', () => { errorTiempo.textContent = ''; });
    });
    porId('actualizar-resumen-tiempo').addEventListener('click', cargarResumen);
})();
