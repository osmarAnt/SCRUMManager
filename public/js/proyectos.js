const lista = document.getElementById('lista-proyectos');
const plantilla = document.getElementById('plantilla-proyecto');
const estado = document.getElementById('estado-lista');
const tituloEstado = document.getElementById('titulo-estado');
const descripcionEstado = document.getElementById('descripcion-estado');
const conteo = document.getElementById('conteo-proyectos');
const nombreUsuario = document.getElementById('nombre-usuario');
const avatar = document.getElementById('avatar-usuario');
const botonActualizar = document.getElementById('actualizar-proyectos');
const botonNuevo = document.getElementById('nuevo-proyecto');
const dialogo = document.getElementById('dialogo-proyecto');
const formulario = document.getElementById('form-proyecto');
const mensajeError = document.getElementById('mensaje-error-proyecto');
const botonGuardar = formulario.querySelector('button[type="submit"]');

const mostrarEstado = (titulo, descripcion, tipo = '') => {
    lista.replaceChildren();
    lista.hidden = true;
    estado.hidden = false;
    estado.dataset.tipo = tipo;
    tituloEstado.textContent = titulo;
    descripcionEstado.textContent = descripcion;
};

const mostrarProyectos = (proyectos) => {
    lista.replaceChildren();
    conteo.textContent = `${proyectos.length} ${proyectos.length === 1 ? 'proyecto' : 'proyectos'}`;
    if (proyectos.length === 0) {
        mostrarEstado('Aún no tienes proyectos', 'Los proyectos a los que pertenezcas aparecerán aquí.');
        return;
    }
    proyectos.forEach((proyecto) => {
        const tarjeta = plantilla.content.cloneNode(true);
        tarjeta.querySelector('.tarjeta-proyecto').href = `/proyectos/${proyecto.id_proyecto}`;
        tarjeta.querySelector('.nombre-proyecto').textContent = proyecto.nombre;
        tarjeta.querySelector('.objetivo-proyecto').textContent = proyecto.objetivo || 'Este proyecto todavía no tiene un objetivo registrado.';
        tarjeta.querySelector('.rol-proyecto').textContent = proyecto.rol;
        lista.appendChild(tarjeta);
    });
    estado.hidden = true;
    lista.hidden = false;
};

const cargarProyectos = async () => {
    botonActualizar.disabled = true;
    lista.setAttribute('aria-busy', 'true');
    conteo.textContent = '—';
    mostrarEstado('Cargando tus proyectos', 'Espera un momento.');
    try {
        const respuesta = await fetch('/proyectos/datos', {
            headers: {
                Accept: 'application/json'
            },
            cache: 'no-store'
        });
        if (respuesta.status === 401) {
            window.location.replace('/login');
            return;
        }
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje ||
                'No se pudieron cargar tus proyectos.'
            );
        }
        botonNuevo.hidden = resultado.usuario.rol !== 'Scrum Master';
        const nombre = resultado.usuario.nombre;
        nombreUsuario.textContent = nombre;
        avatar.textContent = Array.from(nombre.trim())[0]?.toUpperCase() || 'S';
        mostrarProyectos(resultado.proyectos);
    } catch (error) {
        mostrarEstado('No pudimos cargar tus proyectos', 'Pulsa Actualizar para intentarlo de nuevo.', 'error');
    } finally {
        botonActualizar.disabled = false;
        lista.setAttribute('aria-busy', 'false');
    }
};

botonActualizar.addEventListener('click', cargarProyectos);

botonNuevo.addEventListener('click', () => {
    formulario.reset();
    mensajeError.textContent = '';
    dialogo.showModal();
    document.getElementById('nombre-nuevo').focus();
});

document.getElementById('cancelar-proyecto').addEventListener('click', () => dialogo.close());

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mensajeError.textContent = '';
    const nombre = document.getElementById('nombre-nuevo').value.trim();
    if (nombre.length < 3) {
        mensajeError.textContent = 'El nombre del proyecto debe tener al menos 3 caracteres.';
        return;
    }
    botonGuardar.disabled = true;
    botonGuardar.textContent = 'Guardando...';
    try {
        const respuesta = await fetch('/proyectos', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre,
                objetivo: document.getElementById('objetivo-nuevo').value
            })
        });
        if (respuesta.status === 401) {
            window.location.replace('/login');
            return;
        }
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            mensajeError.textContent = resultado.mensaje;
            return;
        }
        dialogo.close();
        await cargarProyectos();
    } catch (error) {
        console.error(error);
        mensajeError.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
    } finally {
        botonGuardar.disabled = false;
        botonGuardar.textContent = 'Guardar proyecto';
    }
});
const conteoInvitaciones = document.getElementById(
    'conteo-invitaciones'
);
const estadoInvitaciones = document.getElementById(
    'estado-invitaciones'
);
const listaInvitaciones = document.getElementById(
    'lista-invitaciones'
);
const mensajeAceptacion = document.getElementById(
    'mensaje-aceptacion'
);

