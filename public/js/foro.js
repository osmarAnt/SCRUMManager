// PB-30: foro compartido por todos los integrantes del proyecto.
(() => {
    const panel = document.getElementById('panel-foro');
    if (!panel) return;
    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const direccion = `/proyectos/${idProyecto}/foro`;
    const lista = document.getElementById('foro-conversacion');
    const vacio = document.getElementById('foro-vacio');
    const estado = document.getElementById('foro-estado');
    const formulario = document.getElementById('foro-formulario');
    const contenido = document.getElementById('foro-contenido');
    const enviar = document.getElementById('foro-enviar');
    const errorFormulario = document.getElementById('foro-error');
    let conexion = null;
    let reintento;
    let paginaActiva = true;
    let bloqueado = false;
    let listo = false;
    let cargando = false;
    let recargarPendiente = false;
    let enviando = false;
    let idEnviado = null;
    let version = 0;

    const visible = () => paginaActiva && !panel.hidden && !document.hidden && !bloqueado;

    const actualizarControles = () => {
        // Se puede redactar mientras carga el historial; el envío espera a que termine.
        contenido.disabled = bloqueado;
        contenido.readOnly = enviando;
        enviar.disabled = !listo || bloqueado || enviando || !contenido.value.trim() || contenido.value.trim().length > 5000;
        enviar.textContent = enviando ? 'Enviando…' : 'Enviar';
    };

    const detener = () => {
        conexion?.close();
        conexion = null;
        clearTimeout(reintento);
    };

    const denegar = (sesion) => {
        bloqueado = true;
        version++;
        detener();
        lista.querySelectorAll('.foro-mensaje').forEach((elemento) => elemento.remove());
        vacio.hidden = true;
        formulario.reset();
        estado.dataset.tipo = 'error';
        estado.textContent = 'Ya no tienes acceso al foro de este proyecto.';
        actualizarControles();
        if (sesion) window.location.replace('/login');
    };

    const solicitar = async (metodo, datos) => {
        const respuesta = await fetch(direccion, {
            method: metodo,
            headers: { Accept: 'application/json', ...(datos ? { 'Content-Type': 'application/json' } : {}) },
            cache: 'no-store',
            body: datos ? JSON.stringify(datos) : undefined
        });
        if (respuesta.status === 401) denegar(true);
        if (respuesta.status === 403 || respuesta.status === 404) denegar(false);
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.mensaje || 'No se pudo completar la operación.');
        return resultado;
    };

    const mostrarMensajes = ({ mensajes, idUsuario }) => {
        const alFinal = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 60;
        const bajar = !listo || alFinal || mensajes.some((mensaje) => mensaje.id_mensaje === idEnviado);
        const existentes = new Map([...lista.querySelectorAll('.foro-mensaje')].map((elemento) => [elemento.dataset.id, elemento]));
        mensajes.forEach((mensaje, posicion) => {
            const clave = String(mensaje.id_mensaje);
            let elemento = existentes.get(clave);
            if (!elemento) {
                elemento = document.createElement('article');
                elemento.className = 'foro-mensaje';
                elemento.dataset.id = clave;
                const usuario = document.createElement('strong');
                usuario.className = 'foro-usuario';
                const texto = document.createElement('p');
                texto.className = 'foro-contenido';
                elemento.append(usuario, texto);
            }
            existentes.delete(clave);
            elemento.classList.toggle('foro-mensaje-propio', Number(mensaje.id_autor) === Number(idUsuario));
            const usuario = elemento.querySelector('.foro-usuario');
            const texto = elemento.querySelector('.foro-contenido');
            if (usuario.textContent !== mensaje.usuario) usuario.textContent = mensaje.usuario;
            if (texto.textContent !== mensaje.contenido) texto.textContent = mensaje.contenido;
            // Conserva los nodos existentes, la selección de texto y la posición al leer mensajes anteriores.
            const siguiente = lista.children[posicion + 1]; // El primer hijo es el estado vacío.
            if (siguiente !== elemento) lista.insertBefore(elemento, siguiente || null);
        });
        existentes.forEach((elemento) => elemento.remove());
        vacio.hidden = mensajes.length > 0;
        listo = true;
        if (mensajes.some((mensaje) => mensaje.id_mensaje === idEnviado)) idEnviado = null;
        estado.dataset.tipo = '';
        estado.textContent = 'Todos los integrantes del proyecto pueden participar.';
        actualizarControles();
        if (bajar) lista.scrollTop = lista.scrollHeight;
    };

    const cargarMensajes = async () => {
        if (!visible()) return;
        if (cargando) {
            recargarPendiente = true;
            return;
        }
        cargando = true;
        clearTimeout(reintento);
        const versionActual = version;
        lista.setAttribute('aria-busy', 'true');
        try {
            const resultado = await solicitar('GET');
            if (versionActual === version && visible()) mostrarMensajes(resultado);
        } catch (error) {
            if (versionActual === version && visible()) {
                estado.dataset.tipo = 'error';
                estado.textContent = 'No se pudo cargar el foro. Reintentando automáticamente…';
                reintento = setTimeout(cargarMensajes, 3000);
            }
        } finally {
            cargando = false;
            lista.setAttribute('aria-busy', 'false');
            if (recargarPendiente) {
                recargarPendiente = false;
                cargarMensajes();
            } else if (visible() && !window.EventSource) {
                reintento = setTimeout(cargarMensajes, 5000);
            }
        }
    };

    const conectar = () => {
        if (!visible() || conexion || !window.EventSource) return;
        conexion = new EventSource(`${direccion}/eventos`);
        conexion.addEventListener('actualizar', cargarMensajes);
        conexion.addEventListener('sesion', () => denegar(true));
        conexion.addEventListener('acceso', () => denegar(false));
        conexion.onerror = () => {
            if (!visible()) return;
            estado.textContent = 'Reconectando el foro…';
            cargarMensajes();
        };
    };

    const sincronizar = () => {
        if (!visible()) {
            detener();
            return;
        }
        conectar();
        cargarMensajes();
    };

    contenido.addEventListener('input', () => {
        errorFormulario.textContent = '';
        actualizarControles();
    });

    contenido.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' && !evento.shiftKey && !evento.isComposing) {
            evento.preventDefault();
            if (!enviar.disabled) formulario.requestSubmit();
        }
    });

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (!listo || bloqueado || enviando) return;
        const texto = contenido.value.trim();
        if (!texto || texto.length > 5000) {
            errorFormulario.textContent = 'Escribe un mensaje de entre 1 y 5000 caracteres.';
            return;
        }
        enviando = true;
        errorFormulario.textContent = '';
        actualizarControles();
        const versionActual = version;
        try {
            const resultado = await solicitar('POST', { contenido: texto });
            if (versionActual !== version || bloqueado) return;
            idEnviado = resultado.id_mensaje;
            formulario.reset();
            cargarMensajes();
        } catch (error) {
            // Conserva el texto cuando falla el envío para que el usuario pueda reintentarlo.
            if (versionActual === version && !bloqueado) errorFormulario.textContent = error.message;
        } finally {
            enviando = false;
            actualizarControles();
            if (visible() && !contenido.disabled) contenido.focus();
        }
    });

    document.addEventListener('pestana-activa', sincronizar);
    document.addEventListener('visibilitychange', sincronizar);
    window.addEventListener('pageshow', () => {
        paginaActiva = true;
        sincronizar();
    });
    window.addEventListener('pagehide', () => {
        paginaActiva = false;
        version++;
        detener();
        listo = false;
        lista.querySelectorAll('.foro-mensaje').forEach((elemento) => elemento.remove());
        vacio.hidden = true;
        formulario.reset();
        errorFormulario.textContent = '';
        estado.textContent = 'Cargando conversación…';
        actualizarControles();
    });
    actualizarControles();
})();
