const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];

const estadoDetalle = document.getElementById('estado-detalle');
const tituloEstado = document.getElementById('titulo-estado');
const descripcionEstado = document.getElementById('descripcion-estado');
const contenido = document.getElementById('contenido-proyecto');
const nombreUsuario = document.getElementById('nombre-usuario');
const avatar = document.getElementById('avatar-usuario');
const rutaProyecto = document.getElementById('ruta-proyecto');

const tituloProyecto = document.getElementById('titulo-proyecto');
const objetivoProyecto = document.getElementById('objetivo-proyecto');
const rolProyecto = document.getElementById('rol-proyecto');
const botonEditar = document.getElementById('editar-proyecto');
const formEditar = document.getElementById('form-editar');
const mensajeEditar = document.getElementById('mensaje-editar');
const confirmacionProyecto = document.getElementById('confirmacion-proyecto');

const botonNuevoSprint = document.getElementById('nuevo-sprint');
const formSprint = document.getElementById('form-sprint');
const mensajeSprint = document.getElementById('mensaje-sprint');
const confirmacionSprint = document.getElementById('confirmacion-sprint');
const inicioSprint = document.getElementById('inicio-sprint');
const finSprint = document.getElementById('fin-sprint');
const duracionSprint = document.getElementById('duracion-sprint');
const listaSprints = document.getElementById('lista-sprints');
const sinSprints = document.getElementById('sin-sprints');
const plantillaSprint = document.getElementById('plantilla-sprint');

const SIN_OBJETIVO = 'Este proyecto todavía no tiene un objetivo registrado.';
let proyectoActual = null;

const mostrarEstado = (titulo, descripcion, tipo = '') => {
    contenido.hidden = true;
    estadoDetalle.hidden = false;
    estadoDetalle.dataset.tipo = tipo;
    tituloEstado.textContent = titulo;
    descripcionEstado.textContent = descripcion;
};

const peticionJson = async (url, metodo, cuerpo) => {
    const respuesta = await fetch(url, {
        method: metodo,
        headers: {
            Accept: 'application/json',
            ...(cuerpo ? { 'Content-Type': 'application/json' } : {})
        },
        cache: 'no-store',
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    if (respuesta.status === 401) {
        window.location.replace('/login');
        return null;
    }
    const resultado = await respuesta.json().catch(() => ({}));
    return { ok: respuesta.ok, estado: respuesta.status, resultado };
};

// 'AAAA-MM-DD' -> '15 mar 2026' (sin pasar por Date local, para evitar desfases de zona horaria)
const formatearFecha = (texto) => {
    const [anio, mes, dia] = texto.split('-').map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString('es-MX', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
    });
};

const pintarProyecto = (proyecto) => {
    proyectoActual = proyecto;
    document.title = `Scrument | ${proyecto.nombre}`;
    rutaProyecto.textContent = proyecto.nombre;
    tituloProyecto.textContent = proyecto.nombre;
    objetivoProyecto.textContent = proyecto.objetivo || SIN_OBJETIVO;
};

const pintarSprints = (sprints) => {
    listaSprints.replaceChildren();
    sinSprints.hidden = sprints.length > 0;
    sprints.forEach((sprint) => {
        const tarjeta = plantillaSprint.content.cloneNode(true);
        tarjeta.querySelector('.nombre-sprint').textContent = `Sprint ${sprint.numero}`;
        tarjeta.querySelector('.estado-sprint').textContent = sprint.estado;
        tarjeta.querySelector('.objetivo-sprint').textContent = sprint.objetivo;
        tarjeta.querySelector('.fechas-sprint').textContent =
            `${formatearFecha(sprint.fecha_inicio)} – ${formatearFecha(sprint.fecha_fin)} · ${sprint.duracion_dias} ${sprint.duracion_dias === 1 ? 'día' : 'días'}`;
        listaSprints.appendChild(tarjeta);
    });
};

const cargarProyecto = async () => {
    mostrarEstado('Cargando el proyecto', 'Espera un momento.');
    try {
        const respuesta = await peticionJson(`/proyectos/${idProyecto}/datos`, 'GET');
        if (!respuesta) {
            return;
        }
        if (!respuesta.ok) {
            const noEncontrado = respuesta.estado === 404;
            mostrarEstado(
                noEncontrado ? 'No encontramos este proyecto' : 'No pudimos cargar el proyecto',
                noEncontrado ? 'Puede que no exista o que no pertenezcas a él.' : 'Recarga la página para intentarlo de nuevo.',
                'error'
            );
            return;
        }
        const datos = respuesta.resultado;
        nombreUsuario.textContent = datos.usuario.nombre;
        avatar.textContent = Array.from(datos.usuario.nombre.trim())[0]?.toUpperCase() || 'S';
        rolProyecto.textContent = datos.rol;
        botonEditar.hidden = !datos.puedeAdministrar;
        botonNuevoSprint.hidden = !datos.puedeAdministrar;
        botonInvitar.hidden = !datos.puedeInvitar;
        formInvitacion.hidden = true;
        formEditar.hidden = true;
        formSprint.hidden = true;
        pintarProyecto(datos.proyecto);
        pintarSprints(datos.sprints);
        estadoDetalle.hidden = true;
        contenido.hidden = false;
        await cargarIntegrantes();
    } catch (error) {
        console.error(error);
        mostrarEstado('No pudimos cargar el proyecto', 'Recarga la página para intentarlo de nuevo.', 'error');
    }
};

const avisar = (elemento, texto) => {
    elemento.textContent = texto;
    elemento.hidden = false;
};

// ---- PB-05: editar proyecto ----
botonEditar.addEventListener('click', () => {
    document.getElementById('nombre-editar').value = proyectoActual.nombre;
    document.getElementById('objetivo-editar').value = proyectoActual.objetivo || '';
    mensajeEditar.textContent = '';
    confirmacionProyecto.hidden = true;
    formEditar.hidden = false;
    document.getElementById('nombre-editar').focus();
});

document.getElementById('cancelar-editar').addEventListener('click', () => {
    formEditar.hidden = true;
});

formEditar.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mensajeEditar.textContent = '';
    const nombre = document.getElementById('nombre-editar').value.trim();
    if (nombre.length < 3) {
        mensajeEditar.textContent = 'El nombre del proyecto debe tener al menos 3 caracteres.';
        return;
    }
    const boton = formEditar.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
        const respuesta = await peticionJson(`/proyectos/${idProyecto}`, 'PUT', {
            nombre,
            objetivo: document.getElementById('objetivo-editar').value
        });
        if (!respuesta) {
            return;
        }
        if (!respuesta.ok) {
            mensajeEditar.textContent = respuesta.resultado.mensaje || 'No se pudieron guardar los cambios.';
            return;
        }
        pintarProyecto(respuesta.resultado.proyecto);
        formEditar.hidden = true;
        avisar(confirmacionProyecto, respuesta.resultado.mensaje);
    } catch (error) {
        console.error(error);
        mensajeEditar.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
    } finally {
        boton.disabled = false;
    }
});

