// Francisco: PB-45. Consulta de historias del Product Backlog por Sprint.
(() => {
    const panel = document.getElementById('panel-planning');
    if (!panel) return;
    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const lista = document.getElementById('planning-grupos');
    const estado = document.getElementById('planning-estado');
    const resumen = document.getElementById('planning-resumen');
    const reintentar = document.getElementById('planning-reintentar');
    const numeros = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
    let peticion = null;
    let version = 0;
    let paginaActiva = true;

    const visible = () => paginaActiva && !panel.hidden && !document.hidden;
    const crear = (etiqueta, texto, clase) => {
        const elemento = document.createElement(etiqueta);
        if (texto !== undefined) elemento.textContent = texto;
        if (clase) elemento.className = clase;
        return elemento;
    };

    const pintarGrupo = (grupo) => {
        const nombre = grupo.id_sprint === null ? 'Sin Sprint' : `Sprint ${grupo.numero}`;
        const seccion = crear('section', undefined, 'planning-grupo');
        const cabecera = crear('div', undefined, 'planning-cabecera-grupo');
        const titulo = crear('h3', nombre);
        titulo.id = `planning-sprint-${grupo.id_sprint === null ? 'sin-asignar' : grupo.id_sprint}`;
        seccion.setAttribute('aria-labelledby', titulo.id);
        cabecera.append(titulo, crear('span',
            `${grupo.historias.length} ${grupo.historias.length === 1 ? 'historia' : 'historias'}`,
            'conteo-proyectos'));

        const contenedor = crear('div', undefined, 'planning-contenedor-tabla');
        contenedor.tabIndex = 0;
        contenedor.setAttribute('role', 'region');
        contenedor.setAttribute('aria-labelledby', titulo.id);
        const tabla = crear('table', undefined, 'planning-tabla');
        const caption = crear('caption', `Historias de ${nombre}`);
        const encabezado = crear('thead');
        const filaTitulos = crear('tr');
        ['Historia', 'Responsable', 'Sprint', 'Puntos de historia', 'Horas estimadas'].forEach((texto, indice) => {
            const celda = crear('th', texto, indice > 2 ? 'planning-numero' : undefined);
            celda.scope = 'col';
            filaTitulos.append(celda);
        });
        encabezado.append(filaTitulos);
        const cuerpo = crear('tbody');
        grupo.historias.forEach((historia) => {
            const fila = crear('tr');
            fila.dataset.idHistoria = historia.id_historia;
            const tituloHistoria = crear('th', undefined, 'planning-historia');
            tituloHistoria.scope = 'row';
            tituloHistoria.append(crear('span', historia.titulo),
                crear('span', `Historia #${historia.id_historia}`, 'planning-id'));
            const responsable = crear('td', historia.responsable || 'Sin asignar');
            const puntos = crear('td', historia.puntos === null ? 'Sin estimar' : numeros.format(historia.puntos),
                'planning-numero');
            const horas = crear('td', historia.horas_estimadas === null ? 'Sin estimar' :
                `${numeros.format(historia.horas_estimadas)} h`, 'planning-numero');
            if (!historia.responsable) responsable.classList.add('planning-pendiente');
            if (historia.puntos === null) puntos.classList.add('planning-pendiente');
            if (historia.horas_estimadas === null) horas.classList.add('planning-pendiente');
            fila.append(tituloHistoria, responsable, crear('td', nombre), puntos, horas);
            cuerpo.append(fila);
        });
        tabla.append(caption, encabezado, cuerpo);
        contenedor.append(tabla);
        seccion.append(cabecera, contenedor);
        return seccion;
    };

    const detener = () => {
        version++;
        peticion?.abort();
        peticion = null;
        lista.setAttribute('aria-busy', 'false');
    };

    const cargar = async () => {
        if (!visible()) return;
        detener();
        const actual = version;
        const control = new AbortController();
        peticion = control;
        lista.replaceChildren();
        lista.setAttribute('aria-busy', 'true');
        resumen.hidden = true;
        reintentar.hidden = true;
        estado.hidden = false;
        estado.dataset.tipo = '';
        estado.textContent = 'Cargando historias…';
        try {
            const respuesta = await fetch(`/proyectos/${idProyecto}/planning`, {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
                signal: control.signal
            });
            if (actual !== version || !visible()) return;
            if (respuesta.status === 401) {
                window.location.replace('/login');
                return;
            }
            const datos = await respuesta.json();
            if (actual !== version || !visible()) return;
            if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo cargar Planning Poker.');
            lista.replaceChildren(...datos.grupos.map(pintarGrupo));
            resumen.textContent = `${datos.total_historias} ` +
                `${datos.total_historias === 1 ? 'historia en el proyecto' : 'historias en el proyecto'}`;
            resumen.hidden = datos.total_historias === 0;
            estado.hidden = datos.total_historias > 0;
            estado.textContent = datos.total_historias ? '' : 'Todavía no hay historias en el Product Backlog de este proyecto.';
        } catch (error) {
            if (actual !== version || !visible() || error.name === 'AbortError') return;
            estado.dataset.tipo = 'error';
            estado.textContent = error.message || 'No se pudo conectar con el servidor.';
            reintentar.hidden = false;
        } finally {
            if (actual === version) {
                peticion = null;
                lista.setAttribute('aria-busy', 'false');
            }
        }
    };

    const sincronizar = () => visible() ? cargar() : detener();
    document.addEventListener('pestana-activa', sincronizar);
    document.addEventListener('visibilitychange', sincronizar);
    // PB-46 puede emitir este evento después de guardar para refrescar las horas.
    document.addEventListener('planning-actualizado', sincronizar);
    window.addEventListener('focus', sincronizar);
    window.addEventListener('pageshow', () => {
        paginaActiva = true;
        sincronizar();
    });
    window.addEventListener('pagehide', () => {
        paginaActiva = false;
        detener();
        lista.replaceChildren();
        resumen.hidden = true;
    });
    reintentar.addEventListener('click', cargar);
    sincronizar();
})();
