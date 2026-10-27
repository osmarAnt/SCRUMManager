// Pestañas del proyecto: Menú principal, Backlog, Planning Poker, Burndown Chart, Tablero Kanban y Avisos.
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
})();
