// BUZÓN DE NOTIFICACIONES DE SCRUMENT
(() => {
    const buzon = document.getElementById('buzon-notificaciones');
    if (!buzon) return;

    const boton = document.getElementById('boton-notificaciones');
    const panel = document.getElementById('panel-notificaciones');
    const contador = document.getElementById('contador-notificaciones');
    const lista = document.getElementById('lista-notificaciones');
    const estado = document.getElementById('estado-notificaciones');
    const marcarTodas = document.getElementById('marcar-todas-notificaciones');
    const verTodas = document.getElementById('ver-todas-notificaciones');

    let activo = false;
    let mostrarTodas = false;
    let registros = [];
    let version = 0;

    // PETICIONES AL SERVIDOR
    async function pedir(url, metodo = 'GET') {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });

        if (respuesta.status === 401) {
            window.location.replace('/login');
            throw new Error('La sesión terminó.');
        }

        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            throw new Error(datos.mensaje || 'No se pudo actualizar el buzón.');
        }

        return datos;
    }

    // CREAR UNA NOTIFICACIÓN
    function crearNotificacion(n) {
        const item = document.createElement('li');

        if (!n.leida) {
            item.classList.add('no-leida');
        }

        const titulo = document.createElement('strong');
        titulo.textContent = `Nueva historia asignada: ${n.titulo_historia}`;

        const detalle = document.createElement('small');
        detalle.textContent = `${n.proyecto} · ${n.fecha}`;

        const acciones = document.createElement('div');
        acciones.className = 'acciones-notificacion';

        const enlace = document.createElement('a');

        enlace.href = `/proyectos/${Number(n.id_proyecto)}`;
        enlace.textContent = 'Abrir proyecto';

        acciones.append(enlace);

        // BOTÓN PARA IR DIRECTAMENTE A LA HISTORIA
        const idProyecto = Number(n.id_proyecto);
        const idHistoria = Number(n.id_historia);
        const idSprint = Number(n.id_sprint);

        if (
            Number.isSafeInteger(idProyecto) && idProyecto > 0 &&
            Number.isSafeInteger(idHistoria) && idHistoria > 0 &&
            Number.isSafeInteger(idSprint) && idSprint > 0
        ) {
            const irHistoria = document.createElement('a');

            irHistoria.href =
                `/proyectos/${idProyecto}?historia=${idHistoria}&sprint=${idSprint}`;

            irHistoria.textContent = 'Ir a mi historia';

            irHistoria.setAttribute(
                'aria-label',
                `Abrir área de trabajo de ${n.titulo_historia}`
            );

            acciones.append(irHistoria);
        }

        // MARCAR COMO LEÍDA
        if (!n.leida) {
            const leer = document.createElement('button');
            leer.type = 'button';
            leer.textContent = 'Marcar leída';

            leer.addEventListener('click', async () => {
                leer.disabled = true;

                try {
                    await pedir(
                        `/notificaciones/${n.id_notificacion}/leida`,
                        'PUT'
                    );

                    await cargar();

                } catch (error) {
                    estado.textContent = error.message;
                    leer.disabled = false;
                }
            });

            acciones.append(leer);
        }

        item.append(titulo, detalle, acciones);

        return item;
    }

    // MOSTRAR NOTIFICACIONES
    function pintar() {
        lista.replaceChildren();

        const visibles = mostrarTodas
            ? registros
            : registros.slice(0, 3);

        visibles.forEach(n => {
            lista.append(crearNotificacion(n));
        });

        if (!registros.length) {
            estado.textContent = 'Todavía no tienes notificaciones.';
        }

        verTodas.hidden = registros.length <= 3;

        verTodas.textContent = mostrarTodas
            ? 'Mostrar menos'
            : 'Ver todas las notificaciones';
    }

    // CARGAR NOTIFICACIONES
    async function cargar() {
        if (!activo) return;

        const miVersion = ++version;

        try {
            const datos = await pedir('/notificaciones');

            if (miVersion !== version) return;

            registros = datos.notificaciones || [];

            const pendientes = Number(datos.pendientes) || 0;

            contador.hidden = pendientes === 0;

            contador.textContent = pendientes > 99
                ? '99+'
                : String(pendientes);

            boton.setAttribute(
                'aria-label',
                `Notificaciones: ${pendientes} sin leer`
            );

            marcarTodas.disabled = pendientes === 0;

            estado.textContent =
                `${pendientes} notificación${pendientes === 1 ? '' : 'es'} sin leer.`;

            pintar();

        } catch (error) {
            if (miVersion === version) {
                estado.textContent = error.message;
            }
        }
    }

    // ABRIR Y CERRAR EL BUZÓN
    boton.addEventListener('click', () => {
        panel.hidden = !panel.hidden;

        boton.setAttribute(
            'aria-expanded',
            String(!panel.hidden)
        );

        if (!panel.hidden) {
            cargar();
        }
    });

    // MARCAR TODAS COMO LEÍDAS
    marcarTodas.addEventListener('click', async () => {
        marcarTodas.disabled = true;

        try {
            await pedir('/notificaciones/leidas', 'PUT');
            await cargar();

        } catch (error) {
            estado.textContent = error.message;
            marcarTodas.disabled = false;
        }
    });

    // VER TODAS LAS NOTIFICACIONES
    verTodas.addEventListener('click', () => {
        mostrarTodas = !mostrarTodas;
        pintar();
    });

    // CERRAR AL HACER CLIC FUERA
    document.addEventListener('click', evento => {
        if (!buzon.contains(evento.target)) {
            panel.hidden = true;
            boton.setAttribute('aria-expanded', 'false');
        }
    });

    // CERRAR CON ESCAPE
    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape' && !panel.hidden) {
            panel.hidden = true;
            boton.setAttribute('aria-expanded', 'false');
            boton.focus();
        }
    });

    // MOSTRAR CAMPANA SOLO A DESARROLLADORES
    function habilitar(rol) {
        activo = rol === 'Desarrollador';
        buzon.hidden = !activo;

        if (activo) {
            cargar();
        }
    }

    // CUANDO SE ABRE UN PROYECTO
    document.addEventListener('proyecto-cargado', evento => {
        habilitar(evento.detail?.rol);
    });

    // CUANDO SE ABRE MIS PROYECTOS
    document.addEventListener('usuario-cargado', evento => {
        const detalle = evento.detail || {};

        const esDesarrollador =
            detalle.rol === 'Desarrollador' ||
            detalle.tieneRolDesarrollador === true;

        habilitar(esDesarrollador ? 'Desarrollador' : detalle.rol);
    });

    // ACTUALIZAR AL REGRESAR AL NAVEGADOR
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && activo) {
            cargar();
        }
    });

    // BUSCAR NUEVAS NOTIFICACIONES CADA 15 SEGUNDOS
    setInterval(() => {
        if (activo && !document.hidden) {
            cargar();
        }
    }, 15000);
})();