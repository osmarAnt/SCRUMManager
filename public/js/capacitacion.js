
// ======================================================
// JESÚS - PB-39: CAPACITACIÓN PRODUCT OWNER
// ======================================================

document.addEventListener('DOMContentLoaded', () => {

    // Roles disponibles en el apartado de capacitación
    const capacitaciones = {
        'scrum-master': 'Capacitación para Scrum Master',
        'product-owner': 'Capacitación para Product Owner',
        'desarrollador': 'Capacitación para Desarrollador'
    };

    // ==================================================
    // LÁMINAS DE CAPACITACIÓN PRODUCT OWNER
    // ==================================================

    const laminas = [
        {
            titulo: 'Conoce Scrument y entra a tu proyecto',
            descripcion: 'Desde Mis proyectos puedes consultar los proyectos en los que participas. Identifica el proyecto en el que tienes el rol Product Owner y selecciónalo para acceder.',
            pie: 'Pantalla Mis proyectos.',
            imagen: '/img/capacitacion-PO/01-mis-proyectos.png',
            pasos: [
                'Entra a Mis proyectos.',
                'Identifica el proyecto.',
                'Selecciona el proyecto para abrirlo.'
            ]
        },
        {
            titulo: 'Crea historias en el Product Backlog',
            descripcion: 'En la pestaña Backlog puedes registrar las funcionalidades y necesidades que formarán parte del proyecto.',
            pie: 'Formulario para crear una historia.',
            imagen: '/img/capacitacion-PO/02-backlog-crear-historia.png',
            pasos: [
                'Abre la pestaña Backlog.',
                'Escribe el título de la historia.',
                'Agrega una descripción clara.',
                'Define los puntos de historia.',
                'Selecciona la prioridad.',
                'Presiona Guardar en Backlog.'
            ]
        },
        {
            titulo: 'Consulta las historias actuales',
            descripcion: 'En esta sección puedes consultar las historias registradas, sus puntos, prioridad y valor de negocio.',
            pie: 'Listado de historias actuales.',
            imagen: '/img/capacitacion-PO/03-backlog-historias-actuales.png',
            pasos: [
                'Localiza la tabla Historias Actuales.',
                'Consulta el título y la descripción.',
                'Revisa los puntos y la prioridad.',
                'Utiliza las acciones disponibles para administrar cada historia.'
            ]
        },
        {
            titulo: 'Edita una historia',
            descripcion: 'Puedes modificar la información de una historia existente para mantener actualizados sus requerimientos.',
            pie: 'Formulario Editar Historia.',
            imagen: '/img/capacitacion-PO/04-editar-historia.png',
            pasos: [
                'Presiona Editar en la historia.',
                'Modifica el título o la descripción.',
                'Actualiza los puntos de historia.',
                'Presiona Actualizar Historia.'
            ]
        },
        {
            titulo: 'Modifica la prioridad de una historia',
            descripcion: 'La prioridad permite organizar las historias de acuerdo con su importancia para el proyecto.',
            pie: 'Opciones de prioridad disponibles.',
            imagen: '/img/capacitacion-PO/05-cambiar-prioridad.png',
            pasos: [
                'Abre la edición de la historia.',
                'Localiza el selector Prioridad.',
                'Selecciona Alta, Media o Baja.',
                'Presiona Actualizar Historia para guardar el cambio.'
            ]
        },
        {
            titulo: 'Define criterios de aceptación',
            descripcion: 'Los criterios de aceptación describen las condiciones que debe cumplir una historia para considerarse correcta.',
            pie: 'Panel de criterios de aceptación.',
            imagen: '/img/capacitacion-PO/07-criterios-aceptacion.png',
            pasos: [
                'Presiona Criterios en la historia.',
                'Escribe un nuevo criterio.',
                'Utiliza el formato Dado, Cuando y Entonces.',
                'Presiona Agregar Criterio.',
                'Comprueba que aparezca en la lista.'
            ]
        },
        {
            titulo: 'Asigna el valor de negocio',
            descripcion: 'El valor de negocio permite representar la importancia de una historia dentro del proyecto y consultar su relación con el esfuerzo.',
            pie: 'Valor de negocio guardado en una historia.',
            imagen: '/img/capacitacion-PO/08-valor-negocio-guardado.png',
            pasos: [
                'Localiza la columna Valor de negocio.',
                'Introduce el valor correspondiente.',
                'Presiona Guardar valor.',
                'Comprueba el valor y la relación valor/esfuerzo.'
            ]
        },
        {
            titulo: 'Consulta el historial de cambios',
            descripcion: 'El historial permite consultar las modificaciones registradas en una historia, incluyendo el usuario, la fecha y los datos modificados.',
            pie: 'Historial de modificaciones de una historia.',
            imagen: '/img/capacitacion-PO/06-historial-cambios.png',
            pasos: [
                'Presiona Historial en la historia.',
                'Identifica al usuario que realizó el cambio.',
                'Consulta la fecha y hora.',
                'Revisa los valores anteriores y posteriores.'
            ]
        }
    ];

    // ==================================================
    // ELEMENTOS HTML
    // ==================================================

    const opciones = document.getElementById('cap-opciones');
    const detalle = document.getElementById('cap-detalle');
    const titulo = document.getElementById('cap-titulo-detalle');
    const volver = document.getElementById('cap-volver');

    const espacio = document.getElementById('cap-espacio');
    const contenido = document.getElementById('cap-contenido');

    const imagen = document.getElementById('cap-imagen');
    const pieImagen = document.getElementById('cap-imagen-pie');
    const tituloLamina = document.getElementById('cap-lamina-titulo');
    const descripcion = document.getElementById('cap-lamina-descripcion');
    const listaPasos = document.getElementById('cap-lamina-pasos');

    const contador = document.getElementById('cap-contador');
    const barra = document.getElementById('cap-barra');

    const anterior = document.getElementById('cap-anterior');
    const siguiente = document.getElementById('cap-siguiente');
    const terminar = document.getElementById('cap-terminar');
    const salir = document.getElementById('cap-salir');
    const mensaje = document.getElementById('cap-mensaje');

    // Comprobar que los elementos necesarios existen
    const elementos = [
        opciones, detalle, titulo, volver,
        espacio, contenido, imagen, pieImagen,
        tituloLamina, descripcion, listaPasos,
        contador, barra, anterior, siguiente,
        terminar, salir, mensaje
    ];

    if (elementos.some(elemento => !elemento)) {
        console.error(
            'PB-39: No se encontraron todos los elementos HTML de capacitación.'
        );
        return;
    }

    // ==================================================
    // ESTADO DE LA CAPACITACIÓN
    // ==================================================

    let indice = 0;
    let registrando = false;
    let estadoFinalizacion = 'inicial';

    // ==================================================
    // MOSTRAR LÁMINA ACTUAL
    // ==================================================

    function mostrarLamina() {

        const lamina = laminas[indice];

        imagen.src = lamina.imagen;
        imagen.alt = lamina.titulo;

        pieImagen.textContent = lamina.pie;
        tituloLamina.textContent = lamina.titulo;
        descripcion.textContent = lamina.descripcion;

        // Generar lista de instrucciones
        listaPasos.replaceChildren();

        lamina.pasos.forEach(paso => {

            const li = document.createElement('li');
            li.textContent = paso;

            listaPasos.appendChild(li);

        });

        // Actualizar contador y progreso
        contador.textContent =
            `Imagen ${indice + 1} de ${laminas.length}`;

        barra.max = laminas.length;
        barra.value = indice + 1;

        // Controlar botones
        anterior.disabled = indice === 0;

        siguiente.hidden =
            indice === laminas.length - 1;

        terminar.hidden =
            indice !== laminas.length - 1;

            salir.hidden = false;

        // Restablecer mensaje
        mensaje.textContent = '';

        estadoFinalizacion = 'inicial';

        terminar.textContent = 'Terminar capacitación';
        terminar.disabled = false;
    }

    // ==================================================
    // ABRIR Y CERRAR CAPACITACIONES
    // ==================================================

    function mostrarCapacitacion(rol, actualizarUrl = true) {

        const valido = Object.prototype.hasOwnProperty.call(
            capacitaciones,
            rol
        );

        opciones.hidden = valido;
        detalle.hidden = !valido;

        titulo.textContent = valido
            ? capacitaciones[rol]
            : '';

        if (valido) {

            const esProductOwner = rol === 'product-owner';

            espacio.hidden = esProductOwner;
            contenido.hidden = !esProductOwner;

            if (esProductOwner) {
                indice = 0;
                mostrarLamina();
            }

            titulo.focus();

        } else {

            espacio.hidden = false;
            contenido.hidden = true;

        }

        if (actualizarUrl) {

            const destino = valido
                ? `/capacitacion?rol=${encodeURIComponent(rol)}`
                : '/capacitacion';

            history.pushState(
                { rol: valido ? rol : null },
                '',
                destino
            );
        }
    }

    // ==================================================
    // FINALIZAR CAPACITACIÓN
    // CONEXIÓN CON FRANCISCO - PB-40
    // ==================================================

    async function finalizarCapacitacion() {

        if (registrando) return;

        // Después del intento de registro, el botón permite salir.
        if (estadoFinalizacion !== 'inicial') {
            mostrarCapacitacion(null);
            return;
        }

        registrando = true;

        terminar.disabled = true;

        mensaje.textContent =
            'Registrando la capacitación...';

        try {

            const respuesta = await fetch(
                '/capacitaciones/completadas',
                {
                    method: 'POST',

                    credentials: 'same-origin',

                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },

                    body: JSON.stringify({
                        tipoCapacitacion: 'PRODUCT_OWNER'
                    })
                }
            );

            const resultado = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok) {

                throw new Error(
                    resultado.mensaje ||
                    'No se pudo registrar la capacitación.'
                );

            }

            // El servidor confirmó el registro
            estadoFinalizacion = 'registrado';

            mensaje.textContent =
                'Capacitación completada y registrada correctamente.';

            terminar.textContent = 'Salir';
            salir.hidden = true;

            window.dispatchEvent(
                new CustomEvent(
                    'scrument:capacitacion-completada',
                    {
                        detail: {
                            tipoCapacitacion: 'PRODUCT_OWNER'
                        }
                    }
                )
            );

        } catch (error) {

            // No afirmar que se guardó si el servidor no lo confirmó
            estadoFinalizacion = 'pendiente';

            mensaje.textContent = 'Has terminado la capacitación.';

            terminar.textContent = 'Salir';
            salir.hidden = true;

            console.warn(
                'Registro de capacitación pendiente:',
                error.message
            );

        } finally {

            registrando = false;
            terminar.disabled = false;

        }
    }

    // ==================================================
    // EVENTOS DE NAVEGACIÓN
    // ==================================================

    // Seleccionar Scrum Master, Product Owner o Desarrollador
    document.querySelectorAll('[data-cap-rol]').forEach(tarjeta => {

        tarjeta.addEventListener('click', () => {

            mostrarCapacitacion(
                tarjeta.dataset.capRol
            );

        });

    });

    // Regresar a las opciones
    volver.addEventListener('click', () => {
        mostrarCapacitacion(null);
    });

    // Salir de la capacitación
    salir.addEventListener('click', () => {
        mostrarCapacitacion(null);
    });

    // Lámina anterior
    anterior.addEventListener('click', () => {

        if (indice > 0) {

            indice--;
            mostrarLamina();

        }

    });

    // Lámina siguiente
    siguiente.addEventListener('click', () => {

        if (indice < laminas.length - 1) {

            indice++;
            mostrarLamina();

        }

    });

    // Terminar capacitación
    terminar.addEventListener(
        'click',
        finalizarCapacitacion
    );

    // Navegación del navegador
    window.addEventListener('popstate', () => {

        mostrarCapacitacion(
            new URLSearchParams(location.search).get('rol'),
            false
        );

    });

    // Recuperar rol si se accede directamente por URL
    mostrarCapacitacion(
        new URLSearchParams(location.search).get('rol'),
        false
    );

});

// ======================================================
// FIN JESÚS - PB-39
// ======================================================
