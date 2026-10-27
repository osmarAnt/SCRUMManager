// Burndown Chart del Sprint.
// Los puntos restantes los calcula el servidor a partir del estado de las historias y los guarda por día;
// aquí solo se dibuja la gráfica (línea ideal y línea real) y la tabla de detalle.
(() => {
    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const panel = document.getElementById('panel-burndown');
    if (!panel) {
        return;
    }

    const selectorBloque = document.getElementById('selector-burndown');
    const selectorSprint = document.getElementById('sprint-burndown');
    const estado = document.getElementById('estado-burndown');
    const error = document.getElementById('error-burndown');
    const contenido = document.getElementById('contenido-burndown');
    const objetivo = document.getElementById('objetivo-burndown');
    const fechas = document.getElementById('fechas-burndown');
    const grafica = document.getElementById('grafica-burndown');
    const cuerpoTabla = document.getElementById('tabla-burndown-cuerpo');
    const resumen = {
        totales: document.getElementById('resumen-totales'),
        completados: document.getElementById('resumen-completados'),
        restantes: document.getElementById('resumen-restantes'),
        ritmo: document.getElementById('resumen-ritmo')
    };

    const NS = 'http://www.w3.org/2000/svg';
    let cargando = false;
    let pendiente = false;

    const formatearFecha = (texto) => {
        const [anio, mes, dia] = texto.split('-').map(Number);
        return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString('es-MX', {
            day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
        });
    };

    const puntos = (valor) => `${valor} ${valor === 1 ? 'punto' : 'puntos'}`;

    const crear = (nombre, atributos = {}, texto) => {
        const elemento = document.createElementNS(NS, nombre);
        Object.entries(atributos).forEach(([clave, valor]) => elemento.setAttribute(clave, valor));
        if (texto !== undefined) {
            elemento.textContent = texto;
        }
        return elemento;
    };

    // Paso "redondo" (1, 2, 5, 10, 20...) para que las marcas del eje vertical sean legibles.
    const pasoEje = (maximo) => {
        const bruto = Math.max(maximo / 5, 1);
        const potencia = 10 ** Math.floor(Math.log10(bruto));
        const fraccion = bruto / potencia;
        return (fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 5 ? 5 : 10) * potencia;
    };

    const dibujarGrafica = (dias) => {
        const ancho = 760;
        const alto = 360;
        const margen = { izquierda: 52, derecha: 28, arriba: 20, abajo: 52 };
        const areaAncho = ancho - margen.izquierda - margen.derecha;
        const areaAlto = alto - margen.arriba - margen.abajo;

        const mayor = Math.max(1, ...dias.map((dia) => Math.max(dia.ideal, dia.real ?? 0)));
        const paso = pasoEje(mayor);
        const maximo = Math.ceil(mayor / paso) * paso;

        const x = (indice) => margen.izquierda + (dias.length === 1 ? 0 : (areaAncho * indice) / (dias.length - 1));
        const y = (valor) => margen.arriba + areaAlto - (areaAlto * valor) / maximo;

        const svg = crear('svg', {
            viewBox: `0 0 ${ancho} ${alto}`,
            class: 'svg-burndown',
            focusable: 'false'
        });

        // Cuadrícula y eje vertical
        for (let valor = 0; valor <= maximo; valor += paso) {
            svg.append(
                crear('line', { x1: margen.izquierda, x2: ancho - margen.derecha, y1: y(valor), y2: y(valor), class: 'rejilla-burndown' }),
                crear('text', { x: margen.izquierda - 10, y: y(valor) + 4, class: 'texto-eje', 'text-anchor': 'end' }, String(valor))
            );
        }
        svg.append(crear('text', {
            x: 14, y: margen.arriba + areaAlto / 2, class: 'texto-eje titulo-eje',
            'text-anchor': 'middle', transform: `rotate(-90 14 ${margen.arriba + areaAlto / 2})`
        }, 'Puntos pendientes'));

        // Eje horizontal
        dias.forEach((dia, indice) => {
            svg.append(crear('text', {
                x: x(indice), y: alto - margen.abajo + 22, class: 'texto-eje', 'text-anchor': 'middle'
            }, dia.etiqueta));
        });

        // Línea ideal
        svg.append(crear('polyline', {
            points: dias.map((dia, indice) => `${x(indice)},${y(dia.ideal)}`).join(' '),
            class: 'linea-ideal'
        }));

        // Línea real: solo hasta el último día registrado (los días futuros no tienen dato todavía)
        const registrados = dias.map((dia, indice) => ({ dia, indice })).filter(({ dia }) => dia.real !== null);
        svg.append(crear('polyline', {
            points: registrados.map(({ dia, indice }) => `${x(indice)},${y(dia.real)}`).join(' '),
            class: 'linea-real'
        }));

        dias.forEach((dia, indice) => {
            const ideal = crear('circle', { cx: x(indice), cy: y(dia.ideal), r: 3.5, class: 'punto-ideal' });
            ideal.append(crear('title', {}, `${dia.etiqueta} · Ideal: ${puntos(dia.ideal)}`));
            svg.append(ideal);
        });
        registrados.forEach(({ dia, indice }) => {
            const real = crear('circle', { cx: x(indice), cy: y(dia.real), r: 5, class: 'punto-real' });
            real.append(crear('title', {}, `${dia.etiqueta} · Real: ${puntos(dia.real)} · Ideal: ${puntos(dia.ideal)}`));
            svg.append(real);
        });

        grafica.replaceChildren(svg);
    };

    const llenarTabla = (dias) => {
        cuerpoTabla.replaceChildren();
        dias.forEach((dia) => {
            const fila = document.createElement('tr');
            const celdaDia = document.createElement('th');
            celdaDia.scope = 'row';
            celdaDia.textContent = dia.etiqueta;
            const celdaIdeal = document.createElement('td');
            celdaIdeal.textContent = String(dia.ideal);
            const celdaReal = document.createElement('td');
            if (dia.real === null) {
                celdaReal.textContent = '—';
                celdaReal.className = 'sin-dato';
            } else {
                celdaReal.textContent = String(dia.real);
                celdaReal.className = dia.real > dia.ideal ? 'por-encima' : 'en-meta';
            }
            fila.append(celdaDia, celdaIdeal, celdaReal);
            cuerpoTabla.append(fila);
        });
    };

    const llenarSelector = (sprints, actual) => {
        selectorSprint.replaceChildren();
        sprints.forEach((sprint) => {
            selectorSprint.add(new Option(
                `Sprint ${sprint.numero} (${formatearFecha(sprint.fecha_inicio)} – ${formatearFecha(sprint.fecha_fin)})`,
                sprint.id_sprint
            ));
        });
        selectorSprint.value = String(actual);
        selectorBloque.hidden = sprints.length < 2;
    };

    const pintar = (datos) => {
        const { sprint, dias } = datos;
        llenarSelector(datos.sprints, sprint.id_sprint);
        objetivo.textContent = sprint.objetivo;
        fechas.textContent = `Sprint ${sprint.numero} · ${formatearFecha(sprint.fecha_inicio)} – ${formatearFecha(sprint.fecha_fin)} · ${sprint.duracion_dias} ${sprint.duracion_dias === 1 ? 'día' : 'días'}`;
        resumen.totales.textContent = String(datos.resumen.puntos_totales);
        resumen.completados.textContent = String(datos.resumen.puntos_completados);
        resumen.restantes.textContent = String(datos.resumen.puntos_restantes);
        resumen.ritmo.textContent = datos.resumen.ritmo;
        resumen.ritmo.dataset.ritmo = datos.resumen.ritmo;
        dibujarGrafica(dias);
        llenarTabla(dias);
        grafica.setAttribute(
            'aria-label',
            `Burndown Chart del Sprint ${sprint.numero}: quedan ${puntos(datos.resumen.puntos_restantes)} y el ideal es ${datos.resumen.ideal_hoy}.`
        );
        estado.hidden = true;
        contenido.hidden = false;
    };

    const cargar = async (idSprint) => {
        if (cargando) {
            pendiente = true;
            return;
        }
        cargando = true;
        error.textContent = '';
        if (contenido.hidden) {
            estado.textContent = 'Cargando el Burndown Chart...';
            estado.hidden = false;
        }
        try {
            const consulta = idSprint ? `?sprint=${encodeURIComponent(idSprint)}` : '';
            const respuesta = await fetch(`/proyectos/${idProyecto}/burndown${consulta}`, {
                headers: { Accept: 'application/json' },
                cache: 'no-store'
            });
            if (respuesta.status === 401) {
                window.location.replace('/login');
                return;
            }
            const datos = await respuesta.json().catch(() => ({}));
            if (!respuesta.ok) {
                throw new Error(datos.mensaje || 'No se pudo cargar el Burndown Chart.');
            }
            if (!datos.sprint) {
                contenido.hidden = true;
                selectorBloque.hidden = true;
                estado.textContent = 'Todavía no hay Sprints configurados. Cuando exista uno, aquí verás su avance.';
                estado.hidden = false;
                return;
            }
            pintar(datos);
        } catch (fallo) {
            console.error(fallo);
            error.textContent = fallo.message || 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
            if (contenido.hidden) {
                estado.hidden = true;
            }
        } finally {
            cargando = false;
            if (pendiente) {
                pendiente = false;
                cargar(selectorSprint.value);
            }
        }
    };

    selectorSprint.addEventListener('change', () => cargar(selectorSprint.value));

    // Se actualiza cada vez que se abre la pestaña, para reflejar los cambios hechos en otros apartados.
    document.addEventListener('pestana-activa', (evento) => {
        if (evento.detail.id === 'burndown') {
            cargar(selectorSprint.value);
        }
    });

    // Al abrir la página directamente en #burndown (o volver a ella con el botón "atrás") la pestaña ya está activa.
    window.addEventListener('pageshow', () => {
        if (!panel.hidden) {
            cargar(selectorSprint.value);
        }
    });

    window.addEventListener('pagehide', () => {
        contenido.hidden = true;
        grafica.replaceChildren();
        cuerpoTabla.replaceChildren();
    });
})();
