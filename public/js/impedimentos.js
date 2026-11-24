// Sprint 7 · Bloque 4 (Jesús) · HU-16: impedimentos.
//  - TC-16-01: cualquier integrante registra un impedimento (por ejemplo "Se cayó el servidor").
//  - TC-16-02: el Scrum Master (o quien lo registró) escribe la solución y lo marca como resuelto.
//  - TC-16-03: los activos y los resueltos se ven por separado; los resueltos conservan su solución.
(() => {
    'use strict';

    const panel = document.getElementById('panel-impedimentos');
    if (!panel) return;

    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const direccion = `/proyectos/${idProyecto}/impedimentos`;
    const $ = (id) => document.getElementById(id);

    const formulario = $('form-impedimento');
    const botonNuevo = $('nuevo-impedimento');
    const error = $('error-impedimento');
    const confirmacion = $('confirmacion-impedimento');
    const estado = $('estado-impedimentos');
    const selectorSprint = $('sprint-impedimento');
    const insignia = $('insignia-impedimentos');
    const grupos = {
        Activo: { lista: $('lista-impedimentos-activos'), conteo: $('conteo-impedimentos-activos') },
        Resuelto: { lista: $('lista-impedimentos-resueltos'), conteo: $('conteo-impedimentos-resueltos') }
    };

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
        if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo completar la operación.');
        return datos;
    };

    const crear = (etiqueta, clase, texto) => {
        const elemento = document.createElement(etiqueta);
        if (clase) elemento.className = clase;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    };

    const formatearFecha = (texto) => {
        if (!texto) return '';
        const [fecha, hora] = texto.split(' ');
        const [anio, mes, dia] = fecha.split('-').map(Number);
        return `${new Date(anio, mes - 1, dia).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} ${hora || ''}`.trim();
    };

    // Formulario para escribir la solución de un impedimento activo.
    const formularioSolucion = (impedimento, tarjeta) => {
        const form = crear('form', 'form-solucion');
        form.noValidate = true;
        const etiqueta = crear('label', '', 'Solución aplicada');
        const campo = document.createElement('textarea');
        campo.rows = 2;
        campo.maxLength = 2000;
        campo.placeholder = 'Ej. Se levantó el servidor';
        campo.id = `solucion-${impedimento.id_impedimento}`;
        etiqueta.htmlFor = campo.id;
        const fallo = crear('p', 'mensaje-error');
        fallo.setAttribute('role', 'alert');
        const acciones = crear('div', 'acciones-formulario');
        const cancelar = crear('button', 'boton-secundario', 'Cancelar');
        cancelar.type = 'button';
        const guardar = crear('button', '', 'Marcar como resuelto');
        guardar.type = 'submit';
        acciones.append(cancelar, guardar);
        form.append(etiqueta, campo, fallo, acciones);
        cancelar.addEventListener('click', () => form.remove());
        form.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            const solucion = campo.value.trim();
            if (solucion.length < 3) {
                fallo.textContent = 'Escribe la solución aplicada (al menos 3 caracteres).';
                return campo.focus();
            }
            guardar.disabled = true;
            try {
                const datos = await pedir(`${direccion}/${impedimento.id_impedimento}/resolver`, 'PUT', { solucion });
                confirmacion.textContent = datos.mensaje;
                confirmacion.hidden = false;
                await cargar();
            } catch (problema) {
                fallo.textContent = problema.message;
                guardar.disabled = false;
            }
        });
        tarjeta.append(form);
        campo.focus();
    };

    const tarjeta = (impedimento) => {
        const articulo = crear('article', 'impedimento');
        articulo.dataset.estado = impedimento.estado;
        const cabecera = crear('div', 'cabecera-impedimento');
        cabecera.append(crear('h4', '', impedimento.titulo));
        const impacto = crear('span', 'etiqueta-impacto', `Impacto ${impedimento.impacto.toLowerCase()}`);
        impacto.dataset.impacto = impedimento.impacto;
        const estadoEtiqueta = crear('span', 'etiqueta-estado-impedimento', impedimento.estado);
        estadoEtiqueta.dataset.estado = impedimento.estado;
        cabecera.append(impacto, estadoEtiqueta);

        const descripcion = crear('p', 'descripcion-impedimento', impedimento.descripcion);
        const sprint = impedimento.sprint_numero
            ? ` · Sprint ${impedimento.sprint_numero}${impedimento.sprint_nombre ? ` (${impedimento.sprint_nombre})` : ''}`
            : '';
        const meta = crear('p', 'meta-impedimento', `Registrado por ${impedimento.autor} el ${formatearFecha(impedimento.fecha_registro)}${sprint}`);
        articulo.append(cabecera, descripcion, meta);

        if (impedimento.estado === 'Resuelto') {
            const solucion = crear('p', 'solucion-impedimento');
            solucion.append(crear('strong', '', 'Solución: '), document.createTextNode(impedimento.solucion || ''));
            const quien = crear('p', 'meta-impedimento',
                `Resuelto${impedimento.resolutor ? ` por ${impedimento.resolutor}` : ''} el ${formatearFecha(impedimento.fecha_resolucion)}`);
            articulo.append(solucion, quien);
        } else if (impedimento.puedeResolver) {
            const boton = crear('button', 'boton-secundario', 'Registrar solución');
            boton.type = 'button';
            boton.addEventListener('click', () => {
                boton.hidden = true;
                formularioSolucion(impedimento, articulo);
            });
            articulo.append(boton);
        }
        return articulo;
    };

    const cargar = async () => {
        try {
            const datos = await pedir(direccion);
            Object.entries(grupos).forEach(([clave, grupo]) => {
                const items = datos.impedimentos.filter((imp) => imp.estado === clave);
                grupo.lista.replaceChildren(...(items.length
                    ? items.map(tarjeta)
                    : [crear('p', 'ayuda-campo', clave === 'Activo' ? 'No hay impedimentos activos. ¡Bien!' : 'Todavía no se ha resuelto ningún impedimento.')]));
                grupo.conteo.textContent = String(items.length);
            });
            insignia.hidden = datos.activos === 0;
            insignia.textContent = String(datos.activos);
            estado.textContent = `${datos.activos} activo(s) · ${datos.resueltos} resuelto(s).`;
        } catch (problema) {
            estado.textContent = problema.message;
        }
    };

    // Sprints del proyecto para relacionar el impedimento.
    const cargarSprints = async () => {
        try {
            const datos = await pedir(`/proyectos/${idProyecto}/datos`);
            const anterior = selectorSprint.value;
            selectorSprint.replaceChildren(new Option('Sin Sprint', ''));
            datos.sprints.forEach((sprint) => selectorSprint.add(
                new Option(`Sprint ${sprint.numero}${sprint.nombre ? ` · ${sprint.nombre}` : ''}`, String(sprint.id_sprint))
            ));
            const hoy = new Date().toISOString().slice(0, 10);
            const vigente = datos.sprints.find((s) => s.fecha_inicio <= hoy && hoy <= s.fecha_fin);
            selectorSprint.value = anterior || (vigente ? String(vigente.id_sprint) : '');
        } catch (problema) {
            // Si falla, se registra sin Sprint.
        }
    };

    botonNuevo.addEventListener('click', () => {
        formulario.reset();
        error.textContent = '';
        confirmacion.hidden = true;
        formulario.hidden = false;
        cargarSprints();
        $('titulo-impedimento').focus();
    });

    $('cancelar-impedimento').addEventListener('click', () => {
        formulario.hidden = true;
    });

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        error.textContent = '';
        const datos = {
            titulo: $('titulo-impedimento').value.trim(),
            descripcion: $('descripcion-impedimento').value.trim(),
            impacto: $('impacto-impedimento').value,
            id_sprint: selectorSprint.value || null
        };
        if (datos.titulo.length < 3) {
            error.textContent = 'Escribe el impedimento (al menos 3 caracteres).';
            return $('titulo-impedimento').focus();
        }
        if (datos.descripcion.length < 3) {
            error.textContent = 'Describe el impedimento (al menos 3 caracteres).';
            return $('descripcion-impedimento').focus();
        }
        const boton = formulario.querySelector('button[type="submit"]');
        boton.disabled = true;
        try {
            const resultado = await pedir(direccion, 'POST', datos);
            formulario.hidden = true;
            confirmacion.textContent = resultado.mensaje;
            confirmacion.hidden = false;
            await cargar();
        } catch (problema) {
            error.textContent = problema.message;
        } finally {
            boton.disabled = false;
        }
    });

    document.addEventListener('pestana-activa', (evento) => {
        if (evento.detail?.id === 'impedimentos') cargar();
    });
    // La insignia de la pestaña muestra cuántos impedimentos activos hay desde que se abre el proyecto.
    window.addEventListener('pageshow', cargar);
})();
