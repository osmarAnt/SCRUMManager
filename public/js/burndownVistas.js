// PB-59 (Nino): sub-pestañas "Por puntos" (las gráficas actuales) y "Por horas"
// en el Burndown Chart y en el Burndown General.
// Cada grupo es un .subpestanas-burndown con data-panel (la pestaña del proyecto donde vive)
// y data-subtitulo-id (el subtítulo que cambia según la vista elegida).
//
// PB-60 y PB-61 pueden escuchar el evento 'burndown-vista' para cargar su gráfica de horas:
//     document.addEventListener('burndown-vista', (e) => {
//         if (e.detail.panel === 'burndown' && e.detail.vista === 'horas') { ... }          // PB-60
//         if (e.detail.panel === 'burndown-general' && e.detail.vista === 'horas') { ... }  // PB-61
//     });
(() => {
    'use strict';

    const avisar = (panel, vista) => {
        document.dispatchEvent(new CustomEvent('burndown-vista', { detail: { panel, vista } }));
    };

    const prepararGrupo = (barra) => {
        const panel = barra.dataset.panel;
        const subtitulo = document.getElementById(barra.dataset.subtituloId);
        const pestanas = [...barra.querySelectorAll('[role="tab"]')];
        let vistaActual = null;

        const activar = (vista, enfocar = false) => {
            const destino = pestanas.some((p) => p.dataset.vista === vista) ? vista : 'puntos';
            pestanas.forEach((pestana) => {
                const activa = pestana.dataset.vista === destino;
                pestana.setAttribute('aria-selected', String(activa));
                pestana.tabIndex = activa ? 0 : -1;
                document.getElementById(pestana.getAttribute('aria-controls')).hidden = !activa;
                if (activa) {
                    if (subtitulo && pestana.dataset.subtitulo) subtitulo.textContent = pestana.dataset.subtitulo;
                    if (enfocar) pestana.focus();
                }
            });
            if (destino === vistaActual) return;
            const inicial = vistaActual === null;
            vistaActual = destino;
            if (!inicial) avisar(panel, destino);
        };

        pestanas.forEach((pestana, posicion) => {
            pestana.addEventListener('click', () => activar(pestana.dataset.vista));
            // Flechas, Inicio y Fin, igual que las pestañas principales.
            pestana.addEventListener('keydown', (evento) => {
                const ultimo = pestanas.length - 1;
                const siguiente = {
                    ArrowRight: posicion === ultimo ? 0 : posicion + 1,
                    ArrowLeft: posicion === 0 ? ultimo : posicion - 1,
                    Home: 0,
                    End: ultimo
                }[evento.key];
                if (siguiente === undefined) return;
                evento.preventDefault();
                activar(pestanas[siguiente].dataset.vista, true);
            });
        });

        // Al volver a abrir la pestaña del proyecto se avisa qué vista está activa (para que PB-60/61 recarguen).
        document.addEventListener('pestana-activa', (evento) => {
            if (evento.detail.id === panel) avisar(panel, vistaActual);
        });

        activar('puntos');
    };

    document.querySelectorAll('.subpestanas-burndown').forEach(prepararGrupo);
})();
