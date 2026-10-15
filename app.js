const express = require('express');
const path = require('path');
const session = require('express-session');
const loginRutas = require('./src/rutas/loginRutas');
const scrumMasterRutas = require('./src/rutas/scrumMasterRutas');
const productOwnerRutas = require('./src/rutas/productOwnerRutas');
const desarrolladorRutas = require('./src/rutas/desarrolladorRutas');
const app = express();
const puerto = 3000;

app.use(
    express.static(
        path.join(__dirname, 'public')
    )
);

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    express.json()
);

app.use(
    session({
        secret: 'scrument_secreto',
        resave: false,
        saveUninitialized: false
    })
);

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.use(
    '/login',
    loginRutas
);

app.use(
    '/scrum-master',
    scrumMasterRutas
);

app.use(
    '/product-owner',
    productOwnerRutas
);

app.use(
    '/desarrollador',
    desarrolladorRutas
);

app.listen(
    puerto,
    () => {
        console.log('Ya jaló');
    }
);
