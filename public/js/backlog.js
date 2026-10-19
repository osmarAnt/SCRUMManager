const API_URL = '/backlog'; 
// public/js/backlog.js

document.addEventListener('DOMContentLoaded', () => {
    const formBacklog = document.getElementById('form-backlog');
    
    if (formBacklog) {
        formBacklog.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            // Extraer el ID del proyecto de la URL actual (ej. /proyectos/1 -> ID es 1)
            const partesUrl = window.location.pathname.split('/');
            const idProyecto = partesUrl[partesUrl.length - 1];

            const nuevaHistoria = {
                id_proyecto: idProyecto, // Enviamos el ID requerido por la base de datos
                titulo: document.getElementById('titulo-historia').value,
                descripcion: document.getElementById('desc-historia').value,
                puntos: document.getElementById('puntos-historia').value || null,
                prioridad: document.getElementById('prioridad-historia').value
            };

            try {
                const respuesta = await fetch('/backlog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevaHistoria)
                });
                
                if (respuesta.ok) {
                    formBacklog.reset();
                    cargarBacklog(); // Recarga la tabla con los nuevos datos
                } else {
                    console.error('El servidor rechazó los datos');
                }
            } catch (error) {
                console.error('Error de red al guardar:', error);
            }
        });
    }

    // Función para cargar y mostrar el backlog actual al entrar a la página
    cargarBacklog();
});

async function cargarBacklog() {
    const cuerpoTabla = document.getElementById('cuerpo-tabla-backlog');
    if (!cuerpoTabla) return;

    try {
        const partesUrl = window.location.pathname.split('/');
        const idProyecto = partesUrl[partesUrl.length - 1];

        // Petición para obtener las historias de este proyecto específico
        const respuesta = await fetch(`/backlog/${idProyecto}`);
        if (!respuesta.ok) return;

        const historias = await respuesta.json();
        cuerpoTabla.innerHTML = '';

        historias.forEach(historia => {
            const fila = document.tr = document.createElement('tr');
            fila.style.borderBottom = '1px solid #e1e4e8';
            fila.innerHTML = `
                <td style="padding: 10px;">${historia.titulo}</td>
                <td style="padding: 10px;">${historia.descripcion}</td>
                <td style="padding: 10px;">${historia.puntos || '-'}</td>
                <td style="padding: 10px;">${historia.prioridad}</td>
                <td style="padding: 10px;">
                    <button onclick="eliminarHistoria(${historia.id_historia})" style="Eliminar: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Eliminar</button>
                </td>
            `;
            cuerpoTabla.appendChild(fila);
        });
    } catch (error) {
        console.error('Error al cargar el backlog:', error);
    }
}

async function eliminarHistoria(id) {
    if (!confirm('¿Estás seguro de eliminar esta historia?')) return;

    try {
        const respuesta = await fetch(`/backlog/${id}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            cargarBacklog();
        } else {
            console.error('No se pudo eliminar la historia');
        }
    } catch (error) {
        console.error('Error de red al eliminar:', error);
    }
}