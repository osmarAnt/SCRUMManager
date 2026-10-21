(() => {
    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const direccion = `/proyectos/${idProyecto}/mensajes`;
    const lista = document.getElementById('lista-mensajes-po');
    const plantilla = document.getElementById('plantilla-mensaje-po');
    const estado = document.getElementById('estado-mensajes-po');
    const formulario = document.getElementById('form-mensaje-po');
    const titulo = document.getElementById('titulo-mensaje-po');
    const contenido = document.getElementById('contenido-mensaje-po');
    const errorFormulario = document.getElementById('error-mensaje-po');
    const confirmacion = document.getElementById('confirmacion-mensaje-po');
    const botonNuevo = document.getElementById('nuevo-mensaje-po');
    const botonCancelar = document.getElementById('cancelar-mensaje-po');
    const botonEnviar = formulario.querySelector('button[type="submit"]');
    const lecturasConfirmadas = new Set();
    const lecturasPendientes = new Set();
    let mensajes = [];
    let conexion;
    let reintento;
    let cargando = false;
    let recargarPendiente = false;
    let enviando = false;
    let activo = false;
    let bloqueado = false;
    let version = 0;

    const detener = () => {
        conexion?.close();
        conexion = null;
        clearTimeout(reintento);
    };

    const denegar = (sesion) => {
        bloqueado = true;
        detener();
        lista.replaceChildren();
        formulario.reset();
        formulario.hidden = true;
        botonNuevo.hidden = true;
        confirmacion.hidden = true;
        estado.dataset.tipo = 'error';
        estado.textContent = 'Ya no tienes acceso a los mensajes de este proyecto.';
        if (sesion) {
            window.location.replace('/login');
        }
    };

    const actualizarControles = () => {
        botonNuevo.disabled = enviando;
        botonEnviar.disabled = enviando;
        botonCancelar.disabled = enviando;
        titulo.readOnly = enviando;
        contenido.readOnly = enviando;
    };

    const solicitar = async (metodo, datos, ruta = direccion) => {
        const respuesta = await fetch(ruta, {
            method: metodo,
            headers: { Accept: 'application/json', ...(datos ? { 'Content-Type': 'application/json' } : {}) },
            cache: 'no-store',
            body: datos ? JSON.stringify(datos) : undefined
        });
        if (respuesta.status === 401) {
            denegar(true);
            return null;
        }
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            if (respuesta.status === 403 || respuesta.status === 404) {
                denegar(false);
            }
            throw new Error(resultado.mensaje || 'No se pudo completar la operación.');
        }
        return resultado;
    };

    const mostrarMensajes = () => {
        const tarjetas = new Map([...lista.children].map(tarjeta => [Number(tarjeta.dataset.id), tarjeta]));
        mensajes.forEach((mensaje, posicion) => {
            let tarjeta = tarjetas.get(mensaje.id_mensaje);
            if (!tarjeta) {
                tarjeta = plantilla.content.firstElementChild.cloneNode(true);
                tarjeta.dataset.id = mensaje.id_mensaje;
                tarjeta.querySelector('.marcar-leido-po').addEventListener('click', () => marcarLeido(mensaje.id_mensaje));
            }
            tarjetas.delete(mensaje.id_mensaje);
            const leido = mensaje.leido || lecturasConfirmadas.has(mensaje.id_mensaje);
            const textos = {
                '.titulo-mensaje-po': mensaje.titulo,
                '.contenido-mensaje-po': mensaje.contenido,
                '.autor-mensaje-po': mensaje.username_autor ? `${mensaje.autor} · @${mensaje.username_autor}` : mensaje.autor,
                '.estado-lectura-po': leido ? 'Leído' : 'Sin leer',
                '.marcar-leido-po span': leido ? 'Leído' : 'Marcar como leído'
            };
            Object.entries(textos).forEach(([selector, texto]) => {
                const elemento = tarjeta.querySelector(selector);
                if (elemento.textContent !== texto) {
                    elemento.textContent = texto;
                }
            });
            tarjeta.classList.toggle('mensaje-po-leido', leido);
            const boton = tarjeta.querySelector('.marcar-leido-po');
            boton.disabled = leido || lecturasPendientes.has(mensaje.id_mensaje);
            boton.title = `${leido ? 'Mensaje leído' : 'Marcar como leído'}: ${mensaje.titulo}`;
            boton.setAttribute('aria-label', boton.title);
            const fecha = new Date(mensaje.fecha_creacion);
            const etiqueta = tarjeta.querySelector('.fecha-mensaje-po');
            if (!Number.isNaN(fecha.getTime())) {
                etiqueta.dateTime = fecha.toISOString();
                etiqueta.textContent = fecha.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
            }
            if (lista.children[posicion] !== tarjeta) {
                lista.insertBefore(tarjeta, lista.children[posicion] || null);
            }
        });
        tarjetas.forEach(tarjeta => tarjeta.remove());
        const sinLeer = mensajes.filter(mensaje => !mensaje.leido && !lecturasConfirmadas.has(mensaje.id_mensaje)).length;
        estado.dataset.tipo = '';
        estado.textContent = mensajes.length ? `${mensajes.length} ${mensajes.length === 1 ? 'mensaje publicado' : 'mensajes publicados'} · ${sinLeer} sin leer` : 'Todavía no hay mensajes del Product Owner.';
    };

    const cargarMensajes = async () => {
        if (!activo || bloqueado || document.hidden) {
            return;
        }
        if (cargando) {
            recargarPendiente = true;
            return;
        }
        const versionActual = version;
        cargando = true;
        clearTimeout(reintento);
        lista.setAttribute('aria-busy', 'true');
        try {
            const resultado = await solicitar('GET');
            if (!resultado || versionActual !== version || bloqueado || !activo) {
                return;
            }
            mensajes = resultado.mensajes;
            botonNuevo.hidden = !resultado.puedePublicar;
            if (!resultado.puedePublicar) {
                formulario.hidden = true;
            }
            mostrarMensajes();
        } catch (error) {
            if (versionActual === version && activo && !bloqueado) {
                estado.dataset.tipo = 'error';
                estado.textContent = 'No se pudieron cargar los mensajes. Reintentando automáticamente...';
                reintento = setTimeout(cargarMensajes, 3000);
            }
        } finally {
            cargando = false;
            lista.setAttribute('aria-busy', 'false');
            if (recargarPendiente) {
                recargarPendiente = false;
                cargarMensajes();
            }
        }
    };

    const marcarLeido = async (idMensaje) => {
        if (lecturasPendientes.has(idMensaje)) {
            return;
        }
        lecturasPendientes.add(idMensaje);
        mostrarMensajes();
        try {
            const resultado = await solicitar('PUT', undefined, `${direccion}/${idMensaje}/leido`);
            if (resultado && activo && !bloqueado) {
                lecturasConfirmadas.add(idMensaje);
                mostrarMensajes();
            }
        } catch (error) {
            estado.dataset.tipo = 'error';
            estado.textContent = error.message || 'No se pudo marcar el mensaje como leído. Inténtalo de nuevo.';
        } finally {
            lecturasPendientes.delete(idMensaje);
            if (!bloqueado && activo) {
                const boton = lista.querySelector(`[data-id="${idMensaje}"] .marcar-leido-po`);
                if (boton) {
                    boton.disabled = lecturasConfirmadas.has(idMensaje) || mensajes.some(mensaje => mensaje.id_mensaje === idMensaje && mensaje.leido);
                }
            }
        }
    };

    const conectar = () => {
        if (!activo || bloqueado || document.hidden || conexion) {
            return;
        }
        conexion = new EventSource(`${direccion}/eventos`);
        conexion.addEventListener('actualizar', cargarMensajes);
        conexion.addEventListener('sesion', () => denegar(true));
        conexion.addEventListener('acceso', () => denegar(false));
        conexion.onerror = () => {
            if (activo && !bloqueado && !document.hidden) {
                estado.textContent = 'Reconectando los mensajes...';
                cargarMensajes();
            }
        };
    };

    botonNuevo.addEventListener('click', () => {
        formulario.reset();
        errorFormulario.textContent = '';
        confirmacion.hidden = true;
        formulario.hidden = false;
        titulo.focus();
    });

    botonCancelar.addEventListener('click', () => {
        formulario.reset();
        errorFormulario.textContent = '';
        formulario.hidden = true;
        botonNuevo.focus();
    });

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (enviando) {
            return;
        }
        const datos = { titulo: titulo.value.trim(), contenido: contenido.value.trim() };
        errorFormulario.textContent = '';
        confirmacion.hidden = true;
        if (datos.titulo.length < 3 || datos.titulo.length > 150) {
            errorFormulario.textContent = 'El título debe tener entre 3 y 150 caracteres.';
            titulo.focus();
            return;
        }
        if (!datos.contenido || datos.contenido.length > 5000) {
            errorFormulario.textContent = 'El contenido debe tener entre 1 y 5000 caracteres.';
            contenido.focus();
            return;
        }
        enviando = true;
        actualizarControles();
        botonEnviar.textContent = 'Publicando...';
        try {
            const resultado = await solicitar('POST', datos);
            if (!resultado || !activo || bloqueado) {
                return;
            }
            formulario.reset();
            formulario.hidden = true;
            confirmacion.textContent = resultado.mensaje;
            confirmacion.hidden = false;
            cargarMensajes();
        } catch (error) {
            errorFormulario.textContent = error.message || 'No se pudo publicar el mensaje. Inténtalo de nuevo.';
        } finally {
            enviando = false;
            botonEnviar.textContent = 'Publicar mensaje';
            actualizarControles();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            detener();
        } else {
            conectar();
            cargarMensajes();
        }
    });

    window.addEventListener('pageshow', () => {
        activo = true;
        conectar();
        cargarMensajes();
    });

    window.addEventListener('pagehide', () => {
        activo = false;
        version++;
        detener();
        mensajes = [];
        lecturasConfirmadas.clear();
        lista.replaceChildren();
        formulario.reset();
        formulario.hidden = true;
        botonNuevo.hidden = true;
        confirmacion.hidden = true;
        errorFormulario.textContent = '';
        estado.textContent = 'Cargando mensajes...';
    });
})();
