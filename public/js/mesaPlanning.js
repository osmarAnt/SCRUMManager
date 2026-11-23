(() => {
    const porId = (id) => document.getElementById('planning-' + id);
    const panel = document.getElementById('panel-planning');
    if (!panel) return;
    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const base = `/proyectos/${idProyecto}/planning`;
    const selector = porId('historia');
    const mazo = porId('mazo');
    const tapete = porId('mesa');
    const numeros = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
    const historias = new Map();
    let mesa = null;
    let historiaElegida = null;
    let seleccionados = new Set();
    let claveIntegrantes = '';
    let claveAsientos = '';
    let ultimaLista = 0;
    let lectura = null;
    let temporizador = null;
    let enviando = false;
    let paginaActiva = true;
    let arrastre = null;
    let omitirClick = null;

    const visible = () => paginaActiva && !panel.hidden && !document.hidden;
    const rondaAbierta = (ronda) => ['votacion', 'revelada'].includes(ronda?.fase);
    const puntosTexto = (n) => n === 1 ? '1 punto' : `${n} puntos`;
    const crear = (etiqueta, texto, clase) => {
        const elemento = document.createElement(etiqueta);
        if (texto !== undefined) elemento.textContent = texto;
        if (clase) elemento.className = clase;
        return elemento;
    };
    const escribir = (elemento, texto) => {
        if (elemento.textContent !== texto) elemento.textContent = texto;
    };
    async function solicitar(ruta, opciones = {}) {
        const respuesta = await fetch(base + ruta, {
            cache: 'no-store',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            ...opciones
        });
        if (respuesta.status === 401) {
            window.location.replace('/login');
            throw new Error('Inicia sesión para continuar.');
        }
        if (!respuesta.ok) {
            const datos = await respuesta.json().catch(() => ({}));
            const error = new Error(respuesta.status >= 500 ? 'La mesa de votación no está disponible por el momento.' : datos.mensaje || 'No se pudo consultar la mesa.');
            error.estado = respuesta.status;
            throw error;
        }
        return respuesta.status === 204 ? null : respuesta.json();
    }

    function aplicarHistorias(datos) {
        historias.clear();
        const grupos = [...datos.grupos].sort((a, b) => Number(b.id_sprint === null) - Number(a.id_sprint === null));
        const opciones = grupos.map((grupo) => {
            const opcionGrupo = document.createElement('optgroup');
            opcionGrupo.label = grupo.id_sprint === null ? 'Sin sprint' : `Sprint ${grupo.numero}`;
            for (const historia of grupo.historias) {
                historia.sprint = opcionGrupo.label;
                historia.criterios = historia.criterios || [];
                historias.set(historia.id_historia, historia);
                const opcion = crear('option', historia.titulo);
                opcion.value = historia.id_historia;
                opcionGrupo.append(opcion);
            }
            return opcionGrupo;
        });
        selector.replaceChildren(...opciones);
        if (!historias.has(historiaElegida)) {
            const primera = [...historias.values()].find((historia) => historia.puntos === null) || historias.values().next().value;
            historiaElegida = primera?.id_historia ?? null;
        }
        ultimaLista = Date.now();
    }

    function pintarFicha(historia) {
        selector.value = String(historia.id_historia);
        selector.disabled = enviando || rondaAbierta(mesa.ronda);
        escribir(porId('descripcion'), historia.descripcion);
        escribir(porId('sprint'), historia.sprint);
        escribir(porId('responsable'), historia.responsable || 'Sin asignar');
        escribir(porId('puntos'), historia.puntos === null ? 'Sin estimar' : puntosTexto(historia.puntos));
        escribir(porId('horas-historia'), historia.horas_estimadas === null ? 'Sin estimar' : `${numeros.format(historia.horas_estimadas)} h`);
    }

    function pintarInvitados() {
        const nombres = mesa.desarrolladores;
        const clave = JSON.stringify(nombres);
        if (clave === claveIntegrantes) return;
        const anteriores = new Set([...porId('invitados').querySelectorAll('input')].map((campo) => Number(campo.value)));
        claveIntegrantes = clave;
        seleccionados = new Set(nombres.filter((persona) =>
            !anteriores.has(persona.id_usuario) || seleccionados.has(persona.id_usuario)).map((persona) => persona.id_usuario));
        porId('invitados').replaceChildren(...nombres.map((persona) => {
            const etiqueta = crear('label');
            const campo = crear('input');
            campo.type = 'checkbox';
            campo.value = persona.id_usuario;
            campo.checked = seleccionados.has(persona.id_usuario);
            etiqueta.title = persona.username;
            etiqueta.append(campo, crear('span', persona.nombre));
            return etiqueta;
        }));
    }

    function pintarAsientos(personas, ronda) {
        const publicas = ['revelada', 'cerrada'].includes(ronda?.fase);
        const clave = JSON.stringify([personas, publicas, ronda?.fase]);
        if (clave === claveAsientos) return;
        claveAsientos = clave;
        porId('asientos').replaceChildren(...personas.map((persona) => {
            const asiento = crear('li', undefined, 'planning-asiento');
            const mini = crear('span', publicas ? persona.carta : '', 'planning-mini');
            mini.dataset.lado = publicas ? 'cara' : persona.listo ? 'dorso' : 'vacio';
            mini.setAttribute('aria-hidden', 'true');
            const nombre = persona.id_usuario === mesa.id_usuario ? `${persona.nombre} (tú)` : persona.nombre;
            asiento.title = persona.username;
            const estado = publicas ? (persona.carta === '?' ? 'Pide aclaración' : puntosTexto(Number(persona.carta)))
                : persona.listo ? 'Carta jugada' : ronda ? 'Por votar' : 'Participante';
            asiento.append(mini, crear('strong', nombre), crear('small', estado));
            return asiento;
        }));
    }

    function pintarMazo(puedeVotar, cartaPropia) {
        const clave = mesa.mazo.join(',');
        if (mazo.dataset.clave !== clave) {
            mazo.dataset.clave = clave;
            mazo.replaceChildren(...mesa.mazo.map((valor) => {
                const boton = crear('button', valor, 'planning-carta');
                boton.type = 'button';
                boton.dataset.carta = valor;
                boton.setAttribute('aria-label', valor === '?' ? 'Necesito una aclaración' : `Jugar ${puntosTexto(Number(valor))}`);
                return boton;
            }));
        }
        for (const carta of mazo.children) {
            carta.disabled = !puedeVotar;
            carta.setAttribute('aria-pressed', String(puedeVotar && carta.dataset.carta === cartaPropia));
        }
        mazo.setAttribute('aria-busy', String(puedeVotar && enviando));
        escribir(porId('titulo-mazo'), puedeVotar ? 'Tus cartas' : 'Mazo de cartas');
        if (arrastre && (!puedeVotar || arrastre.ronda !== mesa.ronda?.id_ronda)) terminarArrastre();
    }

    function estadoDelVoto(ronda, voto, modera) {
        if (!rondaAbierta(ronda)) {
            return modera && !mesa.desarrolladores.length ? 'Sin desarrolladores en el proyecto.' : '';
        }
        if (ronda.fase === 'votacion') {
            if (voto?.listo) return `Tu carta · ${voto.carta}`;
            return !voto && !modera ? 'Observador de la ronda' : '';
        }
        if (ronda.consenso !== null) return `Consenso · ${puntosTexto(ronda.consenso)}`;
        const cartas = ronda.participantes.map((persona) => persona.carta);
        if (!cartas.length) return 'Sin votos disponibles.';
        if (cartas.includes('?')) return 'Aclaración pendiente.';
        return `Sin consenso · ${Math.min(...cartas)} a ${Math.max(...cartas)} puntos`;
    }

    function pintar() {
        if (!mesa) return;
        if (rondaAbierta(mesa.ronda)) historiaElegida = mesa.ronda.id_historia;
        const historia = historias.get(historiaElegida);
        porId('contenido').hidden = !historia;
        if (!historia) return;
        pintarFicha(historia);
        pintarInvitados();
        const ronda = mesa.ronda?.id_historia === historiaElegida ? mesa.ronda : null;
        const abierta = rondaAbierta(ronda);
        const modera = mesa.rol === 'Scrum Master';
        const votando = ronda?.fase === 'votacion';
        const revelada = ronda?.fase === 'revelada';
        const cerrada = ronda?.fase === 'cerrada';
        const voto = mesa.rol === 'Desarrollador' && ronda?.participantes.find((persona) => persona.id_usuario === mesa.id_usuario);
        porId('presentes').hidden = !modera || abierta;
        porId('presentes').disabled = enviando;
        const enMesa = abierta || cerrada ? ronda.participantes
            : modera ? mesa.desarrolladores.filter((persona) => seleccionados.has(persona.id_usuario)) : [];
        const jugadas = enMesa.filter((persona) => persona.listo).length;
        pintarAsientos(enMesa, abierta || cerrada ? ronda : null);
        pintarMazo(Boolean(votando && voto), voto?.carta);
        const fases = { votacion: 'Votación privada', revelada: 'Cartas reveladas', cerrada: 'Acuerdo guardado', cancelada: 'Votación cancelada' };
        escribir(porId('fase'), ronda ? `Ronda ${ronda.numero} · ${fases[ronda.fase]}` : 'Sin ronda abierta');
        const conteo = votando ? `Votos recibidos · ${jugadas} de ${enMesa.length}` : revelada ? 'Cartas del equipo'
            : cerrada ? `Acuerdo · ${puntosTexto(ronda.puntos_acordados)}` : 'En espera de la votación';
        escribir(porId('conteo'), conteo);
        escribir(porId('turno'), estadoDelVoto(ronda, voto, modera));
        mostrarAccion('iniciar', modera && !abierta, seleccionados.size > 0);
        mostrarAccion('revelar', modera && votando, enMesa.length > 0 && jugadas === enMesa.length);
        mostrarAccion('repetir', modera && revelada);
        mostrarAccion('guardar', modera && revelada && ronda.consenso !== null);
        if (revelada && ronda.consenso !== null) escribir(porId('guardar'), `Guardar ${puntosTexto(ronda.consenso)}`);
        mostrarAccion('cancelar', modera && abierta);
    }

    function mostrarAccion(id, mostrar, habilitada = true) {
        const boton = porId(id);
        boton.hidden = !mostrar;
        boton.disabled = !habilitada || enviando;
    }

    function detenerConsulta() {
        clearTimeout(temporizador);
        lectura?.abort();
        lectura = null;
    }

    async function cargar(incluirHistorias = false) {
        if (!visible() || enviando) return;
        detenerConsulta();
        const control = new AbortController();
        lectura = control;
        const opciones = { signal: control.signal };
        try {
            const refrescar = incluirHistorias || Date.now() - ultimaLista > 20000;
            const [nueva, catalogo] = await Promise.all([
                solicitar('/mesa', opciones),
                refrescar ? solicitar('', opciones) : null
            ]);
            if (lectura !== control) return;
            const ronda = nueva.ronda;
            const cambioPuntos = ronda?.fase === 'cerrada' &&
                (mesa?.ronda?.id_ronda !== ronda.id_ronda || mesa.ronda.fase !== 'cerrada');
            const requiereLista = (ronda && !historias.has(ronda.id_historia)) || cambioPuntos || mesa?.rol !== nueva.rol;
            const datos = catalogo || (requiereLista ? await solicitar('', opciones) : null);
            if (lectura !== control || !visible()) return;
            if (datos) aplicarHistorias(datos);
            const actualizarTablas = cambioPuntos && mesa !== null;
            mesa = nueva;
            pintar();
            if (actualizarTablas) document.dispatchEvent(new CustomEvent('planning-actualizado'));
            porId('estado-mesa').dataset.tipo = '';
            porId('estado-mesa').hidden = historias.size > 0;
            if (!historias.size) escribir(porId('estado-mesa'), 'Todavía no hay historias en el proyecto.');
            porId('ir-backlog').hidden = historias.size > 0;
            porId('reintentar-mesa').hidden = true;
        } catch (error) {
            if (lectura !== control || error.name === 'AbortError') return;
            porId('estado-mesa').dataset.tipo = 'error';
            porId('estado-mesa').hidden = false;
            escribir(porId('estado-mesa'), error.estado ? error.message : 'No se pudo conectar con la mesa.');
            porId('reintentar-mesa').hidden = false;
            porId('historias-sprint').open = true;
            if (error.estado === 403 || error.estado === 404) {
                mesa = null;
                porId('contenido').hidden = true;
            }
        } finally {
            if (lectura === control) {
                lectura = null;
                if (visible()) temporizador = setTimeout(cargar, 2800);
            }
        }
    }

    async function jugar(accion, extra = {}) {
        if (!mesa || enviando || !visible()) return;
        const idRonda = mesa.ronda?.id_ronda ?? null;
        if (accion === 'cancelar' && !window.confirm('¿Cancelar la votación abierta y liberar la mesa?')) return;
        detenerConsulta();
        enviando = true;
        escribir(porId('error'), '');
        pintar();
        let recargarLista = false;
        try {
            const acuerdo = accion === 'guardar';
            await solicitar(acuerdo ? '/mesa/acuerdo' : '/mesa', {
                method: acuerdo ? 'POST' : 'PATCH',
                body: JSON.stringify({ accion, id_ronda: idRonda, ...extra })
            });
            recargarLista = acuerdo;
        } catch (error) {
            escribir(porId('error'), error.estado ? error.message : 'No se pudo conectar con la mesa.');
            recargarLista = true;
        } finally {
            enviando = false;
            await cargar(recargarLista);
            if (visible()) pintar();
        }
    }

    function terminarArrastre() {
        if (!arrastre) return;
        const { boton, puntero, copia } = arrastre;
        arrastre = null;
        copia?.remove();
        tapete.classList.remove('sobre-mesa');
        if (boton.hasPointerCapture(puntero)) boton.releasePointerCapture(puntero);
    }

    function sobreMesa(evento) {
        return tapete.contains(document.elementFromPoint(evento.clientX, evento.clientY));
    }

    mazo.addEventListener('pointerdown', (evento) => {
        const boton = evento.target.closest('button[data-carta]');
        if (!boton || boton.disabled || enviando || !evento.isPrimary || evento.button !== 0) return;
        terminarArrastre();
        omitirClick = null;
        arrastre = { boton, puntero: evento.pointerId, x: evento.clientX, y: evento.clientY, ronda: mesa.ronda.id_ronda };
        boton.setPointerCapture(evento.pointerId);
    });

    mazo.addEventListener('pointermove', (evento) => {
        if (!arrastre || arrastre.puntero !== evento.pointerId) return;
        if (!arrastre.copia) {
            if (Math.hypot(evento.clientX - arrastre.x, evento.clientY - arrastre.y) < 7) return;
            const { boton } = arrastre;
            const copia = crear('span', boton.dataset.carta, 'planning-carta planning-carta-fantasma');
            copia.dataset.carta = boton.dataset.carta;
            copia.setAttribute('aria-hidden', 'true');
            copia.style.width = boton.offsetWidth + 'px';
            copia.style.height = boton.offsetHeight + 'px';
            document.body.append(copia);
            arrastre.copia = copia;
        }
        arrastre.copia.style.left = evento.clientX + 'px';
        arrastre.copia.style.top = evento.clientY + 'px';
        tapete.classList.toggle('sobre-mesa', sobreMesa(evento));
    });

    mazo.addEventListener('pointerup', (evento) => {
        if (!arrastre || arrastre.puntero !== evento.pointerId) return;
        const { boton, copia, ronda } = arrastre;
        const soltar = Boolean(copia) && sobreMesa(evento) && ronda === mesa.ronda?.id_ronda;
        if (copia) omitirClick = boton;
        terminarArrastre();
        if (soltar) jugar('votar', { carta: boton.dataset.carta });
    });
    mazo.addEventListener('pointercancel', terminarArrastre);
    mazo.addEventListener('lostpointercapture', terminarArrastre);
    mazo.addEventListener('click', (evento) => {
        const boton = evento.target.closest('button[data-carta]');
        if (boton && !boton.disabled && !(evento.detail && omitirClick === boton)) {
            jugar('votar', { carta: boton.dataset.carta });
        }
        omitirClick = null;
    });

    selector.addEventListener('change', () => {
        historiaElegida = Number(selector.value);
        escribir(porId('error'), '');
        pintar();
    });
    porId('invitados').addEventListener('change', (evento) => {
        const id = Number(evento.target.value);
        if (evento.target.checked) seleccionados.add(id);
        else seleccionados.delete(id);
        pintar();
    });
    porId('iniciar').addEventListener('click', () => jugar('iniciar', {
        id_historia: historiaElegida, participantes: [...seleccionados]
    }));
    for (const accion of ['revelar', 'guardar', 'repetir', 'cancelar']) {
        porId(accion).addEventListener('click', () => jugar(accion));
    }
    document.addEventListener('horas-estimadas-actualizadas', ({ detail }) => {
        const historia = historias.get(detail.id_historia);
        if (historia) historia.horas_estimadas = detail.horas_estimadas;
        if (mesa && historia && historiaElegida === historia.id_historia) pintarFicha(historia);
    });
    const sincronizar = () => {
        if (visible()) cargar(true);
        else {
            detenerConsulta();
            terminarArrastre();
        }
    };
    porId('historias-sprint').addEventListener('toggle', (evento) => {
        if (evento.currentTarget.open && visible()) document.dispatchEvent(new CustomEvent('planning-actualizado'));
    });
    porId('reintentar-mesa').addEventListener('click', () => cargar(true));
    document.addEventListener('pestana-activa', sincronizar);
    document.addEventListener('visibilitychange', sincronizar);
    window.addEventListener('focus', sincronizar);
    window.addEventListener('pagehide', () => { paginaActiva = false; sincronizar(); });
    window.addEventListener('pageshow', () => { paginaActiva = true; sincronizar(); });
    sincronizar();
})();
