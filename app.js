const express = require('express');
const path = require('path');
const session = require('express-session');
const loginRutas = require('./src/rutas/loginRutas');
const registroRutas = require('./src/rutas/registroRutas');
const proyectoRutas = require('./src/rutas/proyectoRutas');
const invitacionRutas = require('./src/rutas/invitacionRutas');
const scrumMasterRutas = require('./src/rutas/scrumMasterRutas');
const productOwnerRutas = require('./src/rutas/productOwnerRutas');
const desarrolladorRutas = require('./src/rutas/desarrolladorRutas');
const backlogRutas = require('./src/rutas/backlogRutas');
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
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax'
        }
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
    '/registro',
    registroRutas
);

app.use(
    '/proyectos',
    proyectoRutas
);

app.use(
    '/invitaciones',
    invitacionRutas
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

app.use(
    '/',
    backlogRutas
);

app.listen(
    puerto,
    () => {
        console.log('Ya jaló');
    }
);

