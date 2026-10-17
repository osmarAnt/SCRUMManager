const formulario = document.getElementById('form-login');
const mensajeError = document.getElementById('mensaje-error');
const mensajeConfirmacion = document.getElementById('mensaje-confirmacion');
const boton = formulario.querySelector('button');
const parametros = new URLSearchParams(window.location.search);

if (parametros.get('registro') === 'correcto') {
    mensajeConfirmacion.textContent = 'Cuenta creada correctamente. Ya puedes iniciar sesión.';
    mensajeConfirmacion.hidden = false;
} else if (parametros.get('sesion') === 'cerrada') {
    mensajeConfirmacion.textContent = 'Cerraste sesión correctamente.';
    mensajeConfirmacion.hidden = false;
}

formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    mensajeError.textContent = '';
    boton.disabled = true;
    boton.textContent = 'Entrando...';
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
            window.location.replace(resultado.redireccion);
        })
        .catch(error => {
            console.error(error);
            mensajeError.textContent = 'No se pudo iniciar sesión';
        })
        .finally(() => {
            boton.disabled = false;
            boton.textContent = 'Iniciar sesión';
        });
});