// ---- PB-13: configurar Sprint ----
const calcularDuracion = () => {
    const inicio = inicioSprint.value;
    const fin = finSprint.value;
    if (!inicio || !fin) {
        duracionSprint.textContent = '—';
        return;
    }
    const dias = Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86400000) + 1;
    duracionSprint.textContent = dias < 1 ? 'fechas no válidas' : `${dias} ${dias === 1 ? 'día' : 'días'}`;
};

inicioSprint.addEventListener('input', calcularDuracion);
finSprint.addEventListener('input', calcularDuracion);

botonNuevoSprint.addEventListener('click', () => {
    formSprint.reset();
    calcularDuracion();
    mensajeSprint.textContent = '';
    confirmacionSprint.hidden = true;
    formSprint.hidden = false;
    document.getElementById('objetivo-sprint').focus();
});

document.getElementById('cancelar-sprint').addEventListener('click', () => {
    formSprint.hidden = true;
});

formSprint.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mensajeSprint.textContent = '';
    if (!document.getElementById('objetivo-sprint').value.trim()) {
        mensajeSprint.textContent = 'Escribe el objetivo del Sprint.';
        return;
    }
    if (!inicioSprint.value || !finSprint.value) {
        mensajeSprint.textContent = 'Indica una fecha de inicio y una fecha de fin.';
        return;
    }
    if (finSprint.value < inicioSprint.value) {
        mensajeSprint.textContent = 'La fecha de fin no puede ser anterior a la fecha de inicio.';
        return;
    }
    const boton = formSprint.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
        const respuesta = await peticionJson(`/proyectos/${idProyecto}/sprints`, 'POST', {
            objetivo: document.getElementById('objetivo-sprint').value,
            fecha_inicio: inicioSprint.value,
            fecha_fin: finSprint.value
        });
        if (!respuesta) {
            return;
        }
        if (!respuesta.ok) {
            mensajeSprint.textContent = respuesta.resultado.mensaje || 'No se pudo registrar el Sprint.';
            return;
        }
        formSprint.hidden = true;
        avisar(confirmacionSprint, respuesta.resultado.mensaje);
        const actualizado = await peticionJson(`/proyectos/${idProyecto}/datos`, 'GET');
        if (actualizado && actualizado.ok) {
            pintarSprints(actualizado.resultado.sprints);
        }
    } catch (error) {
        console.error(error);
        mensajeSprint.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
    } finally {
        boton.disabled = false;
    }
});

