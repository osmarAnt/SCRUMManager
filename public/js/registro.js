const formulario = document.getElementById('form-registro');
const mensajeError = document.getElementById('mensaje-error');
const boton = formulario.querySelector('button');

formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    mensajeError.textContent = '';
    boton.disabled = true;
    boton.textContent = 'Creando cuenta...';
    const datos = new URLSearchParams(new FormData(formulario));
    fetch('/registro', {
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
            mensajeError.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
        })
        .finally(() => {
            boton.disabled = false;
            boton.textContent = 'Crear cuenta';
        });
});
