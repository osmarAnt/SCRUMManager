
// Burndown General por horas: compara las horas estimadas y reales
// acumuladas de todos los Sprints del proyecto.
(() => {
    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];

    const panel = document.getElementById('panel-burndown-general');
    const subpanel = document.getElementById('subpanel-general-horas');

    if (!panel || !subpanel) {
        return;
    }

    const estado = document.getElementById('estado-general-horas');
    const error = document.getElementById('error-general-horas');
    const contenido = document.getElementById('contenido-general-horas');
    const grafica = document.getElementById('grafica-general-horas');
    const cuerpoTabla = document.getElementById('tabla-general-horas-cuerpo');

    const resumen = {
        estimadas: document.getElementById('general-horas-estimadas'),
        reales: document.getElementById('general-horas-reales'),
        diferencia: document.getElementById('general-horas-diferencia'),
        sinEstimar: document.getElementById('general-horas-sin-estimar')
    };

    const ESPACIO_SVG = 'http://www.w3.org/2000/svg';

    let cargando = false;
    let pendiente = false;

    const formatoHoras = (valor) => {
        return new Intl.NumberFormat('es-MX', {
            maximumFractionDigits: 2
        }).format(Number(valor) || 0);
    };

    const formatoDiferencia = (valor) => {
        const numero = Number(valor) || 0;
        const signo = numero > 0 ? '+' : '';
        return `${signo}${formatoHoras(numero)}`;
    };

    const crearElemento = (etiqueta, texto, clase = '') => {
        const elemento = document.createElement(etiqueta);
        elemento.textContent = texto;

        if (clase) {
            elemento.className = clase;
        }

        return elemento;
    };

    const crearSVG = (etiqueta, atributos = {}) => {
        const elemento = document.createElementNS(ESPACIO_SVG, etiqueta);

        Object.entries(atributos).forEach(([nombre, valor]) => {
            elemento.setAttribute(nombre, String(valor));
        });

        return elemento;
    };

    const llenarTabla = (sprints) => {
        cuerpoTabla.replaceChildren();

        sprints.forEach((sprint) => {
            const fila = document.createElement('tr');

            const nombre = crearElemento('th', `Sprint ${sprint.numero}`);
            nombre.scope = 'row';

            const etiquetaEstado = crearElemento(
                'span',
                sprint.estado,
                'etiqueta-estado-sprint'
            );
            etiquetaEstado.dataset.estado = sprint.estado;

            const celdaEstado = document.createElement('td');
            celdaEstado.append(etiquetaEstado);

            const claseDiferencia =
                sprint.diferencia > 0 ? 'por-encima' : 'en-meta';

            const claseDiferenciaAcumulada =
                sprint.diferencia_acumulada > 0 ? 'por-encima' : 'en-meta';

            fila.append(
                nombre,
                celdaEstado,
                crearElemento('td', formatoHoras(sprint.horas_estimadas)),
                crearElemento('td', formatoHoras(sprint.horas_reales)),
                crearElemento(
                    'td',
                    formatoDiferencia(sprint.diferencia),
                    claseDiferencia
                ),
                crearElemento(
                    'td',
                    formatoHoras(sprint.estimadas_acumuladas)
                ),
                crearElemento(
                    'td',
                    formatoHoras(sprint.reales_acumuladas)
                ),
                crearElemento(
                    'td',
                    formatoDiferencia(sprint.diferencia_acumulada),
                    claseDiferenciaAcumulada
                ),
                crearElemento(
                    'td',
                    formatoHoras(sprint.horas_sin_estimar)
                )
            );

            cuerpoTabla.append(fila);
        });
    };

    const dibujarGrafica = (sprints) => {
        grafica.replaceChildren();

        const ancho = 900;
        const alto = 380;

        const margen = {
            superior: 30,
            inferior: 65,
            izquierdo: 75,
            derecho: 30
        };

        const anchoUtil = ancho - margen.izquierdo - margen.derecho;
        const altoUtil = alto - margen.superior - margen.inferior;

        const valores = sprints.flatMap((sprint) => [
            Number(sprint.estimadas_acumuladas) || 0,
            Number(sprint.reales_acumuladas) || 0
        ]);

        const maximo = Math.max(1, ...valores);
        const escalaMaxima = maximo * 1.1;

        const posicionX = (indice) => {
            if (sprints.length === 1) {
                return margen.izquierdo + anchoUtil / 2;
            }

            return margen.izquierdo +
                (indice / (sprints.length - 1)) * anchoUtil;
        };

        const posicionY = (valor) => {
            return margen.superior +
                altoUtil -
                (valor / escalaMaxima) * altoUtil;
        };

        const svg = crearSVG('svg', {
            viewBox: `0 0 ${ancho} ${alto}`,
            role: 'img',
            'aria-label': 'Comparación de horas estimadas y reales acumuladas por Sprint'
        });

        // Líneas horizontales y etiquetas del eje vertical.
        for (let i = 0; i <= 4; i++) {
            const valor = (escalaMaxima / 4) * i;
            const y = posicionY(valor);

            svg.append(
                crearSVG('line', {
                    x1: margen.izquierdo,
                    y1: y,
                    x2: ancho - margen.derecho,
                    y2: y,
                    stroke: '#d1d5db',
                    'stroke-width': 1,
                    'stroke-dasharray': '4 4'
                })
            );

            const etiqueta = crearSVG('text', {
                x: margen.izquierdo - 12,
                y: y + 4,
                'text-anchor': 'end',
                fill: 'currentColor',
                'font-size': 12
            });

            etiqueta.textContent = formatoHoras(valor);
            svg.append(etiqueta);
        }

        // Eje horizontal.
        svg.append(
            crearSVG('line', {
                x1: margen.izquierdo,
                y1: posicionY(0),
                x2: ancho - margen.derecho,
                y2: posicionY(0),
                stroke: 'currentColor',
                'stroke-width': 1
            })
        );

        // Etiquetas de los Sprints.
        sprints.forEach((sprint, indice) => {
            const etiqueta = crearSVG('text', {
                x: posicionX(indice),
                y: alto - 25,
                'text-anchor': 'middle',
                fill: 'currentColor',
                'font-size': 12
            });

            etiqueta.textContent = `Sprint ${sprint.numero}`;
            svg.append(etiqueta);
        });

        // Puntos de las dos líneas acumuladas.
        const puntosEstimados = sprints.map((sprint, indice) => {
            return `${posicionX(indice)},${posicionY(sprint.estimadas_acumuladas)}`;
        }).join(' ');

        const puntosReales = sprints.map((sprint, indice) => {
            return `${posicionX(indice)},${posicionY(sprint.reales_acumuladas)}`;
        }).join(' ');

        // Línea de horas estimadas.
        svg.append(
            crearSVG('polyline', {
                points: puntosEstimados,
                fill: 'none',
                stroke: '#2563eb',
                'stroke-width': 3,
                'stroke-linejoin': 'round',
                'stroke-linecap': 'round'
            })
        );

        // Línea de horas reales.
        svg.append(
            crearSVG('polyline', {
                points: puntosReales,
                fill: 'none',
                stroke: '#dc2626',
                'stroke-width': 3,
                'stroke-linejoin': 'round',
                'stroke-linecap': 'round'
            })
        );

        // Marcadores de cada Sprint.
        sprints.forEach((sprint, indice) => {
            const x = posicionX(indice);

            svg.append(
                crearSVG('circle', {
                    cx: x,
                    cy: posicionY(sprint.estimadas_acumuladas),
                    r: 5,
                    fill: '#2563eb'
                }),
                crearSVG('circle', {
                    cx: x,
                    cy: posicionY(sprint.reales_acumuladas),
                    r: 5,
                    fill: '#dc2626'
                })
            );
        });

        grafica.append(svg);
    };

    const pintar = (datos) => {
        const r = datos.resumen;

        resumen.estimadas.textContent = formatoHoras(r.horas_estimadas);
        resumen.reales.textContent = formatoHoras(r.horas_reales);
        resumen.diferencia.textContent = formatoDiferencia(r.diferencia);
        resumen.sinEstimar.textContent = formatoHoras(r.horas_sin_estimar);

        resumen.diferencia.classList.remove('por-encima', 'en-meta');
        resumen.diferencia.classList.add(
            r.diferencia > 0 ? 'por-encima' : 'en-meta'
        );

        llenarTabla(datos.sprints);
        dibujarGrafica(datos.sprints);

        estado.hidden = true;
        contenido.hidden = false;
    };

    const cargar = async () => {
        if (cargando) {
            pendiente = true;
            return;
        }

        cargando = true;
        error.textContent = '';

        if (contenido.hidden) {
            estado.textContent = 'Cargando el Burndown General por horas...';
            estado.hidden = false;
        }

        try {
            const respuesta = await fetch(
                `/proyectos/${idProyecto}/burndown-general-horas`,
                {
                    headers: {
                        Accept: 'application/json'
                    },
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
                    'No se pudo cargar el Burndown General por horas.'
                );
            }

            if (!datos.sprints || datos.sprints.length === 0) {
                contenido.hidden = true;
                grafica.replaceChildren();
                cuerpoTabla.replaceChildren();

                estado.textContent =
                    'Todavía no hay Sprints configurados. Cuando se cree el primero, aquí verás la comparación de horas del proyecto.';
                estado.hidden = false;

                return;
            }

            pintar(datos);

        } catch (fallo) {
            console.error(fallo);

            error.textContent =
                fallo.message ||
                'No se pudo conectar con el servidor. Inténtalo de nuevo.';

            if (contenido.hidden) {
                estado.hidden = true;
            }

        } finally {
            cargando = false;

            if (pendiente) {
                pendiente = false;
                cargar();
            }
        }
    };

    // Se carga al seleccionar la subpestaña Por horas.
    document.addEventListener('burndown-vista', (evento) => {
        if (
            evento.detail.panel === 'burndown-general' &&
            evento.detail.vista === 'horas'
        ) {
            cargar();
        }
    });

    // También se carga si el usuario vuelve a abrir la pestaña principal
    // mientras la subpestaña Por horas permanece seleccionada.
    document.addEventListener('pestana-activa', (evento) => {
        if (
            evento.detail.id === 'burndown-general' &&
            !subpanel.hidden
        ) {
            cargar();
        }
    });

    window.addEventListener('pageshow', () => {
        if (!panel.hidden && !subpanel.hidden) {
            cargar();
        }
    });

    window.addEventListener('pagehide', () => {
        contenido.hidden = true;
        grafica.replaceChildren();
        cuerpoTabla.replaceChildren();
    });
})();
