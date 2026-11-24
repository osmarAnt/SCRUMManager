// Sprint 7 · Bloque 3 (Francisco) · HU-09 y HU-10: criterios de aceptación y Definition of Done.
//  - Cada historia del Sprint Backlog muestra sus criterios y su DoD con casillas para marcar.
//    El desarrollador responsable marca; el Product Owner marca criterios; el Scrum Master define y marca el DoD.
//  - Mientras haya algo sin cumplir, el servidor no deja pasar la historia a "Terminada".
//  - El DoD del Sprint lo administra el Scrum Master y se valida al pulsar "Finalizar Sprint".
(() => {
    'use strict';

    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];

    const pedir = async (url, metodo = 'GET', cuerpo) => {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: { Accept: 'application/json', ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
            cache: 'no-store',
            body: cuerpo ? JSON.stringify(cuerpo) : undefined
        });
        if (respuesta.status === 401) {
            window.location.replace('/login');
            throw new Error('Tu sesión terminó.');
        }
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) {
            const error = new Error(datos.mensaje || datos.error || 'No se pudo completar la operación.');
            error.datos = datos;
            throw error;
        }
        return datos;
    };

    const crear = (etiqueta, clase, texto) => {
        const elemento = document.createElement(etiqueta);
        if (clase) elemento.className = clase;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    };

    // Lista de casillas. "alCambiar(item, marcado)" guarda el cambio; si falla, la casilla regresa.
    const listaDeCasillas = ({ items, campo, habilitado, alCambiar, alEliminar, vacio }) => {
        if (!items.length) {
            return crear('p', 'ayuda-campo', vacio);
        }
        const lista = crear('ul', 'lista-calidad');
        items.forEach((item) => {
            const fila = crear('li', 'item-calidad');
            const etiqueta = crear('label', 'casilla-calidad');
            const casilla = document.createElement('input');
            casilla.type = 'checkbox';
            casilla.checked = Boolean(item[campo]);
            casilla.disabled = !habilitado;
            const texto = crear('span', '', item.descripcion);
            etiqueta.append(casilla, texto);
            fila.dataset.cumplido = String(casilla.checked);
            casilla.addEventListener('change', async () => {
                casilla.disabled = true;
                try {
                    await alCambiar(item, casilla.checked);
                    item[campo] = casilla.checked;
                    fila.dataset.cumplido = String(casilla.checked);
                } catch (error) {
                    casilla.checked = !casilla.checked;
                    window.alert(error.message);
                } finally {
                    casilla.disabled = !habilitado;
                }
            });
            fila.append(etiqueta);
            if (alEliminar) {
                const quitar = crear('button', 'boton-quitar-calidad', 'Quitar');
                quitar.type = 'button';
                quitar.setAttribute('aria-label', `Quitar requisito: ${item.descripcion}`);
                quitar.addEventListener('click', () => alEliminar(item, quitar));
                fila.append(quitar);
            }
            lista.append(fila);
        });
        return lista;
    };

    // Formulario corto para agregar un requisito de DoD.
    const formularioRequisito = (alAgregar, ejemplo) => {
        const formulario = crear('form', 'form-calidad');
        formulario.noValidate = true;
        const campo = document.createElement('input');
        campo.type = 'text';
        campo.maxLength = 255;
        campo.placeholder = ejemplo;
        campo.setAttribute('aria-label', 'Nuevo requisito de la Definition of Done');
        const boton = crear('button', 'boton-secundario', 'Agregar');
        boton.type = 'submit';
        formulario.append(campo, boton);
        formulario.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            const descripcion = campo.value.trim();
            if (descripcion.length < 3) {
                window.alert('Escribe el requisito (al menos 3 caracteres).');
                return;
            }
            boton.disabled = true;
            try {
                await alAgregar(descripcion);
                campo.value = '';
            } catch (error) {
                window.alert(error.message);
            } finally {
                boton.disabled = false;
            }
        });
        return formulario;
    };

    // ---------- Panel de una historia (se agrega a cada tarjeta del Sprint Backlog) ----------
    window.crearPanelCalidad = (historia) => {
        const panel = crear('details', 'panel-calidad');
        const resumen = crear('summary', '', 'Criterios de aceptación y Definition of Done');
        const contenido = crear('div', 'contenido-calidad');
        panel.append(resumen, contenido);

        const cargar = async () => {
            contenido.replaceChildren(crear('p', 'ayuda-campo', 'Cargando...'));
            try {
                const datos = await pedir(`/proyectos/${idProyecto}/historias/${historia.id_historia}/calidad`);
                const total = datos.criterios.length + datos.dod.length;
                const cumplidos = datos.criterios.filter((c) => c.completado).length + datos.dod.filter((d) => d.cumplido).length;
                resumen.textContent = `Criterios de aceptación y Definition of Done (${cumplidos}/${total} cumplidos)`;
                panel.dataset.completo = String(total > 0 && cumplidos === total);

                const criterios = crear('section', 'seccion-calidad');
                criterios.append(crear('h5', '', 'Criterios de aceptación'));
                criterios.append(listaDeCasillas({
                    items: datos.criterios,
                    campo: 'completado',
                    habilitado: datos.puedeMarcarCriterios,
                    vacio: 'Esta historia no tiene criterios. El Product Owner los agrega desde el Backlog.',
                    alCambiar: (item, marcado) => pedir(
                        `/backlog/criterios/${item.id_criterio}/completado`, 'PUT', { completado: marcado }
                    ).then(() => cargar())
                }));

                const dod = crear('section', 'seccion-calidad');
                dod.append(crear('h5', '', 'Definition of Done de la historia'));
                dod.append(listaDeCasillas({
                    items: datos.dod,
                    campo: 'cumplido',
                    habilitado: datos.puedeMarcarDod,
                    vacio: 'Sin requisitos de DoD para esta historia.',
                    alCambiar: (item, marcado) => pedir(
                        `/proyectos/${idProyecto}/dod/${item.id_requisito}`, 'PUT', { cumplido: marcado }
                    ).then(() => cargar()),
                    alEliminar: datos.puedeDefinirDod ? async (item, boton) => {
                        if (!window.confirm(`¿Quitar "${item.descripcion}" de la Definition of Done?`)) return;
                        boton.disabled = true;
                        try {
                            await pedir(`/proyectos/${idProyecto}/dod/${item.id_requisito}`, 'DELETE');
                            await cargar();
                        } catch (error) {
                            window.alert(error.message);
                            boton.disabled = false;
                        }
                    } : null
                }));
                if (datos.puedeDefinirDod) {
                    dod.append(formularioRequisito(async (descripcion) => {
                        await pedir(`/proyectos/${idProyecto}/historias/${historia.id_historia}/dod`, 'POST', { descripcion });
                        await cargar();
                    }, 'Ej. Código revisado, Pruebas pasadas'));
                }

                const aviso = crear('p', 'ayuda-campo');
                aviso.textContent = datos.bloqueada
                    ? 'La historia está en revisión o aprobada: ya no se modifican sus criterios ni su DoD.'
                    : 'La historia solo puede pasar a "Terminado" cuando todo esté cumplido.';
                contenido.replaceChildren(criterios, dod, aviso);
            } catch (error) {
                contenido.replaceChildren(crear('p', 'mensaje-error', error.message));
            }
        };

        cargar();
        return panel;
    };

    // ---------- DoD del Sprint y "Finalizar Sprint" (TC-10-03) ----------
    const seccion = document.getElementById('dod-sprint');
    if (!seccion) return;
    const listaSprint = document.getElementById('lista-dod-sprint');
    const estadoSprint = document.getElementById('estado-dod-sprint');
    const contenedorFormulario = document.getElementById('form-dod-sprint');
    const botonFinalizar = document.getElementById('finalizar-sprint');
    const mensaje = document.getElementById('mensaje-dod-sprint');
    let idSprintActual = null;

    const cargarSprint = async (idSprint) => {
        idSprintActual = idSprint;
        seccion.hidden = !idSprint;
        mensaje.textContent = '';
        mensaje.dataset.tipo = '';
        if (!idSprint) return;
        estadoSprint.textContent = 'Cargando...';
        try {
            const datos = await pedir(`/proyectos/${idProyecto}/sprints/${idSprint}/dod`);
            if (idSprint !== idSprintActual) return;
            const cumplidos = datos.dod.filter((d) => d.cumplido).length;
            estadoSprint.textContent = datos.finalizado
                ? `Sprint finalizado. Definition of Done: ${cumplidos}/${datos.dod.length} cumplidos.`
                : `${cumplidos}/${datos.dod.length} requisitos cumplidos.`;
            listaSprint.replaceChildren(listaDeCasillas({
                items: datos.dod,
                campo: 'cumplido',
                habilitado: datos.puedeAdministrar,
                vacio: 'Todavía no hay requisitos. Ejemplos: "Código revisado", "Pruebas pasadas", "Desplegado en entorno de pruebas".',
                alCambiar: (item, marcado) => pedir(
                    `/proyectos/${idProyecto}/dod/${item.id_requisito}`, 'PUT', { cumplido: marcado }
                ).then(() => cargarSprint(idSprint)),
                alEliminar: datos.puedeAdministrar ? async (item, boton) => {
                    if (!window.confirm(`¿Quitar "${item.descripcion}" de la Definition of Done del Sprint?`)) return;
                    boton.disabled = true;
                    try {
                        await pedir(`/proyectos/${idProyecto}/dod/${item.id_requisito}`, 'DELETE');
                        await cargarSprint(idSprint);
                    } catch (error) {
                        window.alert(error.message);
                        boton.disabled = false;
                    }
                } : null
            }));
            contenedorFormulario.replaceChildren();
            if (datos.puedeAdministrar) {
                contenedorFormulario.append(formularioRequisito(async (descripcion) => {
                    await pedir(`/proyectos/${idProyecto}/sprints/${idSprint}/dod`, 'POST', { descripcion });
                    await cargarSprint(idSprint);
                }, 'Ej. Pruebas pasadas'));
            }
            botonFinalizar.hidden = !datos.puedeAdministrar;
        } catch (error) {
            estadoSprint.textContent = error.message;
        }
    };

    botonFinalizar.addEventListener('click', async () => {
        if (!idSprintActual) return;
        if (!window.confirm('¿Finalizar este Sprint? Se valida que toda su Definition of Done esté cumplida.')) return;
        botonFinalizar.disabled = true;
        mensaje.textContent = '';
        try {
            const datos = await pedir(`/proyectos/${idProyecto}/sprints/${idSprintActual}/finalizar`, 'POST');
            mensaje.dataset.tipo = 'ok';
            mensaje.textContent = datos.mensaje;
            // Recarga los datos del proyecto (el estado del Sprint cambió a Finalizado).
            window.setTimeout(() => window.location.reload(), 1200);
        } catch (error) {
            mensaje.dataset.tipo = 'error';
            const pendientes = error.datos?.pendientes;
            mensaje.textContent = pendientes?.length
                ? `${error.message} Pendientes: ${pendientes.join(', ')}.`
                : error.message;
        } finally {
            botonFinalizar.disabled = false;
        }
    });

    document.addEventListener('sprint-backlog-seleccionado', (evento) => {
        cargarSprint(Number(evento.detail.idSprint) || null);
    });
})();
