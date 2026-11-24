// Sprint 7 · Bloque 6 (Emmanuel) · HU-22: integración con GitHub.
//  - TC-22-01: historial de commits con autor, fecha y mensaje.
//  - TC-22-03: participación de cada integrante (commits por autor y porcentaje).
//  - El Scrum Master vincula el repositorio del proyecto.
(() => {
    'use strict';

    const panel = document.getElementById('panel-github');
    if (!panel) return;

    const idProyecto = window.location.pathname.split('/').filter(Boolean)[1];
    const direccion = `/proyectos/${idProyecto}/github`;
    const $ = (id) => document.getElementById(id);

    const formulario = $('form-github');
    const campo = $('repositorio-github');
    const error = $('error-github');
    const actual = $('repositorio-actual-github');
    const estado = $('estado-github');
    const contenido = $('contenido-github');
    const cuerpo = $('cuerpo-participacion-github');
    const lista = $('lista-commits-github');
    const botonActualizar = $('actualizar-github');
    let cargando = false;

    const crear = (etiqueta, clase, texto) => {
        const elemento = document.createElement(etiqueta);
        if (clase) elemento.className = clase;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    };

    const fecha = (iso) => (iso
        ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—');

    // Solo se enlaza a github.com (segunda barrera; el servidor ya arma la URL).
    const enlaceSeguro = (url) => {
        try {
            const destino = new URL(url);
            return destino.protocol === 'https:' && destino.hostname === 'github.com' ? destino.href : null;
        } catch (problema) {
            return null;
        }
    };

    const pintar = (datos) => {
        formulario.hidden = !datos.puedeConfigurar;
        if (datos.puedeConfigurar && document.activeElement !== campo) campo.value = datos.repositorio || '';
        actual.textContent = datos.repositorio ? `Repositorio vinculado: ${datos.repositorio}` : '';

        if (!datos.repositorio) {
            contenido.hidden = true;
            estado.textContent = datos.puedeConfigurar
                ? 'Vincula el repositorio del proyecto para ver sus commits.'
                : 'El Scrum Master todavía no vincula el repositorio de GitHub.';
            return;
        }
        if (datos.error) {
            contenido.hidden = true;
            estado.textContent = datos.error;
            return;
        }
        estado.textContent = `${datos.commits.length} commit(s) recientes · ${datos.participacion.length} autor(es).`;
        cuerpo.replaceChildren(...datos.participacion.map((persona) => {
            const fila = crear('tr');
            const autor = crear('td');
            autor.append(crear('span', 'nombre-historia', persona.autor));
            if (persona.usuario_github) autor.append(crear('span', 'detalle-fila', `@${persona.usuario_github}`));
            const porcentaje = crear('td', 'numero');
            const barra = crear('div', 'barra-participacion');
            const relleno = crear('span');
            relleno.style.width = `${persona.porcentaje}%`;
            barra.append(relleno);
            porcentaje.append(barra, document.createTextNode(` ${persona.porcentaje} %`));
            fila.append(autor, crear('td', 'numero', String(persona.commits)), porcentaje, crear('td', '', fecha(persona.ultima)));
            return fila;
        }));
        lista.replaceChildren(...datos.commits.map((commit) => {
            const elemento = crear('li', 'commit');
            const cabecera = crear('div', 'cabecera-commit');
            const url = enlaceSeguro(commit.url);
            const sha = url ? crear('a', 'sha-commit', commit.sha) : crear('span', 'sha-commit', commit.sha);
            if (url) {
                sha.href = url;
                sha.target = '_blank';
                sha.rel = 'noopener noreferrer';
            }
            cabecera.append(sha, crear('span', 'mensaje-commit', commit.mensaje));
            elemento.append(cabecera, crear('p', 'meta-commit', `${commit.autor}${commit.usuario_github ? ` (@${commit.usuario_github})` : ''} · ${fecha(commit.fecha)}`));
            return elemento;
        }));
        contenido.hidden = false;
    };

    const cargar = async () => {
        if (cargando) return;
        cargando = true;
        botonActualizar.disabled = true;
        estado.textContent = 'Consultando GitHub...';
        try {
            const respuesta = await fetch(direccion, { headers: { Accept: 'application/json' }, cache: 'no-store' });
            if (respuesta.status === 401) return window.location.replace('/login');
            const datos = await respuesta.json().catch(() => ({}));
            if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo consultar GitHub.');
            pintar(datos);
        } catch (problema) {
            estado.textContent = problema.message;
        } finally {
            cargando = false;
            botonActualizar.disabled = false;
        }
    };

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        error.textContent = '';
        const boton = formulario.querySelector('button[type="submit"]');
        boton.disabled = true;
        try {
            const respuesta = await fetch(direccion, {
                method: 'PUT',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ repositorio: campo.value.trim() })
            });
            const datos = await respuesta.json().catch(() => ({}));
            if (!respuesta.ok) {
                error.textContent = datos.mensaje || 'No se pudo vincular el repositorio.';
                return;
            }
            await cargar();
        } catch (problema) {
            error.textContent = 'No se pudo conectar con el servidor.';
        } finally {
            boton.disabled = false;
        }
    });

    botonActualizar.addEventListener('click', cargar);
    document.addEventListener('pestana-activa', (evento) => {
        if (evento.detail?.id === 'github') cargar();
    });
})();
