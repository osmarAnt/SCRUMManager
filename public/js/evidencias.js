// PB-57: el desarrollador responsable adjunta evidencias a su historia y la envía a revisión.
// proyecto.js llama a window.crearPanelEvidencias(historia) al pintar cada tarjeta del Sprint Backlog.
(() => {
    'use strict';

    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    let contador = 0;

    const crear = (etiqueta, { clase, texto } = {}, hijos = []) => {
        const nodo = document.createElement(etiqueta);
        if (clase) nodo.className = clase;
        if (texto !== undefined) nodo.textContent = texto;
        nodo.append(...hijos);
        return nodo;
    };

    const boton = (texto, clase = '') => {
        const nodo = crear('button', { clase, texto });
        nodo.type = 'button';
        return nodo;
    };

    const formatearTamano = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatearFechaHora = (texto) => {
        const partes = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(texto || '');
        if (!partes) return '';
        const [, anio, mes, dia, hora, minuto] = partes.map(Number);
        return new Date(Date.UTC(anio, mes - 1, dia, hora, minuto)).toLocaleString('es-MX', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
        });
    };

    const peticion = async (url, metodo = 'GET', opciones = {}) => {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: { Accept: 'application/json', ...(opciones.encabezados || {}) },
            cache: 'no-store',
            body: opciones.cuerpo
        });
        if (respuesta.status === 401) {
            window.location.replace('/login');
            return null;
        }
        const resultado = await respuesta.json().catch(() => ({}));
        return { ok: respuesta.ok, estado: respuesta.status, resultado };
    };

    window.crearPanelEvidencias = (historia) => {
        const base = `/proyectos/${idProyecto}/historias/${historia.id_historia}`;
        const idEntrada = `archivos-historia-${historia.id_historia}-${contador++}`;

        const ayuda = crear('p', { clase: 'ayuda-campo ayuda-evidencias', texto: 'Cargando evidencias...' });
        const lista = crear('ul', { clase: 'lista-evidencias' });
        const entrada = crear('input');
        entrada.type = 'file';
        entrada.id = idEntrada;
        entrada.multiple = true;
        const etiquetaEntrada = crear('label', { texto: 'Archivos de evidencia' });
        etiquetaEntrada.htmlFor = idEntrada;
        const detalleLimites = crear('p', { clase: 'ayuda-campo' });
        const botonAdjuntar = boton('Adjuntar archivos', 'boton-secundario');
        const botonEnviar = boton('Enviar a revisión');
        const error = crear('p', { clase: 'mensaje-error' });
        error.setAttribute('role', 'alert');
        const confirmacion = crear('p', { clase: 'mensaje-confirmacion' });
        confirmacion.hidden = true;

        const zonaSubida = crear('div', { clase: 'subida-evidencias' }, [
            etiquetaEntrada, entrada, detalleLimites,
            crear('div', { clase: 'acciones-evidencias' }, [botonAdjuntar])
        ]);
        const panel = crear('section', { clase: 'panel-evidencias' }, [
            crear('h5', { clase: 'titulo-evidencias', texto: 'Evidencias de entrega' }),
            ayuda, lista, zonaSubida, error, confirmacion,
            crear('div', { clase: 'acciones-formulario' }, [botonEnviar])
        ]);

        let datos = null;
        let ocupado = false;

        const bloquear = (valor) => {
            ocupado = valor;
            botonAdjuntar.disabled = valor || !datos || !datos.puedeAdjuntar;
            botonEnviar.disabled = valor || !datos || !datos.puedeEnviar;
            entrada.disabled = valor || !datos || !datos.puedeAdjuntar;
            lista.querySelectorAll('button').forEach((b) => { b.disabled = valor; });
        };

        const pintar = () => {
            const { limites, evidencias, puedeAdjuntar } = datos;
            ayuda.textContent = datos.ayuda;
            entrada.accept = limites.extensiones.join(',');
            detalleLimites.textContent =
                `Formatos: ${limites.extensiones.join(', ')} · Máximo ${formatearTamano(limites.tamano_maximo_bytes)} por archivo ` +
                `y ${limites.maximo_archivos} archivos (${evidencias.length} adjuntos).`;
            zonaSubida.hidden = !puedeAdjuntar;
            botonEnviar.hidden = !['Terminada', 'Rechazada', 'En revision'].includes(datos.estado_historia);
            botonEnviar.textContent = datos.estado_historia === 'En revision' ? 'Enviada a revisión' : 'Enviar a revisión';

            lista.replaceChildren(...(evidencias.length ? evidencias.map((evidencia) => {
                const fila = crear('li', {}, [
                    crear('span', { clase: 'nombre-evidencia' }, [
                        crear('strong', { texto: evidencia.nombre_original }),
                        crear('span', {
                            clase: 'detalle-evidencia',
                            texto: `${formatearTamano(evidencia.tamano_bytes)} · ${formatearFechaHora(evidencia.fecha_subida)}`
                        })
                    ])
                ]);
                if (puedeAdjuntar) {
                    const quitar = boton('Quitar', 'boton-secundario boton-quitar-evidencia');
                    quitar.setAttribute('aria-label', `Quitar ${evidencia.nombre_original}`);
                    quitar.addEventListener('click', () => quitarArchivo(evidencia));
                    fila.append(quitar);
                }
                return fila;
            }) : [crear('li', { clase: 'vacio', texto: 'Todavía no hay archivos adjuntos.' })]));
            bloquear(false);
        };

        const cargar = async () => {
            try {
                const respuesta = await peticion(`${base}/evidencias`);
                if (!respuesta) return;
                if (!respuesta.ok) {
                    throw new Error(respuesta.resultado.mensaje || 'No se pudieron cargar las evidencias.');
                }
                datos = respuesta.resultado;
                pintar();
            } catch (excepcion) {
                ayuda.textContent = '';
                error.textContent = excepcion.message || 'No se pudieron cargar las evidencias.';
            }
        };

        // Revisa en el navegador lo evidente (formato y tamaño); el servidor lo vuelve a comprobar.
        const motivoDeRechazo = (archivo) => {
            const punto = archivo.name.lastIndexOf('.');
            const extension = punto >= 0 ? archivo.name.slice(punto).toLowerCase() : '';
            if (!datos.limites.extensiones.includes(extension)) {
                return `"${archivo.name}": formato no permitido.`;
            }
            if (archivo.size === 0) {
                return `"${archivo.name}": el archivo está vacío.`;
            }
            if (archivo.size > datos.limites.tamano_maximo_bytes) {
                return `"${archivo.name}": supera ${formatearTamano(datos.limites.tamano_maximo_bytes)}.`;
            }
            return '';
        };

        const adjuntar = async () => {
            if (ocupado) return;
            error.textContent = '';
            confirmacion.hidden = true;
            const archivos = [...entrada.files];
            if (!archivos.length) {
                error.textContent = 'Selecciona al menos un archivo.';
                return;
            }
            bloquear(true);
            const problemas = [];
            let subidos = 0;
            for (const [indice, archivo] of archivos.entries()) {
                const motivo = motivoDeRechazo(archivo);
                if (motivo) {
                    problemas.push(motivo);
                    continue;
                }
                ayuda.textContent = `Subiendo ${indice + 1} de ${archivos.length}: ${archivo.name}...`;
                try {
                    // El archivo viaja tal cual (cuerpo binario); el nombre va en un encabezado.
                    const respuesta = await peticion(`${base}/evidencias`, 'POST', {
                        encabezados: {
                            'Content-Type': 'application/octet-stream',
                            'X-Nombre-Archivo': encodeURIComponent(archivo.name)
                        },
                        cuerpo: archivo
                    });
                    if (!respuesta) return;
                    if (respuesta.ok) {
                        subidos += 1;
                    } else {
                        problemas.push(`"${archivo.name}": ${respuesta.resultado.mensaje || 'no se pudo subir.'}`);
                        if (respuesta.estado === 409) break; // estado o límite: no tiene caso seguir
                    }
                } catch (excepcion) {
                    problemas.push(`"${archivo.name}": no se pudo conectar con el servidor.`);
                    break;
                }
            }
            entrada.value = '';
            await cargar();
            if (subidos) {
                confirmacion.textContent = subidos === 1 ? 'Se adjuntó 1 archivo.' : `Se adjuntaron ${subidos} archivos.`;
                confirmacion.hidden = false;
            }
            error.textContent = problemas.join(' ');
        };

        async function quitarArchivo(evidencia) {
            if (ocupado || !confirm(`¿Quitar "${evidencia.nombre_original}" de las evidencias?`)) return;
            error.textContent = '';
            confirmacion.hidden = true;
            bloquear(true);
            try {
                const respuesta = await peticion(`${base}/evidencias/${evidencia.id_evidencia}`, 'DELETE');
                if (!respuesta) return;
                if (!respuesta.ok) {
                    error.textContent = respuesta.resultado.mensaje || 'No se pudo quitar el archivo.';
                }
            } catch (excepcion) {
                error.textContent = 'No se pudo conectar con el servidor.';
            }
            await cargar();
        }

        const enviar = async () => {
            if (ocupado || !confirm(
                `¿Enviar "${historia.titulo}" a revisión?\n\nNo podrás cambiar sus archivos hasta que el Product Owner decida.`
            )) return;
            error.textContent = '';
            confirmacion.hidden = true;
            bloquear(true);
            try {
                const respuesta = await peticion(`${base}/enviar-revision`, 'POST');
                if (!respuesta) return;
                if (!respuesta.ok) {
                    error.textContent = respuesta.resultado.mensaje || 'No se pudo enviar la historia.';
                    await cargar();
                    return;
                }
                // El estado cambió: se vuelve a pintar el Sprint Backlog completo.
                if (typeof window.cargarSprintBacklog === 'function') {
                    await window.cargarSprintBacklog();
                }
                const aviso = document.getElementById('confirmacion-backlog');
                if (aviso) {
                    aviso.textContent = respuesta.resultado.mensaje;
                    aviso.hidden = false;
                }
            } catch (excepcion) {
                error.textContent = 'No se pudo conectar con el servidor.';
                bloquear(false);
            }
        };

        botonAdjuntar.addEventListener('click', adjuntar);
        botonEnviar.addEventListener('click', enviar);
        bloquear(true);
        cargar();
        return panel;
    };
})();
