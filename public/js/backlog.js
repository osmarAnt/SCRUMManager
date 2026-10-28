// public/js/backlog.js
const idProyectoBacklog = window.location.pathname
    .split('/')
    .filter(Boolean)[1];
let rolActual = ''; 
let listaHistorias = []; 
let idHistoriaEditando = null; 
let idHistoriaCriteriosActual = null; // Guarda el ID de la historia cuyos criterios estamos viendo

document.addEventListener('DOMContentLoaded', async () => {
    const idProyecto = idProyectoBacklog; 

    await obtenerRolUsuario();
    
    if (rolActual !== 'Product Owner') {
        const contenedorFormulario = document.getElementById('contenedor-formulario'); 
        if (contenedorFormulario) {
            contenedorFormulario.style.display = 'none';
        }
    }

    cargarHistorias(idProyecto);

    const formulario = document.getElementById('formulario-crear-historia');
    if (formulario) {
        formulario.addEventListener('submit', (evento) => guardarHistoria(evento, idProyecto));
    }

    const formCriterio = document.getElementById('form-crear-criterio');
    if (formCriterio) {
        formCriterio.addEventListener('submit', (evento) => guardarCriterio(evento));
    }
});

async function obtenerRolUsuario() {
    try {
        const respuesta = await fetch(
            `/proyectos/${idProyectoBacklog}/datos`,
            {
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            }
        );
        if (respuesta.status === 401) {
            window.location.replace('/login');
            return;
        }
        if (respuesta.ok) {
            const datos = await respuesta.json();
            rolActual = datos.rol;
        } else {
            console.warn(
                'No se pudo obtener el rol del proyecto.'
            );
        }
    } catch (error) {
        console.error(
            'Error al consultar el rol:',
            error
        );
    }
}

async function cargarHistorias(idProyecto) {
    try {
        const respuesta = await fetch(`/backlog/${idProyecto}`);
        if (!respuesta.ok) throw new Error('Error al obtener el backlog');
        
        listaHistorias = await respuesta.json();
        mostrarEnTabla(listaHistorias);
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar las historias del servidor.');
    }
}

function mostrarEnTabla(historias) {
    const tbody = document.getElementById(
        'tabla-backlog-body'
    );
    if (!tbody) return;
    tbody.replaceChildren();
    const crearCelda = (texto) => {
        const td = document.createElement('td');
        td.textContent = String(texto);
        return td;
    };
    historias.forEach((historia) => {
        const fila = document.createElement('tr');
        fila.dataset.idHistoria = historia.id_historia;
        const valor = historia.valor_negocio;
        const esfuerzo = Number(historia.puntos);

        fila.appendChild(
            crearCelda(historia.titulo)
        );

        fila.appendChild(
            crearCelda(historia.descripcion)
        );

        fila.appendChild(
            crearCelda(
                historia.puntos ?? 'Sin estimar'
            )
        );
        const celdaValor = document.createElement('td');
        if (rolActual === 'Product Owner') {
            const accionesValor =
                document.createElement('div');
            accionesValor.className =
                'acciones-valor-negocio';
            const entrada = document.createElement('input');
            entrada.type = 'number';
            entrada.min = '1';
            entrada.max = '100';
            entrada.step = '1';
            entrada.value = valor ?? '';
            entrada.className = 'campo-valor-negocio';
            entrada.setAttribute(
                'aria-label',
                `Valor de negocio de ${historia.titulo}`
            );
            const guardar = document.createElement('button');
            guardar.type = 'button';
            guardar.textContent = 'Guardar valor';
            guardar.addEventListener('click', async () => {
                const numero = Number(entrada.value);
                if (
                    !entrada.value.trim() ||
                    !Number.isInteger(numero) ||
                    numero < 1 ||
                    numero > 100
                ) {
                    alert(
                        'El valor de negocio debe ser un número entero entre 1 y 100.'
                    );
                    return;
                }
                guardar.disabled = true;
                try {
                    const respuesta = await fetch(
                        `/backlog/${idProyectoBacklog}/historias/${historia.id_historia}/valor-negocio`,
                        {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                Accept: 'application/json'
                            },
                            body: JSON.stringify({
                                valor_negocio: numero
                            })
                        }
                    );
                    const datos = await respuesta.json();
                    if (!respuesta.ok) {
                        alert(
                            datos.mensaje ||
                            'No se pudo guardar el valor.'
                        );
                        return;
                    }
                    await cargarHistorias(idProyectoBacklog);
                } catch (error) {
                    console.error(error);
                    alert(
                        'No se pudo conectar con el servidor.'
                    );
                } finally {
                    guardar.disabled = false;
                }
            });
            accionesValor.append(
                entrada,
                guardar
            );
            celdaValor.appendChild(accionesValor);
        } else {
            celdaValor.textContent =
                valor ?? 'Sin asignar';
        }
        fila.appendChild(celdaValor);
        const relacion =
            valor != null &&
            Number.isFinite(esfuerzo) &&
            esfuerzo > 0
                ? (Number(valor) / esfuerzo).toFixed(2)
                : '—';
        fila.appendChild(
            crearCelda(relacion)
        );
        fila.appendChild(
            crearCelda(historia.prioridad)
        );
        const acciones = document.createElement('td');
        const criterios = document.createElement('button');
        criterios.type = 'button';
        criterios.textContent = 'Criterios';
        criterios.className = 'boton-secundario';
        criterios.addEventListener('click', () => {
            verCriterios(
                historia.id_historia,
                historia.titulo
            );
        });
        acciones.appendChild(criterios);
        if (rolActual === 'Product Owner') {
            const editar = document.createElement('button');
            editar.type = 'button';
            editar.textContent = 'Editar';
            editar.className = 'boton-secundario';
            editar.addEventListener('click', () => {
                prepararEdicion(historia.id_historia);
            });
            const eliminar = document.createElement('button');
            eliminar.type = 'button';
            eliminar.textContent = 'Eliminar';
            eliminar.className = 'btn-eliminar';
            eliminar.addEventListener('click', () => {
                eliminarHistoria(historia.id_historia);
            });
            acciones.append(
                editar,
                eliminar
            );
        }
        fila.appendChild(acciones);
        tbody.appendChild(fila);
    });
}

