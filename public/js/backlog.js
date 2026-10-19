// public/js/backlog.js

let rolActual = ''; // Variable global para guardar el rol del usuario activo
let listaHistorias = []; // Almacena las historias para poder editarlas sin volver a consultar al servidor
let idHistoriaEditando = null; // Controla si estamos en modo "Crear" (null) o "Editar" (ID)

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Obtener el ID del proyecto de la URL (ej: /backlog.html?id_proyecto=1)
    const urlParams = new URLSearchParams(window.location.search);
    const idProyecto = urlParams.get('id_proyecto') || 1; 

    // 2. Obtener el rol del usuario antes de dibujar la interfaz
    await obtenerRolUsuario();
    
    // 3. Ocultar la caja del formulario si no es Product Owner
    if (rolActual !== 'Product Owner') {
        const contenedorFormulario = document.getElementById('contenedor-formulario'); 
        if (contenedorFormulario) {
            contenedorFormulario.style.display = 'none';
        }
    }

    // 4. Cargar las historias del proyecto en la tabla
    cargarHistorias(idProyecto);

    // 5. Configurar el evento para cuando se envíe el formulario (Crear o Editar)
    const formulario = document.getElementById('formulario-crear-historia');
    if (formulario) {
        formulario.addEventListener('submit', (evento) => guardarHistoria(evento, idProyecto));
    }
});

// Función para pedirle el rol al servidor
async function obtenerRolUsuario() {
    try {
        const respuesta = await fetch('/api/usuario-actual');
        if (respuesta.ok) {
            const datos = await respuesta.json();
            rolActual = datos.rol;
        } else {
            console.warn('No se pudo obtener el rol. Verifica la ruta /api/usuario-actual');
        }
    } catch (error) {
        console.error('Error de red al intentar obtener el rol:', error);
    }
}

// Función para pedirle al servidor las historias del proyecto
async function cargarHistorias(idProyecto) {
    try {
        const respuesta = await fetch(`/backlog/${idProyecto}`);
        if (!respuesta.ok) throw new Error('Error al obtener el backlog');
        
        listaHistorias = await respuesta.json(); // Guardamos en la variable global
        mostrarEnTabla(listaHistorias);
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar las historias del servidor.');
    }
}

// Función para dibujar los datos en tu tabla HTML
function mostrarEnTabla(historias) {
    const tbody = document.getElementById('tabla-backlog-body'); 
    if (!tbody) return;
    
    tbody.innerHTML = '';

    historias.forEach(historia => {
        let botonesHTML = '';
        // Si es Product Owner, inyectamos los botones de Editar y Eliminar
        if (rolActual === 'Product Owner') {
            botonesHTML = `
                <button onclick="prepararEdicion(${historia.id_historia})" class="btn-secundario">Editar</button>
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

// NUEVA FUNCIÓN: Rellena el formulario y cambia al modo "Edición"
function prepararEdicion(idHistoria) {
    const historia = listaHistorias.find(h => h.id_historia === idHistoria);
    if (!historia) return;

    // Llenamos los campos del formulario con los datos de la historia
    document.getElementById('titulo').value = historia.titulo;
    document.getElementById('descripcion').value = historia.descripcion;
    document.getElementById('puntos').value = historia.puntos || '';
    document.getElementById('prioridad').value = historia.prioridad;

    // Cambiamos al modo de edición
    idHistoriaEditando = idHistoria;
    
    // Ajustamos los textos visuales para que el usuario sepa que está editando
    const botonSubmit = document.querySelector('#formulario-crear-historia button[type="submit"]');
    if(botonSubmit) botonSubmit.textContent = 'Actualizar Historia';
    
    const tituloSeccion = document.getElementById('titulo-backlog');
    if(tituloSeccion) tituloSeccion.textContent = 'Editar Historia';
    
    // Hacemos scroll suave hacia el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// FUNCIÓN MODIFICADA: Enviar una historia al servidor (Crear o Editar)
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

    // Configuramos si será una creación (POST) o una edición (PUT)
let url = '/backlog';
    let metodo = 'POST';

    if (idHistoriaEditando !== null) {
        // ASEGÚRATE DE QUE LA URL ESTÉ ASÍ:
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
        
        // Restaurar el formulario a su estado original de "Crear"
        document.getElementById('formulario-crear-historia').reset();
        idHistoriaEditando = null;
        
        const botonSubmit = document.querySelector('#formulario-crear-historia button[type="submit"]');
        if(botonSubmit) botonSubmit.textContent = 'Guardar en Backlog';
        
        const tituloSeccion = document.getElementById('titulo-backlog');
        if(tituloSeccion) tituloSeccion.textContent = 'Creación de Historias';
        
        // Recargar la tabla
        cargarHistorias(idProyecto); 

    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor al guardar la historia.');
    }
}

// Función para eliminar una historia del servidor
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