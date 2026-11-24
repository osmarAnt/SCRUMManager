// Sprint 7 · Bloque 6 (Emmanuel) · HU-22: integración con GitHub.
//  - El Scrum Master vincula el repositorio del proyecto ("dueño/repositorio" o su URL).
//  - Cualquier integrante consulta el historial de commits (autor, fecha, mensaje) y la
//    participación de cada integrante (commits por autor).
// Usa la API pública de GitHub. Si el repositorio es privado, se arranca el servidor con
// la variable de entorno GITHUB_TOKEN (un token de solo lectura) y se envía en la consulta.
const proyectoDAO = require('../dao/proyectoDAO');

const API = 'https://api.github.com';
const VIGENCIA_CACHE_MS = 2 * 60 * 1000; // la API pública permite 60 consultas por hora
const cache = new Map();

const leerId = (valor) => (/^[1-9]\d{0,9}$/.test(String(valor)) ? Number(valor) : null);

// Acepta "dueño/repo", "https://github.com/dueño/repo" o ".../repo.git". Devuelve "dueño/repo" o null.
const normalizarRepositorio = (valor) => {
    if (typeof valor !== 'string') return null;
    const texto = valor.trim().replace(/\.git$/i, '').replace(/\/+$/, '');
    const coincidencia = /^(?:https?:\/\/(?:www\.)?github\.com\/)?([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})$/.exec(texto);
    return coincidencia ? `${coincidencia[1]}/${coincidencia[2]}` : null;
};

const consultarCommits = async (repositorio) => {
    const guardado = cache.get(repositorio);
    if (guardado && Date.now() - guardado.momento < VIGENCIA_CACHE_MS) {
        return guardado.datos;
    }
    const encabezados = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Scrument',
        'X-GitHub-Api-Version': '2022-11-28'
    };
    if (process.env.GITHUB_TOKEN) {
        encabezados.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const respuesta = await fetch(`${API}/repos/${repositorio}/commits?per_page=100`, {
        headers: encabezados,
        signal: AbortSignal.timeout(10000)
    });
    if (respuesta.status === 404) {
        return { error: 'GitHub no encontró ese repositorio. Revisa el nombre o, si es privado, arranca el servidor con GITHUB_TOKEN.' };
    }
    if (respuesta.status === 403 || respuesta.status === 429) {
        return { error: 'GitHub limitó las consultas por ahora (60 por hora sin token). Intenta en unos minutos.' };
    }
    if (respuesta.status === 409) {
        return { commits: [] }; // repositorio vacío
    }
    if (!respuesta.ok) {
        return { error: `GitHub respondió con un error (${respuesta.status}).` };
    }
    const lista = await respuesta.json();
    const commits = lista.map((commit) => ({
        sha: commit.sha.slice(0, 7),
        mensaje: (commit.commit?.message || '').split('\n')[0],
        autor: commit.commit?.author?.name || commit.author?.login || 'Desconocido',
        usuario_github: commit.author?.login || null,
        fecha: commit.commit?.author?.date || null,
        url: commit.html_url
    }));
    const datos = { commits };
    cache.set(repositorio, { momento: Date.now(), datos });
    return datos;
};

// Participación: commits por autor (TC-22-03).
const calcularParticipacion = (commits) => {
    const porAutor = new Map();
    commits.forEach((commit) => {
        const clave = commit.usuario_github || commit.autor;
        const actual = porAutor.get(clave) || { autor: commit.autor, usuario_github: commit.usuario_github, commits: 0, ultima: null };
        actual.commits += 1;
        if (!actual.ultima || (commit.fecha && commit.fecha > actual.ultima)) actual.ultima = commit.fecha;
        porAutor.set(clave, actual);
    });
    const total = commits.length || 1;
    return [...porAutor.values()]
        .map((persona) => ({ ...persona, porcentaje: Math.round((persona.commits / total) * 1000) / 10 }))
        .sort((a, b) => b.commits - a.commits);
};

// GET /proyectos/:id/github
const consultar = async (req, res) => {
    const idProyecto = leerId(req.params.id);
    try {
        const rol = idProyecto ? await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario) : null;
        if (!rol) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        const repositorio = await proyectoDAO.obtenerRepositorio(idProyecto);
        const base = { repositorio, puedeConfigurar: rol === 'Scrum Master' };
        if (!repositorio) {
            return res.json({ ...base, commits: [], participacion: [] });
        }
        let resultado;
        try {
            resultado = await consultarCommits(repositorio);
        } catch (error) {
            console.error('No se pudo consultar GitHub:', error.message);
            resultado = { error: 'No se pudo conectar con GitHub. Revisa la conexión a internet.' };
        }
        if (resultado.error) {
            return res.json({ ...base, commits: [], participacion: [], error: resultado.error });
        }
        res.json({
            ...base,
            commits: resultado.commits,
            participacion: calcularParticipacion(resultado.commits),
            consultado: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error en la integración con GitHub:', error.code || error.message);
        res.status(500).json({ mensaje: 'No se pudo consultar el repositorio.' });
    }
};

// PUT /proyectos/:id/github — solo el Scrum Master vincula (o quita, con texto vacío) el repositorio.
const vincular = async (req, res) => {
    const idProyecto = leerId(req.params.id);
    try {
        const rol = idProyecto ? await proyectoDAO.obtenerRolEnProyecto(idProyecto, req.session.idUsuario) : null;
        if (!rol) {
            return res.status(404).json({ mensaje: 'No encontramos ese proyecto.' });
        }
        if (rol !== 'Scrum Master') {
            return res.status(403).json({ mensaje: 'Solo el Scrum Master puede vincular el repositorio.' });
        }
        const texto = typeof req.body?.repositorio === 'string' ? req.body.repositorio.trim() : '';
        const repositorio = texto ? normalizarRepositorio(texto) : null;
        if (texto && !repositorio) {
            return res.status(400).json({ mensaje: 'Escribe el repositorio como dueño/repositorio o pega su URL de GitHub.' });
        }
        await proyectoDAO.guardarRepositorio(idProyecto, repositorio);
        if (repositorio) cache.delete(repositorio);
        res.json({
            mensaje: repositorio ? `Repositorio ${repositorio} vinculado.` : 'Se quitó el repositorio del proyecto.',
            repositorio
        });
    } catch (error) {
        console.error('Error al vincular el repositorio:', error.code || error.message);
        res.status(500).json({ mensaje: 'No se pudo guardar el repositorio.' });
    }
};

module.exports = { consultar, vincular, normalizarRepositorio, calcularParticipacion };
