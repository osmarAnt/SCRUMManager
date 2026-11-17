// public/js/kanban.js

document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('panel-kanban');
  const selector = document.getElementById('select-sprint-kanban');
  const mensaje = document.getElementById('mensaje-kanban');
  const botonActualizar = document.getElementById('actualizar-kanban');
  const idProyecto = location.pathname.match(/\/proyectos\/(\d+)(?:\/|$)/)?.[1] || new URLSearchParams(location.search).get('id_proyecto');

  if (!panel || !selector) return;

  const config = {
    'Pendiente': { id: 'pendiente', color: '#ffdde3' },
    'En curso': { id: 'en-curso', color: '#dbeafe' },
    'En revision': { id: 'en-revision', color: '#fff0b3' },
    'Aprobada': { id: 'terminada', color: '#d7f5df' }
  };

  let numeroConsulta = 0;

  const avisar = (texto, error = false) => {
    if (mensaje) {
      mensaje.textContent = texto;
      mensaje.style.color = error ? '#b42332' : '#305070';
    }
  };

  const columnaDe = estado => {
    if (estado === 'Pendiente') return 'Pendiente';
    if (estado === 'En revision') return 'En revision';
    if (estado === 'Aprobada') return 'Aprobada';
    return 'En curso';
  };

  const etiquetaEstado = estado => ({
    'Terminada': 'Trabajo listo para revisión',
    'En revision': 'Esperando revisión del Product Owner',
    'Aprobada': 'Aprobada',
    'Rechazada': 'Rechazada: requiere correcciones'
  })[estado] || estado;

  async function pedir(url) {
    const respuesta = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (respuesta.status === 401) {
      location.replace('/login');
      throw new Error('Tu sesión terminó. Inicia sesión nuevamente.');
    }

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || datos.error || `Error HTTP ${respuesta.status}`);
    }

    return datos;
  }

  // ABRIR HISTORIA EN PRODUCT BACKLOG
 async function abrirHistoria(historia) {
  const idHistoria = Number(historia.id_historia);
  const idSprint = Number(historia.id_sprint || selector.value);

  if (!idHistoria || !idSprint) {
    return avisar('No se pudo identificar la historia.', true);
  }

  try {
    const datos = await pedir(`/proyectos/${idProyecto}/datos`);
    const rol = datos.rol;

    if (!['Desarrollador', 'Product Owner', 'Scrum Master'].includes(rol)) {
      return avisar('No tienes acceso a esta historia.', true);
    }

    if (rol === 'Product Owner') {
      const estadosRevision = ['En revision', 'Aprobada', 'Rechazada'];

      if (!estadosRevision.includes(historia.estado_historia)) {
        return avisar('Esta historia todavía no ha sido enviada a revisión.', true);
      }

      document.getElementById('pestana-menu')?.click();

      document.dispatchEvent(new CustomEvent('kanban-ir-a-revision', {
        detail: { idHistoria }
      }));

      return;
    }

    document.getElementById('pestana-menu')?.click();

    document.dispatchEvent(new CustomEvent('kanban-ir-a-historia', {
      detail: { idHistoria, idSprint, rol }
    }));

  } catch (error) {
    console.error(error);
    avisar('No se pudo abrir la historia.', true);
  }
}

  // DIBUJAR TARJETAS
  function dibujarKanban(historias) {
    const conteos = {
      'Pendiente': 0,
      'En curso': 0,
      'En revision': 0,
      'Aprobada': 0
    };

    Object.values(config).forEach(info => {
      document.getElementById(`tarjetas-${info.id}`)?.replaceChildren();

      const contador = document.getElementById(`contador-${info.id}`);
      if (contador) contador.textContent = '0';
    });

    historias.forEach(historia => {
      const estado = columnaDe(historia.estado_historia);
      const info = config[estado];
      const destino = document.getElementById(`tarjetas-${info.id}`);

      if (!destino) return;

      const tarjeta = document.createElement('article');
      tarjeta.className = 'kanban-tarjeta';
      tarjeta.draggable = false;
      tarjeta.tabIndex = 0;
      tarjeta.setAttribute('role', 'button');
      tarjeta.setAttribute('aria-label', `Ver historia: ${historia.titulo}`);
      tarjeta.title = 'Doble clic para abrir la historia';

      tarjeta.style.cssText = `
        background:${info.color};
        cursor:pointer;
        border-radius:8px;
        padding:14px;
      `;

      const titulo = document.createElement('h4');
      titulo.textContent = historia.titulo;

      const responsable = document.createElement('p');
      responsable.textContent = `${historia.nombre_responsable || 'Sin asignar'} · ${historia.puntos ?? '—'} pts`;

      const detalle = document.createElement('small');
      detalle.textContent = `${etiquetaEstado(historia.estado_historia)} · Prioridad: ${historia.prioridad || 'Media'}`;

      tarjeta.append(titulo, responsable, detalle);

      // DOBLE CLIC PARA IR A LA HISTORIA
      tarjeta.addEventListener('dblclick', () => {
        abrirHistoria(historia);
      });

      // TAMBIÉN PERMITE ABRIR CON ENTER
      tarjeta.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          abrirHistoria(historia);
        }
      });

      destino.appendChild(tarjeta);
      conteos[estado]++;
    });

    Object.entries(config).forEach(([estado, info]) => {
      const contador = document.getElementById(`contador-${info.id}`);
      if (contador) contador.textContent = String(conteos[estado]);
    });
  }

  // CARGAR HISTORIAS DEL SPRINT
  async function cargarKanban(idSprint) {
    const consulta = ++numeroConsulta;

    if (!idSprint) {
      dibujarKanban([]);
      return;
    }

    try {
      avisar('Cargando historias...');

      const historias = await pedir(`/backlog/kanban/${idSprint}`);

      if (consulta !== numeroConsulta || String(idSprint) !== selector.value) {
        return;
      }

      if (!Array.isArray(historias)) {
        throw new Error('El servidor no devolvió una lista de historias.');
      }

      dibujarKanban(historias);
      avisar(`${historias.length} historias. Haz doble clic en una tarjeta para verla en Backlog.`);

    } catch (error) {
      console.error(error);
      if (consulta === numeroConsulta) {
        avisar(`Error al cargar historias: ${error.message}`, true);
      }
    }
  }

  // CARGAR SPRINTS DEL PROYECTO
  async function cargarSprints() {
    if (!idProyecto) {
      return avisar('No se encontró el ID del proyecto.', true);
    }

    const anterior = selector.value;
    selector.disabled = true;

    try {
      avisar('Cargando Sprints...');

      const datos = await pedir(`/proyectos/${idProyecto}/datos`);

      if (!Array.isArray(datos.sprints)) {
        throw new Error('El servidor no devolvió los Sprints.');
      }

      const sprints = datos.sprints;

      selector.replaceChildren(
        new Option(
          sprints.length ? 'Selecciona un Sprint' : 'No hay Sprints configurados',
          ''
        )
      );

      sprints.forEach(sprint => {
        selector.add(
          new Option(
            `Sprint ${sprint.numero}: ${sprint.objetivo}`,
            String(sprint.id_sprint)
          )
        );
      });

      selector.value = sprints.some(s => String(s.id_sprint) === anterior)
        ? anterior
        : String(sprints[0]?.id_sprint || '');

      await cargarKanban(selector.value);

      if (!sprints.length) {
        avisar('Este proyecto todavía no tiene Sprints.');
      }

    } catch (error) {
      console.error(error);
      selector.replaceChildren(new Option('Error al cargar Sprints', ''));
      dibujarKanban([]);
      avisar(`Error al cargar Sprints: ${error.message}`, true);
    } finally {
      selector.disabled = false;
    }
  }

  // EVENTOS
  selector.addEventListener('change', () => {
    cargarKanban(selector.value);
  });

  botonActualizar?.addEventListener('click', cargarSprints);

  document.addEventListener('pestana-activa', e => {
    if (e.detail?.id === 'kanban') {
      cargarSprints();
    }
  });

  cargarSprints();
});