// public/js/backlog.js

let rolActual = ''; 
let listaHistorias = []; 
let idHistoriaEditando = null; 
let idHistoriaCriteriosActual = null; // Guarda el ID de la historia cuyos criterios estamos viendo

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idProyecto = urlParams.get('id_proyecto') || 1; 

    await obtenerRolUsuario();
    
    if (rolActual !== 'Product Owner') {
        const contenedorFormulario = document.getElementById('contenedor-formulario'); 
        if (contenedorFormulario) {
            contenedorFormulario.style.display = 'none';
        }
    }

    cargarHistorias(idProyecto);

    const formulario = document.getElementById('formulario-crear-historia');
    if (formulario) {
        formulario.addEventListener('submit', (evento) => guardarHistoria(evento, idProyecto));
    }

    const formCriterio = document.getElementById('form-crear-criterio');
    if (formCriterio) {
        formCriterio.addEventListener('submit', (evento) => guardarCriterio(evento));
    }
});

async function obtenerRolUsuario() {
    try {
        const respuesta = await fetch('/api/usuario-actual');
        if (respuesta.ok) {
            const datos = await respuesta.json();
            rolActual = datos.rol;
        } else {
            console.warn('No se pudo obtener el rol.');
        }
    } catch (error) {
        console.error('Error de red al intentar obtener el rol:', error);
    }
}

async function cargarHistorias(idProyecto) {
    try {
        const respuesta = await fetch(`/backlog/${idProyecto}`);
        if (!respuesta.ok) throw new Error('Error al obtener el backlog');
        
        listaHistorias = await respuesta.json();
        mostrarEnTabla(listaHistorias);
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar las historias del servidor.');
    }
}

