
// ======================================================
// JESÚS - PB-60: BURNDOWN POR HORAS DE CADA SPRINT
// ======================================================

(() => {
    'use strict';

    const panel = document.getElementById('panel-burndown');
    const subpanel = document.getElementById('subpanel-burndown-horas');

    if (!panel || !subpanel) return;

    const idProyecto = window.location.pathname
        .split('/')
        .filter(Boolean)[1];

    if (!/^[1-9]\d{0,9}$/.test(idProyecto || '')) return;

    const selectorSprint = document.getElementById('sprint-burndown');
    const estado = document.getElementById('estado-burndown-horas');
    const error = document.getElementById('error-burndown-horas');
    const contenido = document.getElementById('contenido-burndown-horas');

    const avisoSinEstimaciones = document.getElementById('aviso-burndown-horas');
    const sinEstimaciones = document.getElementById('sin-estimaciones-burndown-horas');
    const seccionGrafica = document.getElementById('seccion-grafica-burndown-horas');

    const objetivo = document.getElementById('objetivo-burndown-horas');
    const fechas = document.getElementById('fechas-burndown-horas');

    const grafica = document.getElementById('grafica-burndown-horas');
    const cuerpoDias = document.getElementById('tabla-burndown-horas-dias');
    const cuerpoHistorias = document.getElementById('tabla-burndown-horas-historias');

    const resumen = {
        estimadas: document.getElementById('horas-resumen-estimadas'),
        reales: document.getElementById('horas-resumen-reales'),
        restantes: document.getElementById('horas-resumen-restantes'),
        ritmo: document.getElementById('horas-resumen-ritmo')
    };

    const NS = 'http://www.w3.org/2000/svg';

    let cargando = false;
    let pendiente = false;
    let ultimoSprintSolicitado = '';

    const formatoHoras = (valor) =>
        `${new Intl.NumberFormat('es-MX', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(Number(valor) || 0)} h`;

    const formatoDiferencia = (valor) => {
        const numero = Number(valor) || 0;
        const signo = numero > 0 ? '+' : '';

        return `${signo}${new Intl.NumberFormat('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numero)} h`;
    };

    const formatearFecha = (texto) => {
        const [anio, mes, dia] = texto.split('-').map(Number);

        return new Date(Date.UTC(anio, mes - 1, dia))
            .toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'UTC'
            });
    };

    const crearSvg = (nombre, atributos = {}, texto) => {
        const elemento = document.createElementNS(NS, nombre);

        Object.entries(atributos).forEach(([clave, valor]) => {
            elemento.setAttribute(clave, valor);
        });

        if (texto !== undefined) {
            elemento.textContent = texto;
        }

        return elemento;
    };

    const pasoEje = (maximo) => {
        const bruto = Math.max(maximo / 5, 0.1);
        const potencia = 10 ** Math.floor(Math.log10(bruto));
        const fraccion = bruto / potencia;

        return (
            fraccion <= 1 ? 1 :
            fraccion <= 2 ? 2 :
            fraccion <= 5 ? 5 : 10
        ) * potencia;
    };

    // ==================================================
    // DIBUJAR GRÁFICA
    // ==================================================

    const dibujarGrafica = (dias) => {
        grafica.replaceChildren();

        if (!dias.length) return;

        const ancho = 760;
        const alto = 360;

        const margen = {
            izquierda: 64,
            derecha: 28,
            arriba: 22,
            abajo: 54
        };

        const areaAncho = ancho - margen.izquierda - margen.derecha;
        const areaAlto = alto - margen.arriba - margen.abajo;

        const mayor = Math.max(
            0.1,
            ...dias.map(dia => Math.max(dia.ideal, dia.real ?? 0))
        );

        const paso = pasoEje(mayor);
        const maximo = Math.ceil(mayor / paso) * paso;

        const x = indice => margen.izquierda +
            (dias.length === 1
                ? 0
                : areaAncho * indice / (dias.length - 1));

        const y = valor => margen.arriba + areaAlto -
            areaAlto * valor / maximo;

        const svg = crearSvg('svg', {
            viewBox: `0 0 ${ancho} ${alto}`,
            class: 'svg-burndown',
            focusable: 'false'
        });

        // Cuadrícula y eje vertical.
        for (
            let valor = 0;
            valor <= maximo + paso / 100;
            valor += paso
        ) {
            svg.append(
                crearSvg('line', {
                    x1: margen.izquierda,
                    x2: ancho - margen.derecha,
                    y1: y(valor),
                    y2: y(valor),
                    class: 'rejilla-burndown'
                }),

                crearSvg('text', {
                    x: margen.izquierda - 10,
                    y: y(valor) + 4,
                    class: 'texto-eje',
                    'text-anchor': 'end'
                }, formatoHoras(valor).replace(' h', ''))
            );
        }

        svg.append(crearSvg('text', {
            x: 17,
            y: margen.arriba + areaAlto / 2,
            class: 'texto-eje titulo-eje',
            'text-anchor': 'middle',
            transform: `rotate(-90 17 ${margen.arriba + areaAlto / 2})`
        }, 'Horas restantes'));

        // Eje horizontal.
        dias.forEach((dia, indice) => {
            svg.append(crearSvg('text', {
                x: x(indice),
                y: alto - margen.abajo + 22,
                class: 'texto-eje',
                'text-anchor': 'middle'
            }, dia.etiqueta));
        });

        // Línea ideal.
        svg.append(crearSvg('polyline', {
            points: dias.map((dia, indice) =>
                `${x(indice)},${y(dia.ideal)}`
            ).join(' '),
            class: 'linea-ideal'
        }));

        // Línea real: solo hasta el último día con información.
        const reales = dias
            .map((dia, indice) => ({ dia, indice }))
            .filter(({ dia }) => dia.real !== null);

        if (reales.length) {
            svg.append(crearSvg('polyline', {
                points: reales.map(({ dia, indice }) =>
                    `${x(indice)},${y(dia.real)}`
                ).join(' '),
                class: 'linea-real'
            }));
        }

        // Puntos ideales.
        dias.forEach((dia, indice) => {
            const punto = crearSvg('circle', {
                cx: x(indice),
                cy: y(dia.ideal),
                r: 3.5,
                class: 'punto-ideal'
            });

            punto.append(crearSvg(
                'title',
                {},
                `${dia.etiqueta} · Ideal: ${formatoHoras(dia.ideal)}`
            ));

            svg.append(punto);
        });

        // Puntos reales.
        reales.forEach(({ dia, indice }) => {
            const punto = crearSvg('circle', {
                cx: x(indice),
                cy: y(dia.real),
                r: 5,
                class: 'punto-real'
            });

            punto.append(crearSvg(
                'title',
                {},
                `${dia.etiqueta} · Real: ${formatoHoras(dia.real)} · Ideal: ${formatoHoras(dia.ideal)}`
            ));

            svg.append(punto);
        });

        grafica.appendChild(svg);
    };

    // ==================================================
    // CREAR CELDAS Y TABLAS
    // ==================================================

    const celda = (etiqueta, texto, clase) => {
        const elemento = document.createElement(etiqueta);

        elemento.textContent = texto;

        if (clase) {
            elemento.className = clase;
        }

        return elemento;
    };

    const llenarTablaDias = (dias) => {
        cuerpoDias.replaceChildren();

        dias.forEach(dia => {
            const fila = document.createElement('tr');

            const nombre = celda('th', dia.etiqueta);
            nombre.scope = 'row';

            const ideal = celda(
                'td',
                formatoHoras(dia.ideal)
            );

            const real = dia.real === null
                ? celda('td', '—', 'sin-dato')
                : celda(
                    'td',
                    formatoHoras(dia.real),
                    dia.real > dia.ideal ? 'por-encima' : 'en-meta'
                );

            fila.append(nombre, ideal, real);

            cuerpoDias.appendChild(fila);
        });
    };

    const llenarTablaHistorias = (historias) => {
        cuerpoHistorias.replaceChildren();

        historias.forEach(historia => {
            const fila = document.createElement('tr');

            const nombre = celda('th', historia.titulo);
            nombre.scope = 'row';

            const estimadas = historia.horas_estimadas === null
                ? celda('td', 'Sin estimar', 'sin-dato')
                : celda('td', formatoHoras(historia.horas_estimadas));

            const reales = celda(
                'td',
                formatoHoras(historia.horas_reales)
            );

            let diferencia;

            if (historia.horas_estimadas === null) {
                diferencia = celda('td', '—', 'sin-dato');
            } else {
                const valor =
                    Number(historia.horas_reales) -
                    Number(historia.horas_estimadas);

                diferencia = celda(
                    'td',
                    formatoDiferencia(valor),
                    valor > 0 ? 'por-encima' : 'en-meta'
                );
            }

            fila.append(
                nombre,
                estimadas,
                reales,
                diferencia
            );

            cuerpoHistorias.appendChild(fila);
        });
    };

    // ==================================================
    // MOSTRAR INFORMACIÓN
    // ==================================================

    const pintar = (datos) => {
        const { sprint, resumen: r, historias, dias } = datos;

        objetivo.textContent =
            sprint.objetivo || 'Sprint sin objetivo registrado.';

        fechas.textContent =
            `Sprint ${sprint.numero} · ${formatearFecha(sprint.fecha_inicio)} – ${formatearFecha(sprint.fecha_fin)}`;

        resumen.estimadas.textContent =
            formatoHoras(r.horas_estimadas);

        resumen.reales.textContent =
            formatoHoras(r.horas_reales);

        resumen.restantes.textContent =
            formatoHoras(r.horas_restantes);

        resumen.ritmo.textContent = r.ritmo;
        resumen.ritmo.dataset.ritmo = r.ritmo;

        const tieneHistoriasSinEstimar =
            r.historias_sin_estimar > 0;

        avisoSinEstimaciones.hidden =
            !tieneHistoriasSinEstimar;

        if (tieneHistoriasSinEstimar) {
            avisoSinEstimaciones.textContent =
                `${r.historias_sin_estimar} historia(s) no tienen horas estimadas. ` +
                'Sus horas registradas aparecen en la tabla, pero no se descuentan de la gráfica.';
        }

        sinEstimaciones.hidden = r.horas_estimadas > 0;
        seccionGrafica.hidden = r.horas_estimadas <= 0;

        if (r.horas_estimadas > 0) {
            dibujarGrafica(dias);
            llenarTablaDias(dias);
        } else {
            grafica.replaceChildren();
            cuerpoDias.replaceChildren();
        }

        llenarTablaHistorias(historias);

        grafica.setAttribute(
            'aria-label',
            `Burndown por horas del Sprint ${sprint.numero}: quedan ${formatoHoras(r.horas_restantes)}.`
        );

        estado.hidden = true;
        contenido.hidden = false;
    };

    // ==================================================
    // CONSULTAR AL SERVIDOR
    // ==================================================

    const cargar = async (idSprint = '') => {
        if (cargando) {
            pendiente = true;
            ultimoSprintSolicitado = idSprint;
            return;
        }

        cargando = true;
        ultimoSprintSolicitado = idSprint;

        error.textContent = '';

        if (contenido.hidden) {
            estado.textContent = 'Cargando Burndown por horas...';
            estado.hidden = false;
        }

        try {
            const consulta = idSprint
                ? `?sprint=${encodeURIComponent(idSprint)}`
                : '';

            const respuesta = await fetch(
                `/proyectos/${idProyecto}/burndown-horas${consulta}`,
                {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                    cache: 'no-store'
                }
            );

            if (respuesta.status === 401) {
                window.location.replace('/login');
                return;
            }

            const datos = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok) {
                throw new Error(
                    datos.mensaje ||
                    'No se pudo cargar el Burndown por horas.'
                );
            }

            if (!datos.sprint) {
                contenido.hidden = true;

                estado.textContent =
                    'Todavía no hay Sprints configurados para este proyecto.';

                estado.hidden = false;

                return;
            }

            pintar(datos);

        } catch (fallo) {
            console.error('PB-60:', fallo);

            error.textContent =
                fallo.message ||
                'No se pudo conectar con el servidor.';

        } finally {
            cargando = false;

            if (pendiente) {
                pendiente = false;
                cargar(ultimoSprintSolicitado);
            }
        }
    };

    // ==================================================
    // ESCUCHAR LAS SUBPESTAÑAS DE NINO - PB-59
    // ==================================================

    document.addEventListener('burndown-vista', evento => {
        if (
            evento.detail?.panel === 'burndown' &&
            evento.detail?.vista === 'horas'
        ) {
            cargar(selectorSprint?.value || '');
        }
    });

    // Cambiar de Sprint mientras está activa la vista por horas.
    selectorSprint?.addEventListener('change', () => {
        if (
            document.getElementById('subpestana-burndown-horas')
                ?.getAttribute('aria-selected') === 'true'
        ) {
            cargar(selectorSprint.value);
        }
    });

    // Volver a abrir la pestaña principal.
    document.addEventListener('pestana-activa', evento => {
        if (
            evento.detail?.id === 'burndown' &&
            document.getElementById('subpestana-burndown-horas')
                ?.getAttribute('aria-selected') === 'true'
        ) {
            cargar(selectorSprint?.value || '');
        }
    });

    window.addEventListener('pageshow', () => {
        if (
            !panel.hidden &&
            document.getElementById('subpestana-burndown-horas')
                ?.getAttribute('aria-selected') === 'true'
        ) {
            cargar(selectorSprint?.value || '');
        }
    });

})();