const botonInvitar = document.getElementById(
    'invitar-integrante'
);
const formInvitacion = document.getElementById(
    'form-invitacion'
);
const mensajeInvitacion = document.getElementById(
    'mensaje-invitacion'
);
const confirmacionInvitacion = document.getElementById(
    'confirmacion-invitacion'
);
const listaIntegrantes = document.getElementById(
    'lista-integrantes'
);
const estadoIntegrantes = document.getElementById(
    'estado-integrantes'
);
const seccionPendientes = document.getElementById(
    'seccion-invitaciones-enviadas'
);
const listaPendientes = document.getElementById(
    'lista-invitaciones-enviadas'
);

const crearFilaPersona = (
    nombre,
    username,
    rol,
    subtitulo
) => {
    const fila = document.createElement('li');
    fila.className = 'persona-item';
    const datos = document.createElement('div');
    datos.className = 'persona-datos';
    const nombreTexto = document.createElement('strong');
    nombreTexto.textContent = nombre;
    const identificador = document.createElement('small');
    identificador.textContent =
        `@${username}${subtitulo ? ` · ${subtitulo}` : ''}`;
    datos.append(
        nombreTexto,
        identificador
    );
    const distintivo = document.createElement('span');
    distintivo.className = 'persona-rol';
    distintivo.textContent = rol;
    fila.append(
        datos,
        distintivo
    );
    return fila;
};

const cargarIntegrantes = async () => {
    estadoIntegrantes.hidden = false;
    estadoIntegrantes.textContent =
        'Cargando integrantes...';
    listaIntegrantes.replaceChildren();
    listaPendientes.replaceChildren();
    seccionPendientes.hidden = true;
    try {
        const respuesta = await peticionJson(
            `/proyectos/${idProyecto}/integrantes`,
            'GET'
        );
        if (!respuesta) {
            return;
        }
        if (!respuesta.ok) {
            throw new Error(
                respuesta.resultado.mensaje ||
                'No se pudo cargar la lista.'
            );
        }
        const {
            integrantes,
            invitaciones
        } = respuesta.resultado;
        estadoIntegrantes.hidden =
            integrantes.length > 0;
        estadoIntegrantes.textContent =
            integrantes.length
                ? ''
                : 'Este proyecto todavía no tiene integrantes.';
        integrantes.forEach((persona) => {
            listaIntegrantes.appendChild(
                crearFilaPersona(
                    persona.nombre,
                    persona.username,
                    persona.rol
                )
            );
        });
        seccionPendientes.hidden =
            invitaciones.length === 0;
        invitaciones.forEach((persona) => {
            listaPendientes.appendChild(
                crearFilaPersona(
                    persona.nombre,
                    persona.username,
                    persona.rol,
                    'Pendiente'
                )
            );
        });
    } catch (error) {
        console.error(error);
        estadoIntegrantes.hidden = false;
        estadoIntegrantes.textContent =
            'No se pudieron consultar los integrantes.';
    }
};

botonInvitar.addEventListener('click', () => {
    formInvitacion.reset();
    mensajeInvitacion.textContent = '';
    confirmacionInvitacion.hidden = true;
    formInvitacion.hidden = false;
    document.getElementById(
        'username-invitado'
    ).focus();
});

document.getElementById(
    'cancelar-invitacion'
).addEventListener('click', () => {
    formInvitacion.hidden = true;
});

formInvitacion.addEventListener(
    'submit',
    async (evento) => {
        evento.preventDefault();
        mensajeInvitacion.textContent = '';
        const username = document.getElementById(
            'username-invitado'
        ).value.trim();
        const rol = document.getElementById(
            'rol-invitado'
        ).value;
        if (!username || username.length > 50) {
            mensajeInvitacion.textContent =
                'Escribe un nombre de usuario válido.';
            return;
        }
        const boton = formInvitacion.querySelector(
            'button[type="submit"]'
        );
        boton.disabled = true;
        try {
            const respuesta = await peticionJson(
                `/proyectos/${idProyecto}/invitaciones`,
                'POST',
                {
                    username,
                    rol
                }
            );
            if (!respuesta) {
                return;
            }
            if (!respuesta.ok) {
                mensajeInvitacion.textContent =
                    respuesta.resultado.mensaje ||
                    'No se pudo enviar la invitación.';
                return;
            }
            formInvitacion.hidden = true;
            avisar(
                confirmacionInvitacion,
                respuesta.resultado.mensaje
            );
            await cargarIntegrantes();
        } catch (error) {
            console.error(error);
            mensajeInvitacion.textContent =
                'No se pudo conectar con el servidor.';
        } finally {
            boton.disabled = false;
        }
    }
);
window.addEventListener('pageshow', cargarProyecto);
window.addEventListener('pagehide', () => {
    nombreUsuario.textContent = '';
    avatar.textContent = 'S';
    contenido.hidden = true;
});
