const path = require('path');

const mostrarPanelScrumMaster = (req, res) => {
    res.sendFile(
        path.join(__dirname, '..', '..', 'vistas', 'scrumMaster.html')
    );
};

module.exports = {
    mostrarPanelScrumMaster
};
