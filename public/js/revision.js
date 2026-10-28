// PB-19: revisar entregable (criterios, archivos y responsable)
// PB-20: aprobar o rechazar con observaciones
(() => {
    'use strict';

    const seccion = document.getElementById('seccion-revision');
    if (!seccion) {
        return;
    }

    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const MINIMO_RECHAZO = 5;

    const porId = (id) => document.getElementById(id);
    const elementos = {
        confirmacion: porId('confirmacion-revision'),
        error: porId('error-revision'),
        estado: porId('estado-revision'),
        tituloPorRevisar: porId('titulo-por-revisar'),
        listaPorRevisar: porId('lista-por-revisar'),
        tituloRevisadas: porId('titulo-revisadas'),
        listaRevisadas: porId('lista-revisadas'),
        panel: porId('panel-revision'),
        tituloPanel: porId('titulo-panel-revision'),
        estadoPanel: porId('estado-panel-revision'),
        responsable: porId('revision-responsable'),
        sprint: porId('revision-sprint'),
        puntos: porId('revision-puntos'),
        prioridad: porId('revision-prioridad'),
        descripcion: porId('revision-descripcion'),
        resumenCriterios: porId('revision-resumen-criterios'),
        criterios: porId('revision-criterios'),
        evidencias: porId('revision-evidencias'),
        historialBloque: porId('revision-historial-bloque'),
        historial: porId('revision-historial'),
        formulario: porId('form-decision'),
        observaciones: porId('observaciones-revision'),
        contador: porId('contador-observaciones'),
        errorDecision: porId('error-decision'),
        guardar: porId('guardar-decision'),
        yaDecidida: porId('revision-ya-decidida')
    };

    // Etiqueta y clase de color de cada estado del flujo de revisión
    const ESTADOS = {
        'En revision': { etiqueta: 'En revisión', clase: 'revision' },
        'Aprobada': { etiqueta: 'Aprobada', clase: 'aprobada' },
        'Rechazada': { etiqueta: 'Rechazada', clase: 'rechazada' }
    };

    let historiaAbierta = null;

    const crear = (etiqueta, { clase, texto } = {}, hijos = []) => {
        const nodo = document.createElement(etiqueta);
        if (clase) nodo.className = clase;
        if (texto !== undefined) nodo.textContent = texto;
        nodo.append(...hijos);
        return nodo;
    };

    const pedir = async (url, metodo = 'GET', cuerpo) => {
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

    // 'AAAA-MM-DD HH:mm' -> '23 oct 2026, 14:30' (sin zonas horarias: el servidor ya da la hora local)
    const formatearFechaHora = (texto) => {
        const coincidencia = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(texto || '');
        if (!coincidencia) return '';
        const [, anio, mes, dia, hora, minuto] = coincidencia.map(Number);
        return new Date(Date.UTC(anio, mes - 1, dia, hora, minuto)).toLocaleString('es-MX', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
        });
    };

    const formatearTamano = (bytes) => {
        if (bytes === null || bytes === undefined) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const insigniaEstado = (estado) => {
        const datos = ESTADOS[estado] || { etiqueta: estado, clase: 'pendiente' };
        return crear('span', {
            clase: `estado-historia estado-historia--${datos.clase}`,
            texto: datos.etiqueta
        });
    };

    const avisarError = (texto) => {
        elementos.error.textContent = texto || '';
    };

    const avisarConfirmacion = (texto) => {
        elementos.confirmacion.textContent = texto;
        elementos.confirmacion.hidden = !texto;
    };

    // ---------- Lista de historias en revisión ----------

    const tarjetaHistoria = (historia) => {
        const pendiente = historia.estado_historia === 'En revision';
        const boton = crear('button', {
            clase: pendiente ? '' : 'boton-secundario',
            texto: pendiente ? 'Revisar entregable' : 'Ver revisión'
        });
        boton.type = 'button';
        boton.addEventListener('click', () => abrirRevision(historia.id_historia));

        const resumen = [
            historia.sprint_numero ? `Sprint ${historia.sprint_numero}` : 'Sin Sprint',
            `Puntos: ${historia.puntos ?? '—'}`,
            `Prioridad: ${historia.prioridad}`
        ].join(' · ');
        const avance = `Criterios cumplidos: ${historia.criterios_cumplidos} de ${historia.total_criterios} · ` +
            `Evidencias: ${historia.total_evidencias}`;

        const tarjeta = crear('article', { clase: 'tarjeta-sprint tarjeta-revision' }, [
            crear('div', { clase: 'cabecera-sprint' }, [
                crear('h4', { clase: 'nombre-sprint', texto: historia.titulo }),
                insigniaEstado(historia.estado_historia)
            ]),
            crear('p', { clase: 'meta-revision', texto: resumen }),
            crear('p', { clase: 'meta-revision', texto: `Responsable: ${historia.responsable || 'Sin asignar'}` }),
            crear('p', { clase: 'meta-revision', texto: avance })
        ]);
        if (!pendiente && historia.ultima_decision) {
            tarjeta.append(crear('p', {
                clase: 'meta-revision',
                texto: `Decisión: ${historia.ultima_decision} · ${formatearFechaHora(historia.fecha_ultima_revision)}`
            }));
        }
        tarjeta.append(crear('div', { clase: 'acciones-formulario' }, [boton]));
        return tarjeta;
    };

    const cargarLista = async () => {
        avisarError('');
        elementos.estado.textContent = 'Cargando entregables...';
        elementos.estado.hidden = false;
        try {
            const respuesta = await pedir(`/proyectos/${idProyecto}/revisiones`);
            if (!respuesta) return;
            // Quien no es Product Owner de este proyecto no ve la sección.
            if (respuesta.estado === 403 || respuesta.estado === 404) {
                seccion.hidden = true;
                return;
            }
            if (!respuesta.ok) {
                throw new Error(respuesta.resultado.mensaje || 'No se pudieron cargar los entregables.');
            }
            seccion.hidden = false;
            const historias = respuesta.resultado.historias;
            const porRevisar = historias.filter((h) => h.estado_historia === 'En revision');
            const revisadas = historias.filter((h) => h.estado_historia !== 'En revision');

            elementos.listaPorRevisar.replaceChildren(...porRevisar.map(tarjetaHistoria));
            elementos.listaRevisadas.replaceChildren(...revisadas.map(tarjetaHistoria));
            elementos.tituloPorRevisar.hidden = porRevisar.length === 0;
            elementos.tituloRevisadas.hidden = revisadas.length === 0;
            elementos.estado.textContent = historias.length === 0
                ? 'Todavía no hay historias enviadas a revisión.'
                : porRevisar.length === 0
                    ? 'No tienes entregables pendientes de revisar.'
                    : `Tienes ${porRevisar.length} ${porRevisar.length === 1 ? 'entregable' : 'entregables'} por revisar.`;
            elementos.estado.hidden = false;
        } catch (error) {
            console.error(error);
            seccion.hidden = false;
            elementos.estado.hidden = true;
            avisarError(error.message || 'No se pudieron cargar los entregables.');
        }
    };

    // ---------- PB-19: abrir la revisión ----------

    const pintarCriterios = (criterios) => {
        const cumplidos = criterios.filter((c) => c.completado).length;
        elementos.resumenCriterios.textContent = criterios.length
            ? `El equipo marcó ${cumplidos} de ${criterios.length} criterios como cumplidos.`
            : '';
        if (!criterios.length) {
            elementos.criterios.replaceChildren(
                crear('li', { clase: 'vacio', texto: 'Esta historia no tiene criterios de aceptación registrados.' })
            );
            return;
        }
        elementos.criterios.replaceChildren(...criterios.map((criterio) =>
            crear('li', { clase: 'criterio-revision' }, [
                crear('span', {
                    clase: `marca-criterio marca-criterio--${criterio.completado ? 'si' : 'no'}`,
                    texto: criterio.completado ? 'Cumplido' : 'Pendiente'
                }),
                crear('span', { texto: criterio.descripcion })
            ])
        ));
    };

    const pintarEvidencias = (idHistoria, evidencias) => {
        if (!evidencias.length) {
            elementos.evidencias.replaceChildren(
                crear('li', { clase: 'vacio', texto: 'El equipo no adjuntó archivos de evidencia.' })
            );
            return;
        }
        elementos.evidencias.replaceChildren(...evidencias.map((evidencia) => {
            const enlace = crear('a', { texto: evidencia.nombre_original });
            enlace.href = `/proyectos/${idProyecto}/revisiones/${idHistoria}/evidencias/${evidencia.id_evidencia}`;
            enlace.target = '_blank';
            enlace.rel = 'noopener noreferrer';
            const datos = [
                formatearTamano(evidencia.tamano_bytes),
                evidencia.subido_por ? `Subido por ${evidencia.subido_por}` : '',
                formatearFechaHora(evidencia.fecha_subida)
            ].filter(Boolean).join(' · ');
            return crear('li', { clase: 'evidencia-revision' }, [
                enlace,
                crear('span', { clase: 'detalle-evidencia', texto: datos })
            ]);
        }));
    };

    const pintarHistorial = (historial) => {
        elementos.historialBloque.hidden = historial.length === 0;
        elementos.historial.replaceChildren(...historial.map((revision) => {
            const elemento = crear('li', {}, [
                insigniaEstado(revision.decision),
                crear('span', {
                    clase: 'detalle-decision',
                    texto: `${revision.revisor || 'Product Owner'} · ${formatearFechaHora(revision.fecha_revision)}`
                })
            ]);
            elemento.append(crear('p', {
                clase: 'observacion-decision',
                texto: revision.observaciones || 'Sin observaciones.'
            }));
            return elemento;
        }));
    };

    const prepararFormulario = (historia) => {
        const editable = historia.estado_historia === 'En revision';
        elementos.formulario.hidden = !editable;
        elementos.formulario.reset();
        elementos.contador.textContent = `0/${elementos.observaciones.maxLength}`;
        elementos.errorDecision.textContent = '';
        elementos.yaDecidida.hidden = editable;
        if (!editable) {
            elementos.yaDecidida.textContent =
                `Esta historia ya fue ${historia.estado_historia === 'Aprobada' ? 'aprobada' : 'rechazada'}. ` +
                'Si el equipo la vuelve a enviar a revisión, podrás decidir de nuevo.';
        }
    };

    async function abrirRevision(idHistoria) {
        avisarError('');
        avisarConfirmacion('');
        try {
            const respuesta = await pedir(`/proyectos/${idProyecto}/revisiones/${idHistoria}`);
            if (!respuesta) return;
            if (!respuesta.ok) {
                avisarError(respuesta.resultado.mensaje || 'No se pudo abrir la revisión.');
                await cargarLista();
                return;
            }
            const { historia, criterios, evidencias, historial } = respuesta.resultado;
            historiaAbierta = historia.id_historia;
            elementos.tituloPanel.textContent = historia.titulo;
            elementos.estadoPanel.replaceWith(Object.assign(insigniaEstado(historia.estado_historia), {
                id: 'estado-panel-revision'
            }));
            elementos.estadoPanel = porId('estado-panel-revision');
            elementos.responsable.textContent = historia.responsable || 'Sin asignar';
            elementos.sprint.textContent = historia.sprint_numero ? `Sprint ${historia.sprint_numero}` : 'Sin Sprint';
            elementos.puntos.textContent = historia.puntos ?? '—';
            elementos.prioridad.textContent = historia.prioridad;
            elementos.descripcion.textContent = historia.descripcion;
            pintarCriterios(criterios);
            pintarEvidencias(historia.id_historia, evidencias);
            pintarHistorial(historial);
            prepararFormulario(historia);
            elementos.panel.hidden = false;
            elementos.panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            elementos.tituloPanel.focus({ preventScroll: true });
        } catch (error) {
            console.error(error);
            avisarError('No se pudo conectar con el servidor.');
        }
    }

    const cerrarRevision = () => {
        historiaAbierta = null;
        elementos.panel.hidden = true;
    };

    // ---------- PB-20: aprobar o rechazar ----------

    elementos.observaciones.addEventListener('input', () => {
        elementos.contador.textContent = `${elementos.observaciones.value.length}/${elementos.observaciones.maxLength}`;
        elementos.errorDecision.textContent = '';
    });

    elementos.formulario.addEventListener('change', () => {
        elementos.errorDecision.textContent = '';
    });

    elementos.formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        elementos.errorDecision.textContent = '';
        const seleccion = elementos.formulario.querySelector('input[name="decision"]:checked');
        const observaciones = elementos.observaciones.value.trim();

        if (!seleccion) {
            elementos.errorDecision.textContent = 'Selecciona si el entregable se aprueba o se rechaza.';
            return;
        }
        if (seleccion.value === 'Rechazada' && observaciones.length < MINIMO_RECHAZO) {
            elementos.errorDecision.textContent =
                `Explica el motivo del rechazo (mínimo ${MINIMO_RECHAZO} caracteres) para que el equipo sepa qué corregir.`;
            elementos.observaciones.focus();
            return;
        }

        elementos.guardar.disabled = true;
        try {
            const respuesta = await pedir(
                `/proyectos/${idProyecto}/revisiones/${historiaAbierta}`,
                'POST',
                { decision: seleccion.value, observaciones }
            );
            if (!respuesta) return;
            if (!respuesta.ok) {
                elementos.errorDecision.textContent = respuesta.resultado.mensaje || 'No se pudo guardar la decisión.';
                if (respuesta.estado === 409) {
                    await cargarLista();
                }
                return;
            }
            cerrarRevision();
            avisarConfirmacion(respuesta.resultado.mensaje);
            await cargarLista();
            // El Sprint Backlog (proyecto.js) también muestra el estado: se vuelve a cargar.
            if (typeof window.cargarSprintBacklog === 'function') {
                window.cargarSprintBacklog();
            }
        } catch (error) {
            console.error(error);
            elementos.errorDecision.textContent = 'No se pudo conectar con el servidor.';
        } finally {
            elementos.guardar.disabled = false;
        }
    });

    porId('cerrar-revision').addEventListener('click', cerrarRevision);
    porId('cancelar-decision').addEventListener('click', cerrarRevision);
    porId('actualizar-revision').addEventListener('click', () => {
        avisarConfirmacion('');
        cargarLista();
    });

    // proyecto.js avisa el rol del usuario en este proyecto cada vez que carga la página.
    // Solo el Product Owner consulta; para el resto la sección no existe (y el servidor igual lo impide).
    document.addEventListener('proyecto-cargado', (evento) => {
        cerrarRevision();
        avisarConfirmacion('');
        if (evento.detail.rol === 'Product Owner') {
            cargarLista();
        } else {
            seccion.hidden = true;
        }
    });0
    document.addEventListener('kanban-ir-a-revision', async (evento) => {
        const idHistoria = Number(evento.detail?.idHistoria);
        if (!Number.isSafeInteger(idHistoria) || idHistoria <= 0) return;
        await cargarLista();
        if (seccion.hidden) {
            return;
        }
        await abrirRevision(idHistoria);
    });
})();
