const form = document.getElementById('add-task-form');
const columns = document.querySelectorAll('.column');
const totalPointsEl = document.getElementById('total-points');
const donePointsEl = document.getElementById('done-points');

// Estado inicial por defecto si no hay localStorage
const defaultTasks = [
    { id: 't1', title: 'HU-01: Gestión de Backlog', desc: 'Como PO, quiero priorizar elementos en la lista.', points: 5, priority: 'must-have', status: 'backlog' },
    { id: 't2', title: 'HU-02: Tablero Kanban', desc: 'Como Developer, quiero mover tareas.', points: 8, priority: 'must-have', status: 'in-progress' },
    { id: 't3', title: 'HU-03: Gráfica Burndown', desc: 'Como SM, quiero visualizar el esfuerzo.', points: 5, priority: 'should-have', status: 'backlog' }
];

let tasks = JSON.parse(localStorage.getItem('scrumTasks')) || defaultTasks;

// Función para guardar en localStorage
function saveTasks() {
    localStorage.setItem('scrumTasks', JSON.stringify(tasks));
    updateMetrics();
}

// Actualizar métricas visuales
function updateMetrics() {
    let total = 0;
    let done = 0;
    tasks.forEach(task => {
        total += parseInt(task.points);
        if (task.status === 'done') done += parseInt(task.points);
    });
    totalPointsEl.textContent = total;
    donePointsEl.textContent = done;
}

// Renderizar tarjetas
function renderCards() {
    // Limpiar columnas (manteniendo el h2)
    columns.forEach(col => {
        const h2 = col.querySelector('h2');
        col.innerHTML = '';
        col.appendChild(h2);
    });

    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `card ${task.priority}`;
        card.draggable = true;
        card.id = task.id;

        card.innerHTML = `
            <button class="delete-btn" onclick="deleteTask('${task.id}')">X</button>
            <span class="badge">Tarea</span> <span class="points">${task.points} pts</span>
            <h3>${task.title}</h3>
            <p>${task.desc}</p>
        `;

        // Eventos Drag
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            setTimeout(() => card.style.opacity = '0.5', 0);
        });

        card.addEventListener('dragend', () => {
            card.style.opacity = '1';
        });

        const column = document.getElementById(task.status);
        if (column) column.appendChild(card);
    });
    updateMetrics();
}

// Agregar nueva tarea
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const desc = document.getElementById('task-desc').value;
    const points = document.getElementById('task-points').value;
    const priority = document.getElementById('task-priority').value;

    const newTask = {
        id: 't' + Date.now(),
        title,
        desc,
        points: parseInt(points),
        priority,
        status: 'backlog' // Por defecto al backlog
    };

    tasks.push(newTask);
    saveTasks();
    renderCards();
    form.reset();
});

// Eliminar tarea (global para el botón onclick)
window.deleteTask = function(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderCards();
};

// Eventos Drop para columnas
columns.forEach(column => {
    column.addEventListener('dragover', e => {
        e.preventDefault();
        column.style.background = '#d3d5d9';
    });

    column.addEventListener('dragleave', () => {
        column.style.background = '#ebecf0';
    });

    column.addEventListener('drop', e => {
        e.preventDefault();
        column.style.background = '#ebecf0';
        
        const id = e.dataTransfer.getData('text/plain');
        const newStatus = column.getAttribute('data-status');
        
        // Actualizar el estado en el array de objetos
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex > -1) {
            tasks[taskIndex].status = newStatus;
            saveTasks();
            renderCards();
        }
    });
});

// Inicializar
renderCards();
