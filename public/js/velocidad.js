// PB-62 (Nino) · Velocidad del equipo.
// Gráfica de barras: dos barras por Sprint finalizado (planeados y completados) y una línea con el
// promedio de los últimos Sprints, que se sugiere como capacidad para planificar el siguiente.
(() => {
    'use strict';

    const panel = document.getElementById('subpanel-general-velocidad');
    if (!panel) return;

    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const $ = (id) => document.getElementById(id);
    const estado = $('estado-velocidad');
    const contenido = $('contenido-velocidad');
    const grafica = $('grafica-velocidad');
    const cuerpo = $('tabla-velocidad-cuerpo');
    const NS = 'http://www.w3.org/2000/svg';

    const svg = (etiqueta, atributos = {}, texto) => {
        const elemento = document.createElementNS(NS, etiqueta);
        Object.entries(atributos).forEach(([clave, valor]) => elemento.setAttribute(clave, String(valor)));
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    };

    const dibujar = (sprints, promedio) => {
        const ancho = Math.max(520, sprints.length * 120);
        const alto = 280;
        const margen = { arriba: 20, derecha: 20, abajo: 44, izquierda: 44 };
        const maximo = Math.max(1, ...sprints.map((s) => Math.max(s.planeados, s.completados)), promedio || 0);
        const escalaY = (valor) => margen.arriba + (alto - margen.arriba - margen.abajo) * (1 - valor / maximo);
        const anchoGrupo = (ancho - margen.izquierda - margen.derecha) / sprints.length;
        const anchoBarra = Math.min(34, anchoGrupo / 3);

        const lienzo = svg('svg', { viewBox: `0 0 ${ancho} ${alto}`, class: 'svg-velocidad', 'aria-hidden': 'true' });
        // Líneas guía y valores del eje vertical.
        for (let i = 0; i <= 4; i++) {
            const valor = Math.round((maximo / 4) * i);
            const y = escalaY(valor);
            lienzo.append(
                svg('line', { x1: margen.izquierda, x2: ancho - margen.derecha, y1: y, y2: y, class: 'guia-velocidad' }),
                svg('text', { x: margen.izquierda - 8, y: y + 4, 'text-anchor': 'end', class: 'eje-velocidad' }, String(valor))
            );
        }
        sprints.forEach((sprint, indice) => {
            const centro = margen.izquierda + anchoGrupo * indice + anchoGrupo / 2;
            [['planeados', -anchoBarra - 2], ['completados', 2]].forEach(([campo, desplazamiento]) => {
                const y = escalaY(sprint[campo]);
                const barra = svg('rect', {
                    x: centro + desplazamiento, y, width: anchoBarra,
                    height: Math.max(0, alto - margen.abajo - y), rx: 3, class: `barra-${campo}`
                });
                barra.append(svg('title', {}, `Sprint ${sprint.numero}: ${sprint[campo]} puntos ${campo}`));
                lienzo.append(barra, svg('text', {
                    x: centro + desplazamiento + anchoBarra / 2, y: y - 5, 'text-anchor': 'middle', class: 'valor-velocidad'
                }, String(sprint[campo])));
            });
            lienzo.append(svg('text', { x: centro, y: alto - margen.abajo + 18, 'text-anchor': 'middle', class: 'eje-velocidad' }, `Sprint ${sprint.numero}`));
        });
        if (promedio !== null) {
            const y = escalaY(promedio);
            lienzo.append(
                svg('line', { x1: margen.izquierda, x2: ancho - margen.derecha, y1: y, y2: y, class: 'linea-promedio' }),
                svg('text', { x: ancho - margen.derecha, y: y - 6, 'text-anchor': 'end', class: 'texto-promedio' }, `Promedio ${promedio}`)
            );
        }
        grafica.replaceChildren(lienzo);
    };

    const cargar = async () => {
        estado.hidden = false;
        estado.textContent = 'Cargando la velocidad del equipo...';
        try {
            const respuesta = await fetch(`/proyectos/${idProyecto}/velocidad`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
            if (respuesta.status === 401) return window.location.replace('/login');
            const datos = await respuesta.json().catch(() => ({}));
            if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo calcular la velocidad.');
            if (!datos.sprints.length) {
                contenido.hidden = true;
                estado.textContent = 'Todavía no hay Sprints finalizados. La velocidad se calcula cuando el Scrum Master cierra un Sprint.';
                return;
            }
            $('velocidad-total-sprints').textContent = String(datos.sprints.length);
            $('velocidad-promedio').textContent = `${datos.promedio} pts`;
            $('velocidad-sugerida').textContent = `${datos.capacidad_sugerida} pts`;
            estado.textContent = `Promedio de los últimos ${datos.sprints_promediados} Sprint(s) finalizado(s): planifica el siguiente con unos ${datos.capacidad_sugerida} puntos.`;
            dibujar(datos.sprints, datos.promedio);
            cuerpo.replaceChildren(...datos.sprints.map((sprint) => {
                const fila = document.createElement('tr');
                const cumplimiento = sprint.planeados ? Math.round((sprint.completados / sprint.planeados) * 100) : 0;
                [`Sprint ${sprint.numero}${sprint.nombre ? ` · ${sprint.nombre}` : ''}`, sprint.planeados, sprint.completados, `${cumplimiento} %`]
                    .forEach((valor) => {
                        const celda = document.createElement('td');
                        celda.textContent = String(valor);
                        fila.append(celda);
                    });
                return fila;
            }));
            contenido.hidden = false;
        } catch (error) {
            contenido.hidden = true;
            estado.textContent = error.message;
        }
    };

    // Se carga al abrir la sub-pestaña Velocidad (evento de PB-59).
    document.addEventListener('burndown-vista', (evento) => {
        if (evento.detail?.panel === 'burndown-general' && evento.detail.vista === 'velocidad') cargar();
    });
})();
