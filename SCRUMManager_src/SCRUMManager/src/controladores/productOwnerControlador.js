const path = require('path');

const mostrarPanelProductOwner = (req, res) => {
    res.sendFile(
        path.join(__dirname, '..', '..', 'vistas', 'productOwner.html')
    );
};

module.exports = {
    mostrarPanelProductOwner
};
