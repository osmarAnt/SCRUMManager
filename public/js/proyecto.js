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
let puedeGestionarIntegrantes = false;

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
        puedeGestionarIntegrantes = datos.puedeInvitar === true;
        botonInvitar.hidden = !puedeGestionarIntegrantes;
        formInvitacion.hidden = true;
        formEditar.hidden = true;
        formSprint.hidden = true;
        pintarProyecto(datos.proyecto);
        pintarSprints(datos.sprints);
        await prepararSprintBacklog(datos.sprints, datos.puedeAdministrar);
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

            await prepararSprintBacklog(
            actualizado.resultado.sprints,
            actualizado.resultado.puedeAdministrar
            );


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
const mensajeIntegrantes = document.getElementById(
    'mensaje-integrantes'
);
const buscarUsuario = document.getElementById(
    'buscar-usuario'
);
const selectorUsuarios = document.getElementById(
    'username-invitado'
);
let usuariosDisponibles = [];

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
const pintarUsuariosDisponibles = () => {
    const busqueda = buscarUsuario.value
        .trim()
        .toLocaleLowerCase('es-MX');
    const filtrados = usuariosDisponibles.filter(
        (usuario) => {
            const texto =
                `${usuario.nombre} ${usuario.username}`
                    .toLocaleLowerCase('es-MX');
            return texto.includes(busqueda);
        }
    );

    selectorUsuarios.replaceChildren();
    filtrados.forEach((usuario) => {
        const opcion = document.createElement('option');
        opcion.value = usuario.username;
        opcion.textContent =
            `${usuario.nombre} (@${usuario.username})`;
        selectorUsuarios.appendChild(opcion);
    });

    selectorUsuarios.selectedIndex = -1;
    if (filtrados.length === 0) {
        mensajeInvitacion.textContent =
            'No hay usuarios disponibles con esa búsqueda.';
    } else {
        mensajeInvitacion.textContent = '';
    }
};

const cargarUsuariosDisponibles = async () => {
    const respuesta = await peticionJson(
        `/proyectos/${idProyecto}/usuarios-disponibles`,
        'GET'
    );

    if (!respuesta) {
        return;
    }
    if (!respuesta.ok) {
        throw new Error(
            respuesta.resultado.mensaje ||
            'No se pudieron cargar los usuarios.'
        );
    }
    usuariosDisponibles = respuesta.resultado.usuarios;
    pintarUsuariosDisponibles();
};