const cargarInvitaciones = async () => {
    estadoInvitaciones.hidden = false;
    estadoInvitaciones.textContent =
        'Cargando invitaciones...';
    conteoInvitaciones.textContent = '—';
    listaInvitaciones.replaceChildren();
    try {
        const respuesta = await fetch(
            '/invitaciones',
            {
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            }
        );

        if (respuesta.status === 401) {

            window.location.replace('/login');

            return;

        }
        const datos = await respuesta.json();
        if (!respuesta.ok) {

            throw new Error(
                datos.mensaje ||
                'Error al cargar invitaciones.'
            );
        }
        const invitaciones = datos.invitaciones;
        conteoInvitaciones.textContent =
            `${invitaciones.length} ${invitaciones.length === 1
                ? 'pendiente'
                : 'pendientes'
            }`;
        if (invitaciones.length === 0) {
            estadoInvitaciones.textContent =
                'No tienes invitaciones pendientes.';
            return;
        }
        estadoInvitaciones.hidden = true;
        invitaciones.forEach((invitacion) => {
            const fila = document.createElement('li');
            fila.className = 'persona-item';
            const datosFila = document.createElement('div');
            datosFila.className = 'persona-datos';
            const nombreProyecto =
                document.createElement('strong');
            nombreProyecto.textContent =
                invitacion.proyecto;
            const detalle =
                document.createElement('small');
            detalle.textContent =
                `Invitado por ${invitacion.invitador} ` +
                `(@${invitacion.usuario_invitador}) · ` +
                `Rol: ${invitacion.rol}`;
            datosFila.append(
                nombreProyecto,
                detalle
            );
            const botonAceptar =
                document.createElement('button');
            botonAceptar.type = 'button';
            botonAceptar.textContent =
                'Aceptar invitación';
            botonAceptar.dataset.idInvitacion =
                String(invitacion.id_invitacion);
            fila.append(
                datosFila,
                botonAceptar
            );
            listaInvitaciones.appendChild(fila);
        });
    } catch (error) {
        console.error(error);
        estadoInvitaciones.hidden = false;
        estadoInvitaciones.textContent =
            'No se pudieron consultar las invitaciones.';
    }
};
listaInvitaciones.addEventListener(
    'click',
    async (evento) => {
        const boton = evento.target.closest(
            'button[data-id-invitacion]'
        );
        if (!boton || boton.disabled) {
            return;
        }
        boton.disabled = true;
        mensajeAceptacion.hidden = true;
        try {
            const respuesta = await fetch(
                `/invitaciones/${boton.dataset.idInvitacion}/aceptar`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json'
                    }
                }
            );
            if (respuesta.status === 401) {
                window.location.replace('/login');
                return;
            }
            const datos = await respuesta.json();
            if (!respuesta.ok) {
                estadoInvitaciones.hidden = false;
                estadoInvitaciones.textContent =
                    datos.mensaje ||
                    'No se pudo aceptar la invitación.';
                return;
            }
            mensajeAceptacion.textContent =
                datos.mensaje;
            mensajeAceptacion.hidden = false;
            await Promise.all([
                cargarProyectos(),
                cargarInvitaciones()
            ]);
        } catch (error) {
            console.error(error);
            estadoInvitaciones.hidden = false;
            estadoInvitaciones.textContent =
                'No se pudo conectar con el servidor.';
        } finally {
            boton.disabled = false;
        }
    }
);

botonActualizar.addEventListener(
    'click',
    cargarInvitaciones
);

window.addEventListener(
    'pageshow',
    cargarInvitaciones
);

window.addEventListener('pageshow', cargarProyectos);
window.addEventListener('pagehide', () => {
    nombreUsuario.textContent = '';
    avatar.textContent = 'S';
    conteo.textContent = '—';
    mostrarEstado('Cargando tus proyectos', 'Espera un momento.');
});
