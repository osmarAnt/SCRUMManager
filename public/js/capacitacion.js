document.addEventListener('DOMContentLoaded', () => {
    const capacitaciones = {
        'scrum-master': 'Capacitación para Scrum Master',
        'product-owner': 'Capacitación para Product Owner',
        'desarrollador': 'Capacitación para Desarrollador'
    };

    const opciones = document.getElementById('cap-opciones');
    const detalle = document.getElementById('cap-detalle');
    const titulo = document.getElementById('cap-titulo-detalle');
    const volver = document.getElementById('cap-volver');

    function mostrarCapacitacion(rol, actualizarUrl = true) {
        const valido = Object.hasOwn(capacitaciones, rol);
        opciones.hidden = valido;
        detalle.hidden = !valido;
        titulo.textContent = valido ? capacitaciones[rol] : '';

        if (valido) titulo.focus();

        if (actualizarUrl) {
            const destino = valido
                ? `/capacitacion?rol=${encodeURIComponent(rol)}`
                : '/capacitacion';
            history.pushState({ rol: valido ? rol : null }, '', destino);
        }
    }

    document.querySelectorAll('[data-cap-rol]').forEach(tarjeta => {
        tarjeta.addEventListener('click', () => {
            mostrarCapacitacion(tarjeta.dataset.capRol);
        });
    });

    volver.addEventListener('click', () => mostrarCapacitacion(null));

    window.addEventListener('popstate', () => {
        mostrarCapacitacion(new URLSearchParams(location.search).get('rol'), false);
    });

    mostrarCapacitacion(new URLSearchParams(location.search).get('rol'), false);
});