// PB-34: retrospectiva del Sprint.
(() => {
    const panel = document.getElementById('panel-retrospectiva');
    if (!panel) return;

    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    if (!/^\d{1,10}$/.test(idProyecto || '')) return;

    const direccion = `/proyectos/${idProyecto}/retrospectivas`;

    const formulario = document.getElementById('retrospectiva-formulario');
    const selectorSprint = document.getElementById('retrospectiva-sprint');
    const campoAciertos = document.getElementById('retrospectiva-aciertos');
    const campoMejoras = document.getElementById('retrospectiva-mejoras');
    const campoAcciones = document.getElementById('retrospectiva-acciones');
    const estado = document.getElementById('retrospectiva-estado');
    const errorFormulario = document.getElementById('retrospectiva-error');
    const confirmacion = document.getElementById('retrospectiva-confirmacion');
    const botonGuardar = document.getElementById('retrospectiva-guardar');
    const lista = document.getElementById('retrospectiva-lista');
    const mensajeVacio = document.getElementById('retrospectiva-vacia');

    let sprints = [];
    let retrospectivas = [];
    let idUsuarioActual = null;
    let cargando = false;
    let guardando = false;
    let bloqueado = false;

    const mostrarEstado = (mensaje, tipo = '') => {
        estado.textContent = mensaje;
        estado.dataset.tipo = tipo;
    };

    const solicitar = async (metodo, datos) => {
        const respuesta = await fetch(direccion, {
            method: metodo,
            headers: {
                Accept: 'application/json',
                ...(datos ? { 'Content-Type': 'application/json' } : {})
            },
            cache: 'no-store',
            body: datos ? JSON.stringify(datos) : undefined
        });

        if (respuesta.status === 401) {
            window.location.replace('/login');
            throw new Error('Tu sesión terminó. Inicia sesión nuevamente.');
        }

        const resultado = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje || 'No se pudo completar la operación.'
            );
        }

        return resultado;
    };

    const limpiarFormulario = () => {
        campoAciertos.value = '';
        campoMejoras.value = '';
        campoAcciones.value = '';
    };

    const cargarMiAportacion = () => {
        const idSprint = Number(selectorSprint.value);

        if (!idSprint) {
            limpiarFormulario();
            return;
        }

        const propia = retrospectivas.find((registro) =>
            Number(registro.id_sprint) === idSprint &&
            Number(registro.id_usuario) === Number(idUsuarioActual)
        );

        if (propia) {
            campoAciertos.value = propia.aciertos;
            campoMejoras.value = propia.aspectos_mejorar;
            campoAcciones.value = propia.acciones_acordadas;
            mostrarEstado(
                'Ya registraste tu aportación para este Sprint. Puedes modificarla.'
            );
        } else {
            limpiarFormulario();
            mostrarEstado('Escribe tu aportación para este Sprint.');
        }
    };

    const mostrarSprints = (idSeleccionado = '') => {
        selectorSprint.replaceChildren();

        const inicial = document.createElement('option');
        inicial.value = '';
        inicial.textContent = 'Selecciona un Sprint';
        selectorSprint.appendChild(inicial);

        sprints.forEach((sprint) => {
            const opcion = document.createElement('option');
            opcion.value = String(sprint.id_sprint);
            opcion.textContent = `Sprint ${sprint.numero} · ${sprint.estado}`;
            selectorSprint.appendChild(opcion);
        });

        if (sprints.some((sprint) =>
            String(sprint.id_sprint) === String(idSeleccionado)
        )) {
            selectorSprint.value = String(idSeleccionado);
        }

        const sinSprints = sprints.length === 0;
        selectorSprint.disabled = sinSprints || bloqueado;
        [campoAciertos, campoMejoras, campoAcciones].forEach((campo) => {
            campo.disabled = sinSprints || bloqueado;
        });
        botonGuardar.disabled = sinSprints || bloqueado || guardando;

        if (sinSprints) {
            mostrarEstado('Este proyecto todavía no tiene Sprints configurados.');
        }
    };

    const crearSeccionTexto = (titulo, texto) => {
        const seccion = document.createElement('section');
        seccion.className = 'retrospectiva-detalle';

        const encabezado = document.createElement('h4');
        encabezado.textContent = titulo;

        const parrafo = document.createElement('p');
        parrafo.textContent = texto;

        seccion.append(encabezado, parrafo);
        return seccion;
    };

    const mostrarRetrospectivas = () => {
        lista.replaceChildren();

        mensajeVacio.hidden = retrospectivas.length > 0;

        sprints.forEach((sprint) => {
            const registros = retrospectivas.filter((registro) =>
                Number(registro.id_sprint) === Number(sprint.id_sprint)
            );

            const grupo = document.createElement('section');
            grupo.className = 'grupo-retrospectiva';

            const titulo = document.createElement('h3');
            titulo.textContent = `Sprint ${sprint.numero}`;

            const objetivo = document.createElement('p');
            objetivo.className = 'objetivo-retrospectiva';
            objetivo.textContent = sprint.objetivo || 'Sin objetivo registrado.';

            grupo.append(titulo, objetivo);

            if (registros.length === 0) {
                const sinRegistros = document.createElement('p');
                sinRegistros.className = 'retrospectiva-sin-registros';
                sinRegistros.textContent = 'Todavía no hay aportaciones para este Sprint.';
                grupo.appendChild(sinRegistros);
            }

            registros.forEach((registro) => {
                const tarjeta = document.createElement('article');
                tarjeta.className = 'tarjeta-retrospectiva';

                const cabecera = document.createElement('div');
                cabecera.className = 'cabecera-retrospectiva';

                const autor = document.createElement('strong');
                autor.textContent = registro.nombre_usuario || registro.username;

                const fecha = document.createElement('time');
                fecha.textContent = `Actualizado: ${registro.fecha_actualizacion}`;

                cabecera.append(autor, fecha);
                tarjeta.appendChild(cabecera);

                tarjeta.append(
                    crearSeccionTexto('Aciertos', registro.aciertos),
                    crearSeccionTexto('Aspectos por mejorar', registro.aspectos_mejorar),
                    crearSeccionTexto('Acciones acordadas', registro.acciones_acordadas)
                );

                grupo.appendChild(tarjeta);
            });

            lista.appendChild(grupo);
        });
    };

    const cargar = async (idSprintSeleccionado = selectorSprint.value) => {
        if (cargando || bloqueado || panel.hidden || document.hidden) return;

        cargando = true;
        mostrarEstado('Cargando retrospectivas...');
        botonGuardar.disabled = true;

        try {
            const resultado = await solicitar('GET');

            idUsuarioActual = resultado.id_usuario;
            sprints = resultado.sprints || [];
            retrospectivas = resultado.retrospectivas || [];

            mostrarSprints(idSprintSeleccionado);
            mostrarRetrospectivas();
            cargarMiAportacion();

            if (sprints.length > 0) {
                mostrarEstado(
                    'Cada integrante puede registrar una aportación por Sprint y consultarla después.'
                );
            }
        } catch (error) {
            mostrarEstado(error.message, 'error');
            if (error.message.includes('No encontramos ese proyecto')) {
                bloqueado = true;
                formulario.hidden = true;
                mensajeVacio.hidden = false;
                mensajeVacio.textContent = 'No tienes acceso a este proyecto.';
            }
            console.error('PB-34:', error);
        } finally {
            cargando = false;
            botonGuardar.disabled = sprints.length === 0 || bloqueado || guardando;
        }
    };

    selectorSprint.addEventListener('change', () => {
        errorFormulario.textContent = '';
        confirmacion.hidden = true;
        cargarMiAportacion();
    });

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        if (guardando || bloqueado) return;

        const datos = {
            id_sprint: Number(selectorSprint.value),
            aciertos: campoAciertos.value.trim(),
            aspectos_mejorar: campoMejoras.value.trim(),
            acciones_acordadas: campoAcciones.value.trim()
        };

        if (!datos.id_sprint) {
            errorFormulario.textContent = 'Selecciona un Sprint.';
            return;
        }

        if (!datos.aciertos || !datos.aspectos_mejorar || !datos.acciones_acordadas) {
            errorFormulario.textContent = 'Completa los tres campos antes de guardar.';
            return;
        }

        if (
            datos.aciertos.length > 3000 ||
            datos.aspectos_mejorar.length > 3000 ||
            datos.acciones_acordadas.length > 3000
        ) {
            errorFormulario.textContent = 'Cada campo permite un máximo de 3000 caracteres.';
            return;
        }

        guardando = true;
        errorFormulario.textContent = '';
        confirmacion.hidden = true;
        botonGuardar.disabled = true;
        botonGuardar.textContent = 'Guardando...';

        try {
            const resultado = await solicitar('POST', datos);
            await cargar(String(datos.id_sprint));
            confirmacion.textContent = resultado.mensaje;
            confirmacion.hidden = false;
        } catch (error) {
            errorFormulario.textContent = error.message;
        } finally {
            guardando = false;
            botonGuardar.textContent = 'Guardar retrospectiva';
            botonGuardar.disabled = sprints.length === 0 || bloqueado;
        }
    });

    document.addEventListener('pestana-activa', (evento) => {
        if (evento.detail?.id === 'retrospectiva') {
            cargar();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !panel.hidden) {
            cargar();
        }
    });
})();
