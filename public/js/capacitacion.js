// ======================================================
// JESÚS - PB-39: CAPACITACIÓN PRODUCT OWNER
// OSMAR - PB-36: CAPACITACIÓN DESARROLLADOR
// CAPACITACIÓN SCRUM MASTER
// ======================================================

document.addEventListener('DOMContentLoaded', () => {

    // Roles disponibles en el apartado de capacitación
    const capacitaciones = {
        'scrum-master': 'Capacitación para Scrum Master',
        'product-owner': 'Capacitación para Product Owner',
        'desarrollador': 'Capacitación para Desarrollador'
    };

    // Variable global para saber qué arreglo de láminas estamos usando
    let laminasActuales = [];

    // ==================================================
    // LÁMINAS DE CAPACITACIÓN PRODUCT OWNER
    // ==================================================
    const laminasProductOwner = [
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
    // OSMAR - LÁMINAS DE CAPACITACIÓN DESARROLLADOR
    // ==================================================
    const laminasDesarrollador = [
        {
            titulo: "Consultar descripciones en el Backlog",
            descripcion: "Como Desarrollador, debes consultar el Backlog para entender qué requiere cada historia.",
            pasos: [
                "Ve a la pestaña 'Backlog'.",
                "Localiza la sección 'Historias Actuales'.",
                "Revisa la columna 'Descripción' para conocer los detalles y requerimientos de la tarea que debes realizar."
            ],
            imagen: "/img/capacitacion-DEV/cap-dev-1.png",
            pie: "Sección de Historias Actuales en el Backlog."
        },
        {
            titulo: "El Tablero Kanban",
            descripcion: "Como Desarrollador, el Tablero Kanban es tu herramienta principal durante el Sprint.",
            pasos: [
                "En la pestaña 'Tablero Kanban', selecciona el Sprint actual.",
                "Verás todas las historias distribuidas en cuatro columnas: Pendiente, En curso, En revision y Terminada."
            ],
            imagen: "/img/capacitacion-DEV/cap-dev-2.png", 
            pie: "Vista general del Tablero Kanban."
        },
        {
            titulo: "Actualizar estado de una historia",
            descripcion: "Es vital mantener el tablero actualizado para que el Burndown Chart refleje el progreso real.",
            pasos: [
                "Ve a la pestaña 'Sprint Backlog'.",
                "Busca la historia en la que vas a trabajar.",
                "Cambia su estado de 'Pendiente' a 'En curso'."
            ],
            imagen: "/img/capacitacion-DEV/cap-dev-3.png",
            pie: "Cambiando el estado de una historia."
        },
        {
            titulo: "Entregar y subir evidencias",
            descripcion: "Cuando terminas una historia, debes enviar la evidencia para que el Product Owner la apruebe.",
            pasos: [
                "Abre los detalles de tu historia terminada.",
                "Adjunta los archivos, capturas o documentos correspondientes.",
                "Cambia el estado de la historia."
            ],
            imagen: "/img/capacitacion-DEV/cap-dev-4.png",
            pie: "Subiendo evidencias a una historia."
        },
        {
            titulo: "Registrar horas de trabajo",
            descripcion: "Debes documentar el tiempo exacto que dedicas a cada una de tus historias asignadas.",
            pasos: [
                "Ve a la pestaña 'Tiempos'.",
                "En la sección 'Registrar horas', selecciona la historia en la que trabajaste.",
                "Ingresa la Fecha de trabajo y la Duración en horas (hasta 2 decimales).",
                "Presiona 'Registrar horas'."
            ],
            imagen: "/img/capacitacion-DEV/cap-dev-5.png",
            pie: "Formulario para el registro de horas de trabajo."
        },
        {
            titulo: "Revisar Avisos del equipo",
            descripcion: "La comunicación oficial del proyecto se maneja a través de los Avisos.",
            pasos: [
                "Ve a la pestaña 'Avisos'.",
                "Aquí podrás leer los mensajes publicados por el Scrum Master y el Product Owner.",
                "Asegúrate de marcar los mensajes como leídos."
            ],
            imagen: "/img/capacitacion-DEV/cap-dev-6.png",
            pie: "Consultando la sección de Avisos."
        }
    ];

    // ==================================================
    // LÁMINAS DE CAPACITACIÓN SCRUM MASTER
    // ==================================================
    const laminasScrumMaster = [
        {
            titulo: 'Crea un nuevo proyecto',
            descripcion: 'Desde Mis proyectos puedes registrar un proyecto nuevo. Quien lo crea queda automáticamente como su Scrum Master.',
            pie: 'Botón Nuevo proyecto en la pantalla Mis proyectos.',
            imagen: '/img/capacitacion-SM/01-nuevo-proyecto.png',
            pasos: [
                'Entra a Mis proyectos.',
                'Presiona el botón Nuevo proyecto.'
            ]
        },
        {
            titulo: 'Registra los datos del proyecto',
            descripcion: 'El formulario solicita la información básica del proyecto. Al guardarlo aparecerá en tu lista de proyectos con el rol Scrum Master.',
            pie: 'Formulario Nuevo proyecto.',
            imagen: '/img/capacitacion-SM/02-formulario-proyecto.png',
            pasos: [
                'Escribe el Nombre del proyecto.',
                'Describe el Objetivo que se busca alcanzar.',
                'Presiona Guardar proyecto.',
                'Selecciona el proyecto en Mis proyectos para abrirlo.'
            ]
        },
        {
            titulo: 'Invita usuarios al proyecto',
            descripcion: 'En la pestaña Menú principal, dentro de la sección Integrantes, puedes invitar a las cuentas registradas en Scrument para formar tu equipo.',
            pie: 'Formulario para invitar a un integrante.',
            imagen: '/img/capacitacion-SM/03-invitar-integrante.png',
            pasos: [
                'Presiona + Invitar integrante.',
                'Busca a la persona por su nombre o usuario.',
                'Selecciónala en la lista de usuarios.'
            ]
        },
        {
            titulo: 'Asigna el rol del integrante',
            descripcion: 'Cada invitación indica el rol que tendrá la persona dentro del proyecto. El rol solo aplica a este proyecto.',
            pie: 'Selector Rol en este proyecto y botón Enviar invitación.',
            imagen: '/img/capacitacion-SM/04-asignar-rol.png',
            pasos: [
                'En Rol en este proyecto, selecciona Product Owner o Desarrollador.',
                'Presiona Enviar invitación.'
            ]
        },
        {
            titulo: 'Da seguimiento a las invitaciones',
            descripcion: 'El usuario invitado tendrá acceso al proyecto hasta que acepte la invitación desde su pantalla Mis proyectos.',
            pie: 'Sección Invitaciones pendientes.',
            imagen: '/img/capacitacion-SM/05-invitacion-pendiente.png',
            pasos: [
                'Localiza la sección Invitaciones pendientes.',
                'Comprueba el usuario invitado y el rol que le asignaste.',
                'Cuando acepte la invitación, aparecerá en la lista de Integrantes.'
            ]
        },
        {
            titulo: 'Configura un Sprint',
            descripcion: 'Los Sprints son las iteraciones del proyecto y se administran en la sección Sprints de la pestaña Menú principal. Cada Sprint puede durar como máximo 31 días.',
            pie: 'Botón Configurar Sprint en la sección Sprints.',
            imagen: '/img/capacitacion-SM/06-configurar-sprint.png',
            pasos: [
                'Abre la pestaña Menú principal.',
                'Localiza la sección Sprints.',
                'Presiona Configurar Sprint.'
            ]
        },
        {
            titulo: 'Define los datos del Sprint',
            descripcion: 'Cada Sprint necesita un objetivo y un periodo de trabajo. La duración se calcula automáticamente a partir de las fechas.',
            pie: 'Formulario para configurar un Sprint.',
            imagen: '/img/capacitacion-SM/07-formulario-sprint.png',
            pasos: [
                'Escribe el Objetivo del Sprint.',
                'Selecciona la Fecha de inicio y la Fecha de fin.',
                'Comprueba que la Duración no supere los 31 días.',
                'Presiona Guardar Sprint.'
            ]
        },
        {
            titulo: 'Abre los avisos del proyecto',
            descripcion: 'La pestaña Avisos permite comunicar información importante a los integrantes del proyecto.',
            pie: 'Pestaña Avisos y botón Nuevo aviso.',
            imagen: '/img/capacitacion-SM/08-abrir-avisos.png',
            pasos: [
                'Abre la pestaña Avisos.',
                'Presiona + Nuevo aviso.'
            ]
        },
        {
            titulo: 'Publica un aviso para el equipo',
            descripcion: 'Describe el aviso, cambio o requisito que necesita conocer el equipo. Tus publicaciones aparecen en la columna Scrum Master.',
            pie: 'Formulario para publicar un aviso.',
            imagen: '/img/capacitacion-SM/09-formulario-aviso.png',
            pasos: [
                'Escribe el Título del aviso.',
                'Redacta el Contenido del aviso (hasta 5000 caracteres).',
                'Presiona Publicar aviso.'
            ]
        }
    ];

    const laminasPorRol = {
        'scrum-master': laminasScrumMaster,
        'product-owner': laminasProductOwner,
        'desarrollador': laminasDesarrollador
    };

    const tiposRegistro = {
        'scrum-master': 'SCRUM_MASTER',
        'product-owner': 'PRODUCT_OWNER',
        'desarrollador': 'DESARROLLADOR'
    };

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

    const elementos = [
        opciones, detalle, titulo, volver,
        espacio, contenido, imagen, pieImagen,
        tituloLamina, descripcion, listaPasos,
        contador, barra, anterior, siguiente,
        terminar, salir, mensaje
    ];

    if (elementos.some(elemento => !elemento)) {
        console.error('Faltan elementos HTML de capacitación.');
        return;
    }

    // ==================================================
    // ESTADO DE LA CAPACITACIÓN
    // ==================================================
    let indice = 0;
    let registrando = false;
    let estadoFinalizacion = 'inicial';
    let rolActivo = null; // Para saber qué rol se está guardando

    // ==================================================
    // MOSTRAR LÁMINA ACTUAL
    // ==================================================
    function mostrarLamina() {
        const lamina = laminasActuales[indice];

        imagen.src = lamina.imagen;
        imagen.alt = lamina.titulo;

        pieImagen.textContent = lamina.pie;
        tituloLamina.textContent = lamina.titulo;
        descripcion.textContent = lamina.descripcion;

        listaPasos.replaceChildren();
        lamina.pasos.forEach(paso => {
            const li = document.createElement('li');
            li.textContent = paso;
            listaPasos.appendChild(li);
        });

        contador.textContent = `Imagen ${indice + 1} de ${laminasActuales.length}`;
        barra.max = laminasActuales.length;
        barra.value = indice + 1;

        anterior.disabled = indice === 0;
        siguiente.hidden = indice === laminasActuales.length - 1;
        terminar.hidden = indice !== laminasActuales.length - 1;
        salir.hidden = false;

        mensaje.textContent = '';
        estadoFinalizacion = 'inicial';
        terminar.textContent = 'Terminar capacitación';
        terminar.disabled = false;
    }

    // ==================================================
    // ABRIR Y CERRAR CAPACITACIONES
    // ==================================================
    function mostrarCapacitacion(rol, actualizarUrl = true) {
        const valido = Object.prototype.hasOwnProperty.call(capacitaciones, rol);
        rolActivo = rol;

        opciones.hidden = valido;
        detalle.hidden = !valido;

        titulo.textContent = valido ? capacitaciones[rol] : '';

        if (valido) {
            espacio.hidden = true;
            contenido.hidden = false;

            // Asignamos el arreglo correcto
            laminasActuales = laminasPorRol[rol];

            indice = 0;
            mostrarLamina();

            titulo.focus();
        } else {
            espacio.hidden = false;
            contenido.hidden = true;
        }

        if (actualizarUrl) {
            const destino = valido ? `/capacitacion?rol=${encodeURIComponent(rol)}` : '/capacitacion';
            history.pushState({ rol: valido ? rol : null }, '', destino);
        }
    }

    // ==================================================
    // FINALIZAR CAPACITACIÓN Y REGISTRO BD
    // ==================================================
    async function finalizarCapacitacion() {
        if (registrando) return;

        if (estadoFinalizacion !== 'inicial') {
            mostrarCapacitacion(null);
            return;
        }

        registrando = true;
        terminar.disabled = true;
        mensaje.textContent = 'Registrando la capacitación...';

        // Definimos la variable a enviar según el rol
        const tipoRegistro = tiposRegistro[rolActivo];

        try {
            const respuesta = await fetch('/capacitaciones/completadas', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ tipoCapacitacion: tipoRegistro })
            });

            const resultado = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok) {
                throw new Error(resultado.mensaje || 'No se pudo registrar la capacitación.');
            }

            estadoFinalizacion = 'registrado';
            mensaje.textContent = 'Capacitación completada y registrada correctamente.';
            terminar.textContent = 'Salir';
            salir.hidden = true;

            window.dispatchEvent(new CustomEvent('scrument:capacitacion-completada', {
                detail: { tipoCapacitacion: tipoRegistro }
            }));

        } catch (error) {
            estadoFinalizacion = 'pendiente';
            mensaje.textContent = 'Has terminado la capacitación.';
            terminar.textContent = 'Salir';
            salir.hidden = true;
            console.warn('Registro de capacitación pendiente:', error.message);
        } finally {
            registrando = false;
            terminar.disabled = false;
        }
    }

    // ==================================================
    // EVENTOS
    // ==================================================
    document.querySelectorAll('[data-cap-rol]').forEach(tarjeta => {
        tarjeta.addEventListener('click', () => {
            mostrarCapacitacion(tarjeta.dataset.capRol);
        });
    });

    volver.addEventListener('click', () => mostrarCapacitacion(null));
    salir.addEventListener('click', () => mostrarCapacitacion(null));

    anterior.addEventListener('click', () => {
        if (indice > 0) {
            indice--;
            mostrarLamina();
        }
    });

    siguiente.addEventListener('click', () => {
        if (indice < laminasActuales.length - 1) {
            indice++;
            mostrarLamina();
        }
    });

    terminar.addEventListener('click', finalizarCapacitacion);

    window.addEventListener('popstate', () => {
        mostrarCapacitacion(new URLSearchParams(location.search).get('rol'), false);
    });

    mostrarCapacitacion(new URLSearchParams(location.search).get('rol'), false);

});