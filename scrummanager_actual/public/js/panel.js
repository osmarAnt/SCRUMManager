const cargarUsuario = async () => {
    try {
        const respuesta = await fetch('/login/usuario', { cache: 'no-store' });
        if (!respuesta.ok) {
            window.location.replace('/login');
            return;
        }
        const usuario = await respuesta.json();
        if (usuario.rol !== document.body.dataset.rol) {
            window.location.replace('/login');
            return;
        }
        document.getElementById('nombre-usuario').textContent = usuario.nombre;
        document.body.hidden = false;
    } catch (error) {
        window.location.replace('/login');
    }
};

window.addEventListener('pageshow', cargarUsuario);

window.addEventListener('pagehide', () => {
    document.body.hidden = true;
});
