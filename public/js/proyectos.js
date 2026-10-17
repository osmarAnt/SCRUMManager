const lista = document.getElementById('lista-proyectos');
const plantilla = document.getElementById('plantilla-proyecto');
const estado = document.getElementById('estado-lista');
const tituloEstado = document.getElementById('titulo-estado');
const descripcionEstado = document.getElementById('descripcion-estado');
const conteo = document.getElementById('conteo-proyectos');
const nombreUsuario = document.getElementById('nombre-usuario');
const avatar = document.getElementById('avatar-usuario');
const botonActualizar = document.getElementById('actualizar-proyectos');

const mostrarEstado = (titulo, descripcion, tipo = '') => {
    lista.replaceChildren();
    lista.hidden = true;
    estado.hidden = false;
    estado.dataset.tipo = tipo;
    tituloEstado.textContent = titulo;
    descripcionEstado.textContent = descripcion;
};

const mostrarProyectos = (proyectos) => {
    lista.replaceChildren();
    conteo.textContent = `${proyectos.length} ${proyectos.length === 1 ? 'proyecto' : 'proyectos'}`;
    if (proyectos.length === 0) {
        mostrarEstado('Aún no tienes proyectos', 'Los proyectos a los que pertenezcas aparecerán aquí.');
        return;
    }
    proyectos.forEach((proyecto) => {
        const tarjeta = plantilla.content.cloneNode(true);
        tarjeta.querySelector('.nombre-proyecto').textContent = proyecto.nombre;
        tarjeta.querySelector('.objetivo-proyecto').textContent = proyecto.objetivo || 'Este proyecto todavía no tiene un objetivo registrado.';
        tarjeta.querySelector('.rol-proyecto').textContent = proyecto.rol;
        lista.appendChild(tarjeta);
    });
    estado.hidden = true;
    lista.hidden = false;
};

const cargarProyectos = async () => {
    botonActualizar.disabled = true;
    lista.setAttribute('aria-busy', 'true');
    conteo.textContent = '—';
    mostrarEstado('Cargando tus proyectos', 'Espera un momento.');
    try {
        const respuesta = await fetch('/proyectos/datos', {
            headers: {
                Accept: 'application/json'
            },
            cache: 'no-store'
        });
        if (respuesta.status === 401) {
            window.location.replace('/login');
            return;
        }
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(resultado.mensaje || 'No se pudieron cargar tus proyectos.');
        }
        const nombre = resultado.usuario.nombre;
        nombreUsuario.textContent = nombre;
        avatar.textContent = Array.from(nombre.trim())[0]?.toUpperCase() || 'S';
        mostrarProyectos(resultado.proyectos);
    } catch (error) {
        mostrarEstado('No pudimos cargar tus proyectos', 'Pulsa Actualizar para intentarlo de nuevo.', 'error');
    } finally {
        botonActualizar.disabled = false;
        lista.setAttribute('aria-busy', 'false');
    }
};

botonActualizar.addEventListener('click', cargarProyectos);

window.addEventListener('pageshow', cargarProyectos);

window.addEventListener('pagehide', () => {
    nombreUsuario.textContent = '';
    avatar.textContent = 'S';
    conteo.textContent = '—';
    mostrarEstado('Cargando tus proyectos', 'Espera un momento.');
});