function prepararEdicion(idHistoria) {
    const historia = listaHistorias.find(h => h.id_historia === idHistoria);
    if (!historia) return;

    document.getElementById('titulo').value = historia.titulo;
    document.getElementById('descripcion').value = historia.descripcion;
    document.getElementById('puntos').value = historia.puntos || '';
    document.getElementById('prioridad').value = historia.prioridad;

    idHistoriaEditando = idHistoria;
    
    const botonSubmit = document.querySelector('#formulario-crear-historia button[type="submit"]');
    if(botonSubmit) botonSubmit.textContent = 'Actualizar Historia';
    
    const tituloSeccion = document.getElementById('titulo-backlog');
    if(tituloSeccion) tituloSeccion.textContent = 'Editar Historia';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function guardarHistoria(evento, idProyecto) {
    evento.preventDefault();

    const titulo = document.getElementById('titulo').value;
    const descripcion = document.getElementById('descripcion').value;
    const puntos = document.getElementById('puntos').value;
    const prioridad = document.getElementById('prioridad').value;

    const datosHistoria = {
        id_proyecto: idProyecto,
        titulo,
        descripcion,
        puntos: puntos ? parseInt(puntos) : null,
        prioridad
    };

    let url = '/backlog';
    let metodo = 'POST';

    if (idHistoriaEditando !== null) {
        url = `/backlog/${idHistoriaEditando}`; 
        metodo = 'PUT'; 
    }

    try {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosHistoria)
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.error || 'Error al guardar la historia');
            return;
        }

        alert(idHistoriaEditando ? 'Historia actualizada con éxito' : 'Historia creada con éxito');
        
        document.getElementById('formulario-crear-historia').reset();
        idHistoriaEditando = null;
        
        const botonSubmit = document.querySelector('#formulario-crear-historia button[type="submit"]');
        if(botonSubmit) botonSubmit.textContent = 'Guardar en Backlog';
        
        const tituloSeccion = document.getElementById('titulo-backlog');
        if(tituloSeccion) tituloSeccion.textContent = 'Creación de Historias';
        
        cargarHistorias(idProyecto); 

    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor al guardar la historia.');
    }
}

async function eliminarHistoria(idHistoria) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta historia?')) return;

    try {
        const respuesta = await fetch(`/backlog/${idHistoria}`, {
            method: 'DELETE'
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.error || 'Error al eliminar la historia');
            return;
        }

        alert('Historia eliminada');
        
        const idProyecto = idProyectoBacklog;
        cargarHistorias(idProyecto);

    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor al intentar eliminar.');
    }
}

// --- FUNCIONES PARA CRITERIOS DE ACEPTACIÓN ---

async function verCriterios(idHistoria, tituloHistoria) {
    idHistoriaCriteriosActual = idHistoria;
    const panel = document.getElementById('panel-criterios');
    const tituloPanel = document.getElementById('titulo-criterios-historia');
    
    if(tituloPanel) tituloPanel.textContent = `Criterios para: ${tituloHistoria}`;
    if(panel) panel.style.display = 'block';

    // Ocultar formulario de creación de criterios si no es Product Owner
    const formCriterio = document.getElementById('form-crear-criterio');
    if (formCriterio) {
        formCriterio.style.display = (rolActual === 'Product Owner') ? 'block' : 'none';
    }

    await cargarCriterios(idHistoria);
    panel.scrollIntoView({ behavior: 'smooth' });
}

async function cargarCriterios(idHistoria) {
    try {
        const respuesta = await fetch(`/backlog/criterios/${idHistoria}`);
        if (!respuesta.ok) throw new Error('Error al obtener criterios');
        
        const criterios = await respuesta.json();
        const lista = document.getElementById('lista-criterios');
        if (!lista) return;

        lista.innerHTML = '';
        if (criterios.length === 0) {
            lista.innerHTML = '<p class="ayuda-campo">No hay criterios de aceptación registrados para esta historia.</p>';
            return;
        }

        criterios.forEach(c => {
            const li = document.createElement('li');
            li.style.padding = '8px 12px';
            li.style.margin = '5px 0';
            li.style.background = '#f6f8fa';
            li.style.borderLeft = '4px solid #0366d6';
            li.style.borderRadius = '3px';
            li.textContent = c.descripcion;
            lista.appendChild(li);
        });
    } catch (error) {
        console.error('Error al cargar criterios:', error);
    }
}

async function guardarCriterio(evento) {
    evento.preventDefault();
    if (!idHistoriaCriteriosActual) return;

    const descripcion = document.getElementById('desc-criterio').value;

    try {
        const respuesta = await fetch('/backlog/criterios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_historia: idHistoriaCriteriosActual, descripcion })
        });

        const datos = await respuesta.json();
        if (!respuesta.ok) {
            alert(datos.error || 'Error al guardar el criterio');
            return;
        }

        document.getElementById('desc-criterio').value = '';
        await cargarCriterios(idHistoriaCriteriosActual);
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor.');
    }
}

function cerrarPanelCriterios() {
    const panel = document.getElementById('panel-criterios');
    if(panel) panel.style.display = 'none';
    idHistoriaCriteriosActual = null;
}