buscarUsuario.addEventListener(
    'input',
    pintarUsuariosDisponibles
);
const crearControlesIntegrante = (persona) => {
    const contenedor = document.createElement('div');
    contenedor.className = 'acciones-integrante';
    const editar = document.createElement('button');
    editar.type = 'button';
    editar.textContent = 'Editar rol';
    editar.className = 'boton-secundario';
    
    const eliminar = document.createElement('button');
    eliminar.type = 'button';
    eliminar.textContent = 'Eliminar';
    eliminar.className = 'boton-peligro';
    
    const mostrarControles = () => {
        contenedor.replaceChildren(
            editar,
            eliminar
        );
    };
    mostrarControles();
    editar.addEventListener('click', () => {
        const seleccion = document.createElement('select');
        seleccion.setAttribute(
            'aria-label',
            `Nuevo rol de ${persona.nombre}`
        );
        const roles = [
            'Product Owner',
            'Desarrollador'
        ];
        roles.forEach((rol) => {
            const opcion = document.createElement('option');
            opcion.value = rol;
            opcion.textContent = rol;
            seleccion.appendChild(opcion);
        });
        seleccion.value = persona.rol;

        const guardar = document.createElement('button');
        guardar.type = 'button';
        guardar.textContent = 'Guardar';
        
        const cancelar = document.createElement('button');
        cancelar.type = 'button';
        cancelar.textContent = 'Cancelar';
        cancelar.className = 'boton-secundario';
        cancelar.addEventListener(
            'click',
            mostrarControles
        );
       
        contenedor.replaceChildren(
            seleccion,
            guardar,
            cancelar
        );
        
        guardar.addEventListener('click', async () => {
            guardar.disabled = true;
            mensajeIntegrantes.textContent = '';
            try {
                const respuesta = await peticionJson(
                    `/proyectos/${idProyecto}/integrantes/${persona.id_usuario}`,
                    'PUT',
                    {
                        rol: seleccion.value
                    }
                );
                if (!respuesta) {
                    return;
                }
                if (!respuesta.ok) {
                    mensajeIntegrantes.textContent =
                        respuesta.resultado.mensaje ||
                        'No se pudo editar el rol.';
                    return;
                }
                avisar(
                    confirmacionInvitacion,
                    respuesta.resultado.mensaje
                );
                await cargarIntegrantes();
            } catch (error) {
                console.error(error);
                mensajeIntegrantes.textContent =
                    'Error de conexión al editar el rol.';
            } finally {
                guardar.disabled = false;
            }
        });
    });

    eliminar.addEventListener('click', async () => {
        const confirmar = window.confirm(
            `¿Eliminar a ${persona.nombre} ` +
            `(@${persona.username}) del proyecto? ` +
            `Perderá el acceso.`
        );

        if (!confirmar) {
            return;
        }

        eliminar.disabled = true;
        mensajeIntegrantes.textContent = '';
        try {
            const respuesta = await peticionJson(
                `/proyectos/${idProyecto}/integrantes/${persona.id_usuario}`,
                'DELETE'
            );
            if (!respuesta) {
                return;
            }
            if (!respuesta.ok) {
                mensajeIntegrantes.textContent =
                    respuesta.resultado.mensaje ||
                    'No se pudo eliminar al integrante.';
                return;
            }
            avisar(
                confirmacionInvitacion,
                respuesta.resultado.mensaje
            );

            await cargarIntegrantes();
        } catch (error) {
            console.error(error);
            mensajeIntegrantes.textContent =
                'Error de conexión al eliminar al integrante.';
        } finally {
            eliminar.disabled = false;
        }
    });
    return contenedor;

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
        const usuariosMostrados = new Set();
        integrantes.forEach((persona) => {
            if (usuariosMostrados.has(persona.id_usuario)) {
                return;
            }

            usuariosMostrados.add(persona.id_usuario);
            const fila = crearFilaPersona(
                persona.nombre,
                persona.username,
                persona.rol
            );

            if (
                puedeGestionarIntegrantes &&
                persona.rol !== 'Scrum Master'
            ) {
                fila.appendChild(
                    crearControlesIntegrante(persona)
                );
            }

            listaIntegrantes.appendChild(fila);
        });

        seccionPendientes.hidden =
            !puedeGestionarIntegrantes ||
            invitaciones.length === 0;
        if (puedeGestionarIntegrantes) {
            invitaciones.forEach((persona) => {
                const fila = crearFilaPersona(
                    persona.nombre,
                    persona.username,
                    persona.rol,
                    'Pendiente'
                );
                listaPendientes.appendChild(fila);
            });
        }

    } catch (error) {
        console.error(error);
        estadoIntegrantes.hidden = false;
        estadoIntegrantes.textContent =
            'No se pudieron consultar los integrantes.';
    }
};

botonInvitar.addEventListener('click', async () => {
    formInvitacion.reset();
    mensajeInvitacion.textContent = '';
    confirmacionInvitacion.hidden = true;
    formInvitacion.hidden = false;
    buscarUsuario.value = '';
    usuariosDisponibles = [];
    selectorUsuarios.replaceChildren();
    buscarUsuario.focus();
    try {
        await cargarUsuariosDisponibles();
    } catch (error) {
        console.error(error);
        mensajeInvitacion.textContent = error.message;
    }

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
        const username = selectorUsuarios.value;
        const rol = document.getElementById(
            'rol-invitado'
        ).value;
        if (!username || username.length > 50) {

            mensajeInvitacion.textContent =
                'Selecciona un usuario de la lista.';

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


// ===== JESÚS: PB-14, PB-15 Y PB-16 =====

const seccionSprintBacklog =
    document.getElementById('seccion-sprint-backlog');

const formAgregarHistoria =
    document.getElementById('form-agregar-historia');

const seleccionarSprint =
    document.getElementById('seleccionar-sprint');

const seleccionarHistoria =
    document.getElementById('seleccionar-historia');

const mensajeAgregarHistoria =
    document.getElementById('mensaje-agregar-historia');

const listaHistoriasSprint =
    document.getElementById('historias-sprint');

const confirmacionBacklog =
    document.getElementById('confirmacion-backlog');


    // ===== JESÚS: PB-17 =====

let puedeAdministrarBacklog = false;

const mensajeEstadoHistoria =
    document.getElementById('mensaje-estado-historia');

// ===== FIN VARIABLES PB-17 =====




let sprintsBacklog = [];
let desarrolladoresBacklog = [];


async function prepararSprintBacklog(sprints, puedeAdministrar) {
    puedeAdministrarBacklog = puedeAdministrar === true;

    seccionSprintBacklog.hidden = sprints.length === 0;

    if (seccionSprintBacklog.hidden) return;

    formAgregarHistoria.hidden = !puedeAdministrarBacklog;
    sprintsBacklog = sprints;
    const anterior = seleccionarSprint.value;
    seleccionarSprint.replaceChildren(
        new Option('Selecciona un Sprint', '')
    );
    sprints.forEach(sprint => {
        seleccionarSprint.add(
            new Option(
                `Sprint ${sprint.numero}`,
                sprint.id_sprint
            )
        );
    });

    seleccionarSprint.value = sprints.some(
        sprint => String(sprint.id_sprint) === anterior
    )
        ? anterior
        : String(sprints[0].id_sprint);
    await cargarSprintBacklog();
}

async function cargarSprintBacklog() {
    const idSprint = Number(seleccionarSprint.value);
    listaHistoriasSprint.replaceChildren();
    seleccionarHistoria.replaceChildren(
        new Option('Selecciona una historia', '')
    );
    mensajeAgregarHistoria.textContent = '';
    if (!idSprint) {
        listaHistoriasSprint.textContent =
            'Selecciona un Sprint.';
        return;
    }
    try {
        const [resHistorias, resIntegrantes] = await Promise.all([
            peticionJson(
                `/backlog/${idProyecto}`,
                'GET'
            ),
            peticionJson(
                `/proyectos/${idProyecto}/integrantes`,
                'GET'
            )
        ]);

        if (!resHistorias || !resIntegrantes) return;
        if (
            !resHistorias.ok ||
            !Array.isArray(resHistorias.resultado) ||
            !resIntegrantes.ok ||
            !Array.isArray(resIntegrantes.resultado.integrantes)
        ) {
            throw new Error('No se pudieron consultar los datos.');
        }

        const historias = resHistorias.resultado;
        desarrolladoresBacklog =
            resIntegrantes.resultado.integrantes.filter(
                persona => persona.rol === 'Desarrollador'
            );
        const sprint = sprintsBacklog.find(
            sprint => Number(sprint.id_sprint) === idSprint
        );

        const planificado =
            sprint?.estado === 'Planificado';

        const botonAgregar =
            formAgregarHistoria.querySelector(
                'button[type="submit"]'
            );

        botonAgregar.disabled =
        !planificado || !puedeAdministrarBacklog;


        // ===== PB-14 =====
        // Historias disponibles para agregar

        const disponibles = historias.filter(
            historia => historia.id_sprint == null
        );

        disponibles.forEach(historia => {

            seleccionarHistoria.add(
                new Option(
                    historia.titulo,
                    historia.id_historia
                )
            );
        });

        if (!disponibles.length) {

            seleccionarHistoria.add(
                new Option(
                    'No hay historias disponibles',
                    '',
                    true,
                    true
                )
            );
        }

        if (!planificado) {

            mensajeAgregarHistoria.textContent =
                'Solo puedes agregar historias a un Sprint planificado.';
        }


        // Historias pertenecientes al Sprint seleccionado
        const asignadas = historias.filter(
            historia => Number(historia.id_sprint) === idSprint
        );

        if (!asignadas.length) {

            listaHistoriasSprint.textContent =
                'Este Sprint todavía no tiene historias asignadas.';

            return;
        }


        // ===== PB-15 Y PB-16 =====
        // Mostrar las historias del Sprint

        asignadas.forEach(historia => {

            const tarjeta = document.createElement('article');

            tarjeta.className = 'tarjeta-sprint';


            // Título
            const titulo = document.createElement('h4');

            titulo.className = 'nombre-sprint';

            titulo.textContent = historia.titulo;


           // ===== JESÚS: PB-17 - MOSTRAR ESTADO =====

            const valorEstado = historia.estado_historia || 'Pendiente';

            const etiquetaEstado =
                valorEstado === 'Terminada' ? 'Terminado' : valorEstado;

            const claseEstado = {
                'Pendiente': 'pendiente',
                'En curso': 'curso',
                'Terminada': 'terminada'
            }[valorEstado] || 'pendiente';

            const estado = document.createElement('span');

            estado.className =
                `estado-historia estado-historia--${claseEstado}`;

            estado.textContent = etiquetaEstado;

            // ===== FIN MOSTRAR ESTADO =====


            // Información de la historia
            const detalle = document.createElement('p');

            detalle.className = 'objetivo-sprint';

            detalle.textContent =
                `Puntos: ${historia.puntos ?? '—'} · Prioridad: ${historia.prioridad}`;


            // Responsable actual
            const responsable = document.createElement('p');

            responsable.className = 'fechas-sprint';

            const asignado = desarrolladoresBacklog.find(
                persona =>
                    Number(persona.id_usuario) ===
                    Number(historia.id_responsable)
            );

            responsable.textContent =
                `Responsable: ${
                    asignado?.nombre ||
                    (
                        historia.id_responsable
                            ? 'Usuario no disponible'
                            : 'Sin asignar'
                    )
                }`;


            // Contenedor de acciones
            const acciones = document.createElement('div');

            acciones.className = 'acciones-formulario';


            // ===== JESÚS: PB-17 - CAMBIAR ESTADO =====

            const controlEstado = document.createElement('div');
            controlEstado.className = 'control-estado-historia';

            const etiquetaEstadoControl = document.createElement('label');
            etiquetaEstadoControl.textContent = 'Estado de la historia';
            etiquetaEstadoControl.htmlFor =
                `estado-historia-${historia.id_historia}`;

            const selectorEstado = document.createElement('select');
            selectorEstado.id = etiquetaEstadoControl.htmlFor;

            selectorEstado.add(new Option('Pendiente', 'Pendiente'));
            selectorEstado.add(new Option('En curso', 'En curso'));
            selectorEstado.add(new Option('Terminado', 'Terminada'));

            selectorEstado.value = valorEstado;

            // Guardar el estado en MySQL
            selectorEstado.addEventListener('change', async () => {

                const nuevoEstado = selectorEstado.value;

                selectorEstado.disabled = true;
                mensajeEstadoHistoria.textContent = '';
                confirmacionBacklog.hidden = true;

                try {

                    const respuesta = await peticionJson(
                        `/proyectos/${idProyecto}/sprints/${idSprint}/historias/${historia.id_historia}/estado`,
                        'PUT',
                        { estado_historia: nuevoEstado }
                    );

                    if (!respuesta) return;

                    if (!respuesta.ok) {
                        throw new Error(
                            respuesta.resultado.mensaje ||
                            'No se pudo actualizar el estado.'
                        );
                    }

                    avisar(
                        confirmacionBacklog,
                        respuesta.resultado.mensaje
                    );

                    await cargarSprintBacklog();

                } catch (error) {

                    selectorEstado.value = valorEstado;

                    mensajeEstadoHistoria.textContent =
                        error.message || 'Error al guardar el estado.';

                } finally {

                    selectorEstado.disabled = false;
                }

            });

            controlEstado.append(
                etiquetaEstadoControl,
                selectorEstado
            );

            // ===== FIN PB-17 =====


            // ===== PB-16 =====
            // Selector de desarrolladores

            const campo = document.createElement('div');

            campo.className = 'formulario';

            const etiqueta = document.createElement('label');

            etiqueta.textContent = 'Desarrollador';

            etiqueta.htmlFor =
                `responsable-historia-${historia.id_historia}`;

            const selector = document.createElement('select');

            selector.id = etiqueta.htmlFor;

            selector.add(
                new Option('Selecciona un desarrollador', '')
            );

            desarrolladoresBacklog.forEach(persona => {

                selector.add(
                    new Option(
                        persona.nombre,
                        persona.id_usuario
                    )
                );
            });

            if (historia.id_responsable != null && asignado) {

                selector.value =
                    String(historia.id_responsable);
            }

            if (!desarrolladoresBacklog.length) {

                selector.replaceChildren(
                    new Option(
                        'No hay desarrolladores aceptados',
                        ''
                    )
                );

                selector.disabled = true;
            }

            campo.append(etiqueta, selector);


            // Botón para asignar
            const botonAsignar = document.createElement('button');

            botonAsignar.type = 'button';

            botonAsignar.textContent = 'Guardar responsable';

            botonAsignar.disabled =
                !desarrolladoresBacklog.length;

            botonAsignar.addEventListener('click', async () => {

                const id_responsable = Number(selector.value);

                if (!id_responsable) {

                    mensajeAgregarHistoria.textContent =
                        'Selecciona un desarrollador.';

                    return;
                }

                await ejecutarAccionBacklog(

                    `/proyectos/${idProyecto}/sprints/${idSprint}/historias/${historia.id_historia}/responsable`,

                    'PUT',

                    { id_responsable },

                    botonAsignar
                );
            });

            acciones.append(campo, botonAsignar);


            // ===== PB-15 =====
            // Quitar una historia pendiente

            if (historia.estado_historia === 'Pendiente') {

                const botonQuitar =
                    document.createElement('button');

                botonQuitar.type = 'button';

                botonQuitar.className = 'boton-secundario';

                botonQuitar.textContent = 'Quitar del Sprint';

                botonQuitar.addEventListener(
                    'click',
                    async () => {

                        if (!confirm(
                            '¿Devolver esta historia al Product Backlog?'
                        )) {
                            return;
                        }

                        await ejecutarAccionBacklog(

                            `/proyectos/${idProyecto}/sprints/${idSprint}/historias/${historia.id_historia}`,

                            'DELETE',

                            undefined,

                            botonQuitar
                        );
                    }
                );

                acciones.append(botonQuitar);
            }


            tarjeta.append(
                titulo,
                estado,
                detalle,
                responsable,
                controlEstado
            );

            if (puedeAdministrarBacklog) {
                tarjeta.appendChild(acciones);
            }

            listaHistoriasSprint.appendChild(tarjeta);
        });

    } catch (error) {

        console.error(error);

        mensajeAgregarHistoria.textContent =
            'No fue posible cargar el Sprint Backlog.';

        listaHistoriasSprint.textContent =
            'Comprueba que el servidor y MySQL estén funcionando.';
    }
}


// Ejecutar operaciones y actualizar la pantalla
async function ejecutarAccionBacklog(
    url,
    metodo,
    cuerpo,
    boton
) {

    mensajeAgregarHistoria.textContent = '';

    confirmacionBacklog.hidden = true;

    boton.disabled = true;

    try {

        const respuesta = await peticionJson(
            url,
            metodo,
            cuerpo
        );

        if (!respuesta) return;

        if (!respuesta.ok) {

            mensajeAgregarHistoria.textContent =
                respuesta.resultado.mensaje ||
                'No se pudo guardar el cambio.';

            return;
        }

        avisar(
            confirmacionBacklog,
            respuesta.resultado.mensaje
        );

        await cargarSprintBacklog();

    } catch (error) {

        console.error(error);

        mensajeAgregarHistoria.textContent =
            'No se pudo conectar con el servidor.';

    } finally {

        boton.disabled = false;
    }
}


// ===== PB-14 =====
// Agregar historias al Sprint

formAgregarHistoria.addEventListener(
    'submit',
    async (evento) => {

        evento.preventDefault();

        const id_sprint = Number(
            seleccionarSprint.value
        );

        const id_historia = Number(
            seleccionarHistoria.value
        );

        if (!id_sprint || !id_historia) {

            mensajeAgregarHistoria.textContent =
                'Selecciona un Sprint y una historia disponible.';

            return;
        }

        const boton = formAgregarHistoria.querySelector(
            'button[type="submit"]'
        );

        await ejecutarAccionBacklog(

            `/proyectos/${idProyecto}/sprints/historias`,

            'POST',

            {
                id_sprint,
                id_historia
            },

            boton
        );
    }
);


// Cambiar de Sprint
seleccionarSprint.addEventListener('change', () => {

    confirmacionBacklog.hidden = true;

    cargarSprintBacklog();
});

// ===== FIN FUNCIONALIDADES DE JESÚS =====



window.addEventListener('pageshow', cargarProyecto);
window.addEventListener('pagehide', () => {
    nombreUsuario.textContent = '';
    avatar.textContent = 'S';
    contenido.hidden = true;
});
