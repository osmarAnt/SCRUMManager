const cards = document.querySelectorAll('.card');
const columns = document.querySelectorAll('.column');

let draggedCard = null;

// Eventos para las tarjetas
cards.forEach(card => {
    card.addEventListener('dragstart', () => {
        draggedCard = card;
        setTimeout(() => card.style.display = 'none', 0);
    });

    card.addEventListener('dragend', () => {
        setTimeout(() => {
            draggedCard.style.display = 'block';
            draggedCard = null;
        }, 0);
    });
});

// Eventos para las columnas
columns.forEach(column => {
    column.addEventListener('dragover', e => {
        e.preventDefault(); // Permite soltar
    });

    column.addEventListener('dragenter', e => {
        e.preventDefault();
        column.style.background = '#d3d5d9'; // Efecto visual al pasar encima
    });

    column.addEventListener('dragleave', () => {
        column.style.background = '#ebecf0'; // Regresa al color normal
    });

    column.addEventListener('drop', () => {
        column.style.background = '#ebecf0';
        if (draggedCard) {
            column.appendChild(draggedCard); // Mueve la tarjeta a la nueva columna
        }
    });
});