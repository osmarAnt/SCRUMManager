// Pestañas del proyecto: Menú principal, Backlog, Planning Poker, Burndown Chart, Burndown General, Tablero Kanban, Avisos y Reuniones.
// La pestaña activa se guarda en la dirección (#burndown, #avisos...) para que al recargar o compartir el enlace se conserve.
(() => {
    const barra = document.getElementById('pestanas-proyecto');
    if (!barra) {
        return;
    }
    const pestanas = [...barra.querySelectorAll('[role="tab"]')];
    const PREDETERMINADA = 'menu';

    const panelDe = (pestana) => document.getElementById(pestana.getAttribute('aria-controls'));
    const existe = (id) => pestanas.some((pestana) => pestana.dataset.panel === id);

    // En pantallas angostas la barra se desplaza: la pestaña activa siempre queda a la vista.
    const mostrarActiva = () => {
        const activa = pestanas.find((pestana) => pestana.getAttribute('aria-selected') === 'true');
        if (activa && barra.scrollWidth > barra.clientWidth) {
            barra.scrollLeft = Math.max(0, activa.offsetLeft - (barra.clientWidth - activa.offsetWidth) / 2);
        }
    };

    const activar = (id, { enfocar = false, actualizarDireccion = true } = {}) => {
        const destino = existe(id) ? id : PREDETERMINADA;
        pestanas.forEach((pestana) => {
            const activa = pestana.dataset.panel === destino;
            pestana.setAttribute('aria-selected', String(activa));
            pestana.tabIndex = activa ? 0 : -1;
            panelDe(pestana).hidden = !activa;
            if (activa && enfocar) {
                pestana.focus();
            }
        });
        if (actualizarDireccion) {
            const direccion = destino === PREDETERMINADA ? window.location.pathname : `#${destino}`;
            window.history.replaceState(null, '', direccion);
        }
        mostrarActiva();
        // Permite que otros módulos (como el Burndown Chart) se actualicen al abrir su pestaña.
        document.dispatchEvent(new CustomEvent('pestana-activa', { detail: { id: destino } }));
    };

    pestanas.forEach((pestana, posicion) => {
        pestana.addEventListener('click', () => activar(pestana.dataset.panel));
        pestana.addEventListener('keydown', (evento) => {
            const ultimo = pestanas.length - 1;
            const siguiente = {
                ArrowRight: posicion === ultimo ? 0 : posicion + 1,
                ArrowLeft: posicion === 0 ? ultimo : posicion - 1,
                Home: 0,
                End: ultimo
            }[evento.key];
            if (siguiente === undefined) {
                return;
            }
            evento.preventDefault();
            activar(pestanas[siguiente].dataset.panel, { enfocar: true });
        });
    });

    window.addEventListener('hashchange', () => {
        activar(window.location.hash.slice(1), { actualizarDireccion: false });
    });

    activar(window.location.hash.slice(1), { actualizarDireccion: false });

    // El contenido del proyecto está oculto hasta que carga: entonces sí se puede medir y desplazar la barra.
    const contenido = document.getElementById('contenido-proyecto');
    if (contenido) {
        new MutationObserver(mostrarActiva).observe(contenido, { attributes: true, attributeFilter: ['hidden'] });
    }
})();
