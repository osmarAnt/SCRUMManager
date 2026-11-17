// Burndown General: avance de todo el proyecto, Sprint por Sprint.
// El servidor suma los puntos de cada Sprint; aquí solo se muestra el resultado.
// La gráfica se dibuja con la misma función del Burndown de un Sprint (window.dibujarBurndown).
(() => {
    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const panel = document.getElementById('panel-burndown-general');
    if (!panel) {
        return;
    }

    const estado = document.getElementById('estado-general');
    const error = document.getElementById('error-general');
    const contenido = document.getElementById('contenido-general');
    const grafica = document.getElementById('grafica-general');
    const cuerpoTabla = document.getElementById('tabla-general-cuerpo');
    const barra = document.getElementById('barra-general');
    const relleno = document.getElementById('relleno-general');
    const textoPorcentaje = document.getElementById('texto-porcentaje-general');
    const resumen = {
        totales: document.getElementById('general-totales'),
        completados: document.getElementById('general-completados'),
        pendientes: document.getElementById('general-pendientes'),
        ritmo: document.getElementById('general-ritmo')
    };
    let cargando = false;
    let pendiente = false;

    const celda = (etiqueta, texto, clase) => {
        const elemento = document.createElement(etiqueta);
        elemento.textContent = texto;
        if (clase) {
            elemento.className = clase;
        }
        return elemento;
    };

    const llenarTabla = (sprints, puntos) => {
        cuerpoTabla.replaceChildren();
        sprints.forEach((sprint, posicion) => {
            const punto = puntos[posicion + 1];
            const fila = document.createElement('tr');
            const nombre = celda('th', `Sprint ${sprint.numero}`);
            nombre.scope = 'row';
            const etiqueta = celda('span', sprint.estado, 'etiqueta-estado-sprint');
            etiqueta.dataset.estado = sprint.estado;
            const celdaEstado = document.createElement('td');
            celdaEstado.append(etiqueta);
            fila.append(
                nombre,
                celdaEstado,
                celda('td', String(sprint.planeados)),
                celda('td', sprint.estado === 'Por iniciar' ? '—' : String(sprint.completados), sprint.estado === 'Por iniciar' ? 'sin-dato' : ''),
                celda('td', String(punto.ideal)),
                punto.real === null
                    ? celda('td', '—', 'sin-dato')
                    : celda('td', String(punto.real), punto.real > punto.ideal ? 'por-encima' : 'en-meta')
            );
            cuerpoTabla.append(fila);
        });
    };

    const pintar = (datos) => {
        const { resumen: r } = datos;
        resumen.totales.textContent = String(r.puntos_totales);
        resumen.completados.textContent = String(r.puntos_completados);
        resumen.pendientes.textContent = String(r.puntos_pendientes);
        resumen.ritmo.textContent = r.ritmo;
        resumen.ritmo.dataset.ritmo = r.ritmo;
        relleno.style.width = `${r.porcentaje}%`;
        barra.setAttribute('aria-valuenow', String(r.porcentaje));
        textoPorcentaje.textContent = `${r.porcentaje}% de los puntos del proyecto completados · ${datos.sprints.length} ${datos.sprints.length === 1 ? 'Sprint' : 'Sprints'}`;
        if (typeof window.dibujarBurndown === 'function') {
            window.dibujarBurndown(grafica, datos.puntos);
        }
        llenarTabla(datos.sprints, datos.puntos);
        grafica.setAttribute(
            'aria-label',
            `Burndown General: quedan ${r.puntos_pendientes} de ${r.puntos_totales} puntos del proyecto.`
        );
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
            estado.textContent = 'Cargando el Burndown General...';
            estado.hidden = false;
        }
        try {
            const respuesta = await fetch(`/proyectos/${idProyecto}/burndown-general`, {
                headers: { Accept: 'application/json' },
                cache: 'no-store'
            });
            if (respuesta.status === 401) {
                window.location.replace('/login');
                return;
            }
            const datos = await respuesta.json().catch(() => ({}));
            if (!respuesta.ok) {
                throw new Error(datos.mensaje || 'No se pudo cargar el Burndown General.');
            }
            if (!datos.sprints.length) {
                contenido.hidden = true;
                estado.textContent = 'Todavía no hay Sprints configurados. Cuando se cree el primero, aquí verás el avance de todo el proyecto.';
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
                cargar();
            }
        }
    };

    // Se recalcula cada vez que se abre la pestaña: así los Sprints nuevos o editados aparecen solos.
    document.addEventListener('pestana-activa', (evento) => {
        if (evento.detail.id === 'burndown-general') {
            cargar();
        }
    });

    window.addEventListener('pageshow', () => {
        if (!panel.hidden) {
            cargar();
        }
    });

    window.addEventListener('pagehide', () => {
        contenido.hidden = true;
        grafica.replaceChildren();
        cuerpoTabla.replaceChildren();
    });
})();
