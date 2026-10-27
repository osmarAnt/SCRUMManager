// public/js/kanban.js

document.addEventListener('DOMContentLoaded', () => {
    const selectSprint = document.getElementById('select-sprint-kanban');
    
    if (selectSprint) {
        // Cuando cambien de sprint en el selector, recargamos el tablero
        selectSprint.addEventListener('change', (e) => {
            const idSprint = e.target.value;
            if (idSprint) cargarKanban(idSprint);
        });
        
        cargarSprintsEnSelectorKanban();
    }
});

async function cargarSprintsEnSelectorKanban() {
    const urlParams = new URLSearchParams(window.location.search);
    const idProyecto = urlParams.get('id_proyecto') || 1;

    try {
        // Hacemos la petición a la ruta que ya tienes y devuelve toda la info del proyecto
        const respuesta = await fetch(`/proyectos/${idProyecto}/datos`); 
        
        if (respuesta.ok) {
            const datos = await respuesta.json();
            const sprints = datos.sprints; // Extraemos el arreglo de sprints del JSON

            const select = document.getElementById('select-sprint-kanban');
            select.innerHTML = '<option value="">Selecciona un Sprint</option>'; 

            if (sprints && sprints.length > 0) {
                sprints.forEach(sprint => {
                    const opcion = document.createElement('option');
                    opcion.value = sprint.id_sprint;
                    opcion.textContent = `Sprint ${sprint.numero}: ${sprint.objetivo.substring(0, 30)}...`;
                    select.appendChild(opcion);
                });

                // Cargar el tablero Kanban con el primer sprint automáticamente
                select.value = sprints[0].id_sprint;
                cargarKanban(sprints[0].id_sprint);
            } else {
                select.innerHTML = '<option value="">No hay Sprints configurados</option>';
            }
        }
    } catch (error) {
        console.error("Error al cargar sprints en el Kanban", error);
    }
}

async function cargarKanban(idSprint) {
    try {
        // Petición al backend que trae las historias de un sprint específico (la que hicimos en el DAO)
        const respuesta = await fetch(`/backlog/kanban/${idSprint}`);
        if (!respuesta.ok) throw new Error('Error al cargar datos del Kanban');
        
        const historias = await respuesta.json();
        dibujarKanban(historias);
    } catch (error) {
        console.error(error);
        alert('No se pudo cargar el tablero Kanban.');
    }
}

function dibujarKanban(historias) {
    // 1. Limpiar columnas actuales
    const colPendiente = document.getElementById('tarjetas-pendiente');
    const colEnCurso = document.getElementById('tarjetas-en-curso');
    const colTerminada = document.getElementById('tarjetas-terminada');
    
    if (!colPendiente || !colEnCurso || !colTerminada) return;

    colPendiente.innerHTML = '';
    colEnCurso.innerHTML = '';
    colTerminada.innerHTML = '';

    let contPendiente = 0, contEnCurso = 0, contTerminada = 0;

    // 2. Dibujar las nuevas tarjetas
    historias.forEach(historia => {
        const tarjeta = document.createElement('div');
        
        // Colores según la prioridad
        let colorBorde = '#ccc';
        if (historia.prioridad === 'Alta') colorBorde = '#dc3545';
        if (historia.prioridad === 'Media') colorBorde = '#ffc107';
        if (historia.prioridad === 'Baja') colorBorde = '#28a745';

        tarjeta.style.cssText = `background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); border-left: 4px solid ${colorBorde};`;
        
        const nombreResp = historia.nombre_responsable ? historia.nombre_responsable : 'Sin asignar';
        const puntos = historia.puntos !== null ? `${historia.puntos} pts` : '-';

        tarjeta.innerHTML = `
            <h4 style="margin: 0 0 10px 0; font-size: 1rem;">${historia.titulo}</h4>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #666;">
                <span style="font-weight: bold; color: #333;">${nombreResp}</span>
                <span>${puntos}</span>
            </div>
        `;

        // 3. Ubicar la tarjeta en la columna que le toca
        if (historia.estado_historia === 'Pendiente') {
            colPendiente.appendChild(tarjeta);
            contPendiente++;
        } else if (historia.estado_historia === 'En curso') {
            colEnCurso.appendChild(tarjeta);
            contEnCurso++;
        } else if (['Terminada', 'En revision', 'Aprobada', 'Rechazada'].includes(historia.estado_historia)) {
            // Agrupamos todos los estados finales o de validación en la columna "Terminada"
            colTerminada.appendChild(tarjeta);
            contTerminada++;
        }
    });

    // 4. Actualizar numeritos arriba de las columnas
    document.getElementById('contador-pendiente').textContent = contPendiente;
    document.getElementById('contador-en-curso').textContent = contEnCurso;
    document.getElementById('contador-terminada').textContent = contTerminada;
}