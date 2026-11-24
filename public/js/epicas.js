// Sprint 7 · Bloque 2 (César) · HU-07 y HU-08: épicas.
//  - El Scrum Master crea épicas con nombre y color (TC-07-01); nadie más ve el formulario (TC-07-02).
//  - Toda historia pertenece a una épica: se elige en el formulario del Backlog (TC-08-02).
//  - La épica se muestra como una etiqueta de color en el Backlog, el Sprint Backlog y el Kanban.
(() => {
    'use strict';

    // Etiqueta de color reutilizable (la usan backlog.js, kanban.js y proyecto.js).
    window.crearChipEpica = (nombre, color) => {
        const chip = document.createElement('span');
        chip.className = 'chip-epica';
        chip.textContent = nombre;
        if (/^#[0-9a-f]{6}$/i.test(color || '')) {
            chip.style.setProperty('--color-epica', color);
        }
        return chip;
    };

    const panel = document.getElementById('bloque-epicas');
    if (!panel) return;

    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const lista = document.getElementById('lista-epicas');
    const estado = document.getElementById('estado-epicas');
    const botonNueva = document.getElementById('nueva-epica');
    const formulario = document.getElementById('form-epica');
    const campoNombre = document.getElementById('nombre-epica');
    const campoColor = document.getElementById('color-epica');
    const campoDescripcion = document.getElementById('descripcion-epica');
    const error = document.getElementById('error-epica');
    const confirmacion = document.getElementById('confirmacion-epica');
    const selectorHistoria = document.getElementById('epica-historia');

    window.epicasProyecto = [];

    const pintar = (epicas) => {
        lista.replaceChildren(...epicas.map((epica) => {
            const elemento = document.createElement('li');
            elemento.className = 'epica-item';
            const chip = window.crearChipEpica(epica.nombre, epica.color);
            const total = document.createElement('span');
            total.className = 'epica-total';
            total.textContent = `${epica.total_historias} ${epica.total_historias === 1 ? 'historia' : 'historias'}`;
            elemento.append(chip, total);
            if (epica.descripcion) {
                const descripcion = document.createElement('span');
                descripcion.className = 'epica-descripcion';
                descripcion.textContent = epica.descripcion;
                elemento.append(descripcion);
            }
            return elemento;
        }));
        estado.textContent = epicas.length
            ? ''
            : 'Todavía no hay épicas. El Scrum Master debe crear al menos una antes de registrar historias.';

        // Selector del formulario de historias (conserva la selección actual).
        if (selectorHistoria) {
            const anterior = selectorHistoria.value;
            selectorHistoria.replaceChildren(new Option(epicas.length ? 'Selecciona una épica' : 'No hay épicas creadas', ''));
            epicas.forEach((epica) => selectorHistoria.add(new Option(epica.nombre, String(epica.id_epica))));
            if (epicas.some((epica) => String(epica.id_epica) === anterior)) selectorHistoria.value = anterior;
        }
    };

    const cargar = async () => {
        try {
            const respuesta = await fetch(`/proyectos/${idProyecto}/epicas`, {
                headers: { Accept: 'application/json' }, cache: 'no-store'
            });
            if (respuesta.status === 401) return window.location.replace('/login');
            const datos = await respuesta.json().catch(() => ({}));
            if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudieron cargar las épicas.');
            botonNueva.hidden = !datos.puedeCrear;
            if (!datos.puedeCrear) formulario.hidden = true;
            window.epicasProyecto = datos.epicas;
            pintar(datos.epicas);
            document.dispatchEvent(new CustomEvent('epicas-actualizadas', { detail: { epicas: datos.epicas } }));
        } catch (fallo) {
            estado.textContent = fallo.message;
        }
    };

    botonNueva.addEventListener('click', () => {
        formulario.reset();
        campoColor.value = '#0052cc';
        error.textContent = '';
        confirmacion.hidden = true;
        formulario.hidden = false;
        campoNombre.focus();
    });

    document.getElementById('cancelar-epica').addEventListener('click', () => {
        formulario.hidden = true;
    });

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        error.textContent = '';
        const datos = {
            nombre: campoNombre.value.trim(),
            color: campoColor.value,
            descripcion: campoDescripcion.value.trim()
        };
        // TC-07-03: sin nombre o sin color no se guarda.
        if (datos.nombre.length < 2) {
            error.textContent = 'Escribe el nombre de la épica (al menos 2 caracteres).';
            return campoNombre.focus();
        }
        if (!/^#[0-9a-f]{6}$/i.test(datos.color)) {
            error.textContent = 'Elige el color de la épica.';
            return campoColor.focus();
        }
        const boton = formulario.querySelector('button[type="submit"]');
        boton.disabled = true;
        try {
            const respuesta = await fetch(`/proyectos/${idProyecto}/epicas`, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            if (respuesta.status === 401) return window.location.replace('/login');
            const resultado = await respuesta.json().catch(() => ({}));
            if (!respuesta.ok) {
                error.textContent = resultado.mensaje || 'No se pudo crear la épica.';
                return;
            }
            formulario.hidden = true;
            confirmacion.textContent = resultado.mensaje;
            confirmacion.hidden = false;
            await cargar();
        } catch (fallo) {
            error.textContent = 'No se pudo conectar con el servidor.';
        } finally {
            boton.disabled = false;
        }
    });

    document.addEventListener('pestana-activa', (evento) => {
        if (evento.detail?.id === 'backlog') cargar();
    });
    cargar();
})();
