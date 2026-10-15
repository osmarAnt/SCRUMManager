const formulario = document.getElementById('form-login');
const mensajeError = document.getElementById('mensaje-error');

formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    mensajeError.textContent = '';
    const datos = new URLSearchParams();
    datos.append(
        'username',
        document.getElementById('username').value
    );
    datos.append(
        'password',
        document.getElementById('password').value
    );
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: datos
    })
        .then(async respuesta => {
            const resultado = await respuesta.json();
            if (!respuesta.ok) {
                mensajeError.textContent = resultado.mensaje;
                return;
            }
            window.location.href = resultado.redireccion;
        })
        .catch(error => {
            console.error(error);
            mensajeError.textContent = 'No se pudo iniciar sesión';
        });
});
