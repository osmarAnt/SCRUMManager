// Apartado Reuniones (PB-42).
// El Scrum Master crea reuniones (título, descripción, fecha, modalidad y lugar o enlace);
// el resto del equipo solo las consulta. El servidor valida el rol, aquí solo se oculta el formulario.
(() => {
    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const direccion = `/proyectos/${idProyecto}/reuniones`;
    const panel = document.getElementById('panel-reuniones');
    if (!panel) {
        return;
    }

    const formulario = document.getElementById('form-reunion');
    const botonNueva = document.getElementById('nueva-reunion');
    const botonCancelar = document.getElementById('cancelar-reunion');
    const botonEnviar = formulario.querySelector('button[type="submit"]');
    const campos = {
        titulo: document.getElementById('titulo-reunion'),
        tipo: document.getElementById('tipo-reunion'),
        descripcion: document.getElementById('descripcion-reunion'),
        fecha: document.getElementById('fecha-reunion'),
        modalidad: document.getElementById('modalidad-reunion'),
        lugar: document.getElementById('lugar-reunion')
    };
    const etiquetaLugar = document.getElementById('etiqueta-lugar-reunion');
    const ayudaLugar = document.getElementById('ayuda-lugar-reunion');
    const errorFormulario = document.getElementById('error-reunion');
    const confirmacion = document.getElementById('confirmacion-reunion');
    const estado = document.getElementById('estado-reuniones');
    const grupos = {
        proximas: {
            seccion: document.getElementById('grupo-proximas'),
            lista: document.getElementById('lista-proximas'),
            conteo: document.getElementById('conteo-proximas')
        },
        pasadas: {
            seccion: document.getElementById('grupo-pasadas'),
            lista: document.getElementById('lista-pasadas'),
            conteo: document.getElementById('conteo-pasadas')
        }
    };
    let cargando = false;
    let pendiente = false;
    let enviando = false;
    // Sprint 7 · Bloque 6 (Emmanuel): el Scrum Master puede editar y eliminar reuniones.
    let puedeAdministrar = false;
    let idEditando = null;

    // 'AAAA-MM-DD HH:MM' (hora local del equipo, sin zona) -> Date local
    const aFecha = (texto) => {
        const [, anio, mes, dia, hora, minuto] = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(texto).map(Number);
        return new Date(anio, mes - 1, dia, hora, minuto);
    };

    const formatearFecha = (fecha) => {
        const texto = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        return `${texto.charAt(0).toUpperCase()}${texto.slice(1)} · ${hora}`;
    };

    const esEnLinea = (reunion) => reunion.modalidad === 'En linea';

    // Solo se convierte en enlace si es http o https (el servidor ya lo valida, esto es una segunda barrera).
    const enlaceSeguro = (texto) => {
        try {
            const url = new URL(texto);
            return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
        } catch (error) {
            return null;
        }
    };

    const crearTarjeta = (reunion, pasada) => {
        const tarjeta = document.createElement('article');
        tarjeta.className = `reunion${pasada ? ' reunion-pasada' : ''}`;

        const cabecera = document.createElement('div');
        cabecera.className = 'cabecera-reunion';
        const titulo = document.createElement('h4');
        titulo.className = 'titulo-reunion';
        titulo.textContent = reunion.titulo;
        const modalidad = document.createElement('span');
        modalidad.className = 'etiqueta-modalidad';
        modalidad.dataset.modalidad = reunion.modalidad;
        modalidad.textContent = esEnLinea(reunion) ? 'En línea' : 'Presencial';
        // Sprint 7 · Bloque 6: tipo de reunión (Sprint Planning, Daily Scrum, Review o Retrospective).
        const tipo = document.createElement('span');
        tipo.className = 'etiqueta-tipo-reunion';
        tipo.dataset.tipo = reunion.tipo || 'Otra';
        tipo.textContent = reunion.tipo || 'Otra';
        cabecera.append(titulo, tipo, modalidad);

        const fecha = aFecha(reunion.fecha_reunion);
        const cuando = document.createElement('time');
        cuando.className = 'fecha-reunion';
        cuando.dateTime = reunion.fecha_reunion.replace(' ', 'T');
        cuando.textContent = formatearFecha(fecha);

        const donde = document.createElement('p');
        donde.className = 'lugar-reunion';
        const rotulo = document.createElement('strong');
        rotulo.textContent = esEnLinea(reunion) ? 'Enlace: ' : 'Lugar: ';
        donde.append(rotulo);
        const enlace = esEnLinea(reunion) ? enlaceSeguro(reunion.lugar_enlace) : null;
        if (enlace) {
            const vinculo = document.createElement('a');
            vinculo.href = enlace;
            vinculo.target = '_blank';
            vinculo.rel = 'noopener noreferrer';
            vinculo.textContent = reunion.lugar_enlace;
            donde.append(vinculo);
        } else {
            donde.append(document.createTextNode(reunion.lugar_enlace));
        }

        const descripcion = document.createElement('p');
        descripcion.className = 'descripcion-reunion';
        descripcion.textContent = reunion.descripcion;

        const autor = document.createElement('p');
        autor.className = 'autor-reunion';
        autor.textContent = `Creada por ${reunion.autor}${reunion.username_autor ? ` · @${reunion.username_autor}` : ''}`;

        tarjeta.append(cabecera, cuando, donde, descripcion, autor);

        // Sprint 7 · Bloque 6 (TC-17-03): solo el Scrum Master ve Editar y Eliminar.
        if (puedeAdministrar) {
            const acciones = document.createElement('div');
            acciones.className = 'acciones-reunion';
            const editar = document.createElement('button');
            editar.type = 'button';
            editar.className = 'boton-secundario';
            editar.textContent = 'Editar';
            editar.addEventListener('click', () => abrirEdicion(reunion));
            const eliminar = document.createElement('button');
            eliminar.type = 'button';
            eliminar.className = 'btn-eliminar';
            eliminar.textContent = 'Eliminar';
            eliminar.addEventListener('click', () => eliminarReunion(reunion, eliminar));
            acciones.append(editar, eliminar);
            tarjeta.append(acciones);
        }
        return tarjeta;
    };

    const pintar = (reuniones) => {
        const ahora = new Date();
        // El servidor las entrega por fecha ascendente: las próximas quedan de la más cercana a la más lejana
        // y las pasadas de la más reciente a la más antigua.
        const proximas = reuniones.filter((r) => aFecha(r.fecha_reunion) >= ahora);
        const pasadas = reuniones.filter((r) => aFecha(r.fecha_reunion) < ahora).reverse();

        [['proximas', proximas, false], ['pasadas', pasadas, true]].forEach(([clave, items, pasada]) => {
            const grupo = grupos[clave];
            grupo.lista.replaceChildren(...items.map((reunion) => crearTarjeta(reunion, pasada)));
            grupo.conteo.textContent = String(items.length);
            grupo.seccion.hidden = items.length === 0;
        });

        estado.dataset.tipo = '';
        estado.textContent = reuniones.length
            ? `${reuniones.length} ${reuniones.length === 1 ? 'reunión registrada' : 'reuniones registradas'}.`
            : 'Todavía no hay reuniones programadas en este proyecto.';
    };

    const solicitar = async (metodo, datos, url = direccion) => {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: { Accept: 'application/json', ...(datos ? { 'Content-Type': 'application/json' } : {}) },
            cache: 'no-store',
            body: datos ? JSON.stringify(datos) : undefined
        });
        if (respuesta.status === 401) {
            window.location.replace('/login');
            return null;
        }
        const resultado = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) {
            throw new Error(resultado.mensaje || 'No se pudo completar la operación.');
        }
        return resultado;
    };

    const cargar = async () => {
        if (cargando) {
            pendiente = true;
            return;
        }
        cargando = true;
        try {
            const resultado = await solicitar('GET');
            if (!resultado) {
                return;
            }
            botonNueva.hidden = !resultado.puedeCrear;
            puedeAdministrar = resultado.puedeCrear === true;
            if (!resultado.puedeCrear) {
                formulario.hidden = true;
            }
            pintar(resultado.reuniones);
        } catch (error) {
            estado.dataset.tipo = 'error';
            estado.textContent = error.message || 'No se pudieron cargar las reuniones. Inténtalo de nuevo.';
        } finally {
            cargando = false;
            if (pendiente) {
                pendiente = false;
                cargar();
            }
        }
    };

    // El campo de lugar cambia según la modalidad: texto libre para presencial, enlace para en línea.
    const ajustarLugar = () => {
        const enLinea = campos.modalidad.value === 'En linea';
        etiquetaLugar.textContent = enLinea ? 'Enlace de la videollamada' : 'Lugar';
        campos.lugar.type = enLinea ? 'url' : 'text';
        campos.lugar.placeholder = enLinea ? 'https://meet.google.com/...' : 'Salón, sala o dirección';
        ayudaLugar.textContent = enLinea
            ? 'Pega el enlace de la videollamada. Debe empezar con http:// o https://.'
            : 'Indica dónde será la reunión (salón, sala, dirección).';
    };

    const limpiarFormulario = () => {
        formulario.reset();
        errorFormulario.textContent = '';
        idEditando = null;
        botonEnviar.textContent = 'Crear reunión';
        ajustarLugar();
    };

    // Sprint 7 · Bloque 6: carga la reunión en el formulario para editarla.
    function abrirEdicion(reunion) {
        limpiarFormulario();
        idEditando = reunion.id_reunion;
        campos.titulo.value = reunion.titulo;
        campos.tipo.value = reunion.tipo || 'Otra';
        campos.descripcion.value = reunion.descripcion;
        campos.fecha.value = reunion.fecha_reunion.replace(' ', 'T');
        campos.modalidad.value = reunion.modalidad;
        campos.lugar.value = reunion.lugar_enlace;
        ajustarLugar();
        botonEnviar.textContent = 'Guardar cambios';
        confirmacion.hidden = true;
        formulario.hidden = false;
        formulario.scrollIntoView({ behavior: 'smooth', block: 'start' });
        campos.titulo.focus();
    }

    async function eliminarReunion(reunion, boton) {
        if (!window.confirm(`¿Eliminar la reunión "${reunion.titulo}"? Esta acción no se puede deshacer.`)) {
            return;
        }
        boton.disabled = true;
        try {
            const resultado = await solicitar('DELETE', undefined, `${direccion}/${reunion.id_reunion}`);
            if (!resultado) return;
            confirmacion.textContent = resultado.mensaje;
            confirmacion.hidden = false;
            cargar();
        } catch (error) {
            estado.dataset.tipo = 'error';
            estado.textContent = error.message || 'No se pudo eliminar la reunión.';
            boton.disabled = false;
        }
    }

    const actualizarControles = () => {
        botonNueva.disabled = enviando;
        botonEnviar.disabled = enviando;
        botonCancelar.disabled = enviando;
        Object.values(campos).forEach((campo) => { campo.disabled = enviando; });
    };

    campos.modalidad.addEventListener('change', ajustarLugar);

    botonNueva.addEventListener('click', () => {
        limpiarFormulario();
        confirmacion.hidden = true;
        formulario.hidden = false;
        campos.titulo.focus();
    });

    botonCancelar.addEventListener('click', () => {
        limpiarFormulario();
        formulario.hidden = true;
        botonNueva.focus();
    });

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (enviando) {
            return;
        }
        const datos = {
            titulo: campos.titulo.value.trim(),
            tipo: campos.tipo.value,
            descripcion: campos.descripcion.value.trim(),
            fecha: campos.fecha.value,
            modalidad: campos.modalidad.value,
            lugar_enlace: campos.lugar.value.trim()
        };
        errorFormulario.textContent = '';
        confirmacion.hidden = true;

        const fallo = (mensaje, campo) => {
            errorFormulario.textContent = mensaje;
            campo.focus();
        };
        if (datos.titulo.length < 3 || datos.titulo.length > 150) {
            return fallo('El título debe tener entre 3 y 150 caracteres.', campos.titulo);
        }
        if (!datos.descripcion || datos.descripcion.length > 2000) {
            return fallo('La descripción debe tener entre 1 y 2000 caracteres.', campos.descripcion);
        }
        if (!datos.fecha) {
            return fallo('Elige la fecha y la hora de la reunión.', campos.fecha);
        }
        if (datos.modalidad === 'En linea') {
            if (!enlaceSeguro(datos.lugar_enlace) || /\s/.test(datos.lugar_enlace)) {
                return fallo('Escribe un enlace de videollamada válido que empiece con http:// o https://.', campos.lugar);
            }
        } else if (datos.lugar_enlace.length < 3 || datos.lugar_enlace.length > 200) {
            return fallo('Escribe el lugar de la reunión (entre 3 y 200 caracteres).', campos.lugar);
        }

        enviando = true;
        actualizarControles();
        const editando = idEditando !== null;
        botonEnviar.textContent = editando ? 'Guardando...' : 'Creando...';
        try {
            const resultado = editando
                ? await solicitar('PUT', datos, `${direccion}/${idEditando}`)
                : await solicitar('POST', datos);
            if (!resultado) {
                return;
            }
            limpiarFormulario();
            formulario.hidden = true;
            confirmacion.textContent = resultado.mensaje;
            confirmacion.hidden = false;
            cargar();
        } catch (error) {
            errorFormulario.textContent = error.message || 'No se pudo guardar la reunión. Inténtalo de nuevo.';
        } finally {
            enviando = false;
            botonEnviar.textContent = idEditando !== null ? 'Guardar cambios' : 'Crear reunión';
            actualizarControles();
        }
    });

    // Se actualiza cada vez que se abre la pestaña, para ver las reuniones que creó el Scrum Master.
    document.addEventListener('pestana-activa', (evento) => {
        if (evento.detail.id === 'reuniones') {
            cargar();
        }
    });

    window.addEventListener('pageshow', () => {
        ajustarLugar();
        if (!panel.hidden) {
            cargar();
        }
    });
})();
