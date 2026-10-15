const path = require('path');

const mostrarPanelDesarrollador = (req, res) => {
    res.sendFile(
        path.join(__dirname, '..', '..', 'vistas', 'desarrollador.html')
    );
};

module.exports = {
    mostrarPanelDesarrollador
};
