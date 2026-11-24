// PB-64: Panel de resumen del proyecto
(() => {
    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const seccion = document.getElementById('seccion-resumen-proyecto');
    if (!seccion || !idProyecto) {
        return;
    }

    const estadoEl = document.getElementById('estado-resumen-proyecto');
    const gridEl = document.getElementById('grid-resumen-proyecto');
    const botonActualizar = document.getElementById('actualizar-resumen-proyecto');

    // Elementos de Sprint activo / actual
    const sprintTitulo = document.getElementById('resumen-sprint-titulo');
    const sprintEstado = document.getElementById('resumen-sprint-estado');
    const sprintDias = document.getElementById('resumen-sprint-dias');
    const sprintDetalle = document.getElementById('resumen-sprint-detalle');

    // Elementos de Avance general
    const avancePorcentaje = document.getElementById('resumen-avance-porcentaje');
    const avanceInsignia = document.getElementById('resumen-avance-insignia');
    const avanceBarra = document.getElementById('resumen-avance-barra');
    const avanceDetalle = document.getElementById('resumen-avance-detalle');

    // Elementos de Historias por estado
    const historiasTotal = document.getElementById('resumen-historias-total');
    const historiasLista = document.getElementById('resumen-historias-estados');
    const historiasDetalle = document.getElementById('resumen-historias-detalle');

    // Elementos de Últimos avisos
    const avisosConteo = document.getElementById('resumen-avisos-conteo');
    const avisosLista = document.getElementById('resumen-avisos-lista');
    const avisosVacio = document.getElementById('resumen-avisos-vacio');
    const botonIrAvisos = document.getElementById('resumen-ir-avisos');

    let cargando = false;

    const consultarJson = async (url) => {
        const respuesta = await fetch(url, {
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });
        if (!respuesta.ok) {
            return null;
        }
        return respuesta.json().catch(() => null);
    };

    const formatearFechaCorta = (iso) => {
        if (!iso) return '';
        const [anio, mes, dia] = iso.split('-').map(Number);
        return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC'
        });
    };

    // Calcula días restantes respecto a hoy en UTC para evitar desfases horarios
    const calcularDiasRestantes = (fechaFinIso) => {
        const hoy = new Date();
        const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const [anio, mes, dia] = fechaFinIso.split('-').map(Number);
        const finUtc = Date.UTC(anio, mes - 1, dia);
        return Math.round((finUtc - hoyUtc) / 86400000);
    };

    const elegirSprintDestacado = (sprints) => {
        if (!Array.isArray(sprints) || sprints.length === 0) {
            return null;
        }
        const hoy = new Date();
        const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

        // 1. Prioriza Sprint explícitamente Activo / En curso
        const activo = sprints.find((s) => ['Activo', 'En curso'].includes(s.estado));
        if (activo) return activo;

        // 2. Si no, busca uno cuyas fechas abarquen hoy
        const vigente = sprints.find((s) => s.fecha_inicio <= hoyIso && s.fecha_fin >= hoyIso);
        if (vigente) return vigente;

        // 3. Si no, el próximo planificado
        const planificado = sprints.find((s) => s.estado === 'Planificado');
        if (planificado) return planificado;

        // 4. Por último, el Sprint más reciente
        return sprints[sprints.length - 1];
    };

    const pintarSprint = (sprints) => {
        const sprint = elegirSprintDestacado(sprints);
        if (!sprint) {
            sprintTitulo.textContent = 'Sin Sprints';
            sprintEstado.textContent = 'Sin configurar';
            sprintEstado.className = 'insignia-resumen insignia-resumen--neutro';
            sprintDias.textContent = '—';
            sprintDetalle.textContent = 'Configura un Sprint para iniciar el seguimiento.';
            return;
        }

        sprintTitulo.textContent = `Sprint ${sprint.numero}`;
        sprintEstado.textContent = sprint.estado;
        sprintEstado.className = `insignia-resumen ${
            sprint.estado === 'Finalizado' || sprint.estado === 'Completado'
                ? 'insignia-resumen--exito'
                : ''
        }`;

        const dias = calcularDiasRestantes(sprint.fecha_fin);
        if (dias > 1) {
            sprintDias.textContent = `${dias} días restantes`;
        } else if (dias === 1) {
            sprintDias.textContent = '1 día restante';
        } else if (dias === 0) {
            sprintDias.textContent = 'Cierra hoy';
            sprintEstado.className = 'insignia-resumen insignia-resumen--alerta';
        } else {
            const vencidos = Math.abs(dias);
            sprintDias.textContent =
                sprint.estado === 'Finalizado' || sprint.estado === 'Completado'
                    ? 'Iteración cerrada'
                    : `Finalizó hace ${vencidos} ${vencidos === 1 ? 'día' : 'días'}`;
        }

        sprintDetalle.textContent = `${formatearFechaCorta(sprint.fecha_inicio)} – ${formatearFechaCorta(sprint.fecha_fin)} · ${sprint.objetivo}`;
    };

    const pintarHistoriasYAvance = (historias) => {
        const lista = Array.isArray(historias) ? historias : [];
        const totalHistorias = lista.length;

        const conteos = {
            Pendiente: 0,
            'En curso': 0,
            'En revision': 0,
            Aprobada: 0,
            Terminada: 0,
            Rechazada: 0
        };

        let puntosTotales = 0;
        let puntosCompletados = 0;

        lista.forEach((h) => {
            const estado = h.estado_historia || 'Pendiente';
            if (Object.prototype.hasOwnProperty.call(conteos, estado)) {
                conteos[estado] += 1;
            } else {
                conteos.Pendiente += 1;
            }

            const pts = Number(h.puntos) || 0;
            puntosTotales += pts;
            // En el proyecto, una historia cuenta como completada al ser Aprobada (o Terminada)
            if (estado === 'Aprobada' || estado === 'Terminada') {
                puntosCompletados += pts;
            }
        });

        // Tarjeta de Avance general
        const completadasCount = conteos.Aprobada + conteos.Terminada;
        const porcentaje = puntosTotales > 0
            ? Math.round((puntosCompletados / puntosTotales) * 100)
            : (totalHistorias > 0 ? Math.round((completadasCount / totalHistorias) * 100) : 0);

        avancePorcentaje.textContent = `${porcentaje}%`;
        avanceBarra.style.width = `${porcentaje}%`;
        avanceInsignia.textContent = `${completadasCount}/${totalHistorias} historias`;
        avanceInsignia.className = `insignia-resumen ${
            porcentaje === 100 && totalHistorias > 0 ? 'insignia-resumen--exito' : ''
        }`;
        avanceDetalle.textContent = puntosTotales > 0
            ? `${puntosCompletados} de ${puntosTotales} puntos de historia completados.`
            : (totalHistorias > 0
                ? 'Las historias aún no tienen puntos estimados.'
                : 'Aún no hay historias registradas en el Product Backlog.');

        // Tarjeta de Historias por estado
        historiasTotal.textContent = `${totalHistorias} ${totalHistorias === 1 ? 'historia' : 'historias'}`;
        historiasLista.replaceChildren();

        const grupos = [
            { etiqueta: 'Pendientes', valor: conteos.Pendiente },
            { etiqueta: 'En curso', valor: conteos['En curso'] },
            { etiqueta: 'En revisión', valor: conteos['En revision'] },
            { etiqueta: 'Aprobadas', valor: completadasCount },
            ...(conteos.Rechazada > 0 ? [{ etiqueta: 'Rechazadas', valor: conteos.Rechazada }] : [])
        ];

        grupos.forEach(({ etiqueta, valor }) => {
            const item = document.createElement('li');
            item.className = 'chip-estado-resumen';
            const numero = document.createElement('strong');
            numero.textContent = String(valor);
            item.append(numero, document.createTextNode(` ${etiqueta}`));
            historiasLista.appendChild(item);
        });

        const sinAsignarSprint = lista.filter((h) => h.id_sprint == null).length;
        historiasDetalle.textContent = totalHistorias === 0
            ? 'Crea historias desde la pestaña Backlog.'
            : `${sinAsignarSprint} en Product Backlog · ${totalHistorias - sinAsignarSprint} asignadas a Sprints.`;
    };

    const pintarAvisos = (datosMensajes) => {
        const mensajes = Array.isArray(datosMensajes?.mensajes) ? datosMensajes.mensajes : [];
        const sinLeer = mensajes.filter((m) => !m.leido).length;

        avisosConteo.textContent = sinLeer > 0
            ? `${sinLeer} sin leer`
            : `${mensajes.length} ${mensajes.length === 1 ? 'aviso' : 'avisos'}`;
        avisosConteo.className = `insignia-resumen ${
            sinLeer > 0 ? 'insignia-resumen--alerta' : 'insignia-resumen--neutro'
        }`;

        avisosLista.replaceChildren();
        const recientes = mensajes.slice(0, 3);
        avisosVacio.hidden = recientes.length > 0;

        recientes.forEach((aviso) => {
            const item = document.createElement('li');
            item.className = 'item-aviso-resumen';

            const titulo = document.createElement('strong');
            titulo.textContent = aviso.titulo;

            const meta = document.createElement('span');
            const fecha = new Date(aviso.fecha_creacion);
            const fechaTexto = !Number.isNaN(fecha.getTime())
                ? fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                : '';
            meta.textContent = `${aviso.tipo} · ${aviso.autor}${fechaTexto ? ` · ${fechaTexto}` : ''}`;

            item.append(titulo, meta);
            avisosLista.appendChild(item);
        });
    };

    const cargarResumen = async () => {
        if (cargando) return;
        cargando = true;
        if (botonActualizar) botonActualizar.disabled = true;

        try {
            const [datosProyecto, historias, datosMensajes] = await Promise.all([
                consultarJson(`/proyectos/${idProyecto}/datos`),
                consultarJson(`/backlog/${idProyecto}`),
                consultarJson(`/proyectos/${idProyecto}/mensajes`)
            ]);

            if (!datosProyecto) {
                estadoEl.dataset.tipo = 'error';
                estadoEl.textContent = 'No se pudo cargar el resumen del proyecto.';
                return;
            }

            pintarSprint(datosProyecto.sprints);
            pintarHistoriasYAvance(historias);
            pintarAvisos(datosMensajes);

            estadoEl.hidden = true;
            gridEl.hidden = false;
        } catch (error) {
            console.error(error);
            estadoEl.dataset.tipo = 'error';
            estadoEl.textContent = 'Ocurrió un error al cargar el resumen.';
        } finally {
            cargando = false;
            if (botonActualizar) botonActualizar.disabled = false;
        }
    };

    botonActualizar?.addEventListener('click', cargarResumen);

    botonIrAvisos?.addEventListener('click', () => {
        document.getElementById('pestana-avisos')?.click();
    });

    // Se actualiza al volver a la pestaña Menú principal
    document.addEventListener('pestana-activa', (evento) => {
        if (evento.detail?.id === 'menu') {
            cargarResumen();
        }
    });

    window.addEventListener('pageshow', cargarResumen);
})();