function mostrarEnTabla(historias) {
    const tbody = document.getElementById('tabla-backlog-body'); 
    if (!tbody) return;
    
    tbody.innerHTML = '';

    historias.forEach(historia => {
        let botonesHTML = `
            <button onclick="verCriterios(${historia.id_historia}, '${historia.titulo.replace(/'/g, "\\'")}')" class="boton-secundario" style="margin-right: 5px;">Criterios</button>
        `;

        if (rolActual === 'Product Owner') {
            botonesHTML += `
                <button onclick="prepararEdicion(${historia.id_historia})" class="boton-secundario" style="margin-right: 5px;">Editar</button>
                <button onclick="eliminarHistoria(${historia.id_historia})" class="btn-eliminar">Eliminar</button>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${historia.titulo}</td>
            <td>${historia.descripcion}</td>
            <td>${historia.puntos !== null ? historia.puntos : '-'}</td>
            <td>${historia.prioridad}</td>
            <td>${botonesHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

function prepararEdicion(idHistoria) {
    const historia = listaHistorias.find(h => h.id_historia === idHistoria);
    if (!historia) return;

    document.getElementById('titulo').value = historia.titulo;
    document.getElementById('descripcion').value = historia.descripcion;
    document.getElementById('puntos').value = historia.puntos || '';
    document.getElementById('prioridad').value = historia.prioridad;

    idHistoriaEditando = idHistoria;
    
    const botonSubmit = document.querySelector('#formulario-crear-historia button[type="submit"]');
    if(botonSubmit) botonSubmit.textContent = 'Actualizar Historia';
    
    const tituloSeccion = document.getElementById('titulo-backlog');
    if(tituloSeccion) tituloSeccion.textContent = 'Editar Historia';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function guardarHistoria(evento, idProyecto) {
    evento.preventDefault();

    const titulo = document.getElementById('titulo').value;
    const descripcion = document.getElementById('descripcion').value;
    const puntos = document.getElementById('puntos').value;
    const prioridad = document.getElementById('prioridad').value;

    const datosHistoria = {
        id_proyecto: idProyecto,
        titulo,
        descripcion,
        puntos: puntos ? parseInt(puntos) : null,
        prioridad
    };

    let url = '/backlog';
    let metodo = 'POST';

    if (idHistoriaEditando !== null) {
        url = `/backlog/${idHistoriaEditando}`; 
        metodo = 'PUT'; 
    }

    try {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosHistoria)
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.error || 'Error al guardar la historia');
            return;
        }

        alert(idHistoriaEditando ? 'Historia actualizada con éxito' : 'Historia creada con éxito');
        
        document.getElementById('formulario-crear-historia').reset();
        idHistoriaEditando = null;
        
        const botonSubmit = document.querySelector('#formulario-crear-historia button[type="submit"]');
        if(botonSubmit) botonSubmit.textContent = 'Guardar en Backlog';
        
        const tituloSeccion = document.getElementById('titulo-backlog');
        if(tituloSeccion) tituloSeccion.textContent = 'Creación de Historias';
        
        cargarHistorias(idProyecto); 

    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor al guardar la historia.');
    }
}

async function eliminarHistoria(idHistoria) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta historia?')) return;

    try {
        const respuesta = await fetch(`/backlog/${idHistoria}`, {
            method: 'DELETE'
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.error || 'Error al eliminar la historia');
            return;
        }

        alert('Historia eliminada');
        
        const urlParams = new URLSearchParams(window.location.search);
        const idProyecto = urlParams.get('id_proyecto') || 1; 
        cargarHistorias(idProyecto); 

    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor al intentar eliminar.');
    }
}

// --- FUNCIONES PARA CRITERIOS DE ACEPTACIÓN ---

async function verCriterios(idHistoria, tituloHistoria) {
    idHistoriaCriteriosActual = idHistoria;
    const panel = document.getElementById('panel-criterios');
    const tituloPanel = document.getElementById('titulo-criterios-historia');
    
    if(tituloPanel) tituloPanel.textContent = `Criterios para: ${tituloHistoria}`;
    if(panel) panel.style.display = 'block';

    // Ocultar formulario de creación de criterios si no es Product Owner
    const formCriterio = document.getElementById('form-crear-criterio');
    if (formCriterio) {
        formCriterio.style.display = (rolActual === 'Product Owner') ? 'block' : 'none';
    }

    await cargarCriterios(idHistoria);
    panel.scrollIntoView({ behavior: 'smooth' });
}

async function cargarCriterios(idHistoria) {
    try {
        const respuesta = await fetch(`/backlog/criterios/${idHistoria}`);
        if (!respuesta.ok) throw new Error('Error al obtener criterios');
        
        const criterios = await respuesta.json();
        const lista = document.getElementById('lista-criterios');
        if (!lista) return;

        lista.innerHTML = '';
        if (criterios.length === 0) {
            lista.innerHTML = '<p class="ayuda-campo">No hay criterios de aceptación registrados para esta historia.</p>';
            return;
        }

        criterios.forEach(c => {
            const li = document.createElement('li');
            li.style.padding = '8px 12px';
            li.style.margin = '5px 0';
            li.style.background = '#f6f8fa';
            li.style.borderLeft = '4px solid #0366d6';
            li.style.borderRadius = '3px';
            li.textContent = c.descripcion;
            lista.appendChild(li);
        });
    } catch (error) {
        console.error('Error al cargar criterios:', error);
    }
}

async function guardarCriterio(evento) {
    evento.preventDefault();
    if (!idHistoriaCriteriosActual) return;

    const descripcion = document.getElementById('desc-criterio').value;

    try {
        const respuesta = await fetch('/backlog/criterios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_historia: idHistoriaCriteriosActual, descripcion })
        });

        const datos = await respuesta.json();
        if (!respuesta.ok) {
            alert(datos.error || 'Error al guardar el criterio');
            return;
        }

        document.getElementById('desc-criterio').value = '';
        await cargarCriterios(idHistoriaCriteriosActual);
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor.');
    }
}

function cerrarPanelCriterios() {
    const panel = document.getElementById('panel-criterios');
    if(panel) panel.style.display = 'none';
    idHistoriaCriteriosActual = null;
}