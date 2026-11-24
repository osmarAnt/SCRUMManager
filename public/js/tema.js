// PB-65 (Francisco): interruptor de tema claro / oscuro.
// Se carga en el <head> SIN defer para aplicar el tema guardado antes de pintar la página
// (así no hay un destello blanco al recargar en modo oscuro). La elección se guarda en el navegador.
(() => {
    'use strict';

    const CLAVE = 'scrument-tema';
    const raiz = document.documentElement;

    const leer = () => {
        try {
            return window.localStorage.getItem(CLAVE);
        } catch (error) {
            return null; // navegación privada o almacenamiento bloqueado
        }
    };

    const guardar = (tema) => {
        try {
            window.localStorage.setItem(CLAVE, tema);
        } catch (error) {
            // Si no se puede guardar, el tema solo dura mientras la página esté abierta.
        }
    };

    const aplicar = (tema) => {
        raiz.dataset.tema = tema === 'oscuro' ? 'oscuro' : 'claro';
    };

    aplicar(leer());

    const ICONO_LUNA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
    const ICONO_SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

    const pintarBoton = (boton) => {
        const oscuro = raiz.dataset.tema === 'oscuro';
        boton.setAttribute('aria-pressed', String(oscuro));
        boton.setAttribute('aria-label', oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
        boton.innerHTML = `${oscuro ? ICONO_SOL : ICONO_LUNA}<span>${oscuro ? 'Tema claro' : 'Tema oscuro'}</span>`;
    };

    document.addEventListener('DOMContentLoaded', () => {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'interruptor-tema';
        boton.id = 'interruptor-tema';
        boton.addEventListener('click', () => {
            const nuevo = raiz.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
            aplicar(nuevo);
            guardar(nuevo);
            pintarBoton(boton);
        });
        pintarBoton(boton);
        // En las vistas con menú lateral va arriba de "Cerrar sesión"; si no hay menú, flota en la esquina.
        const pie = document.querySelector('.pie-menu');
        if (pie) {
            pie.prepend(boton);
        } else {
            boton.classList.add('interruptor-tema--flotante');
            document.body.append(boton);
        }
    });

    // Si el tema cambia en otra pestaña del navegador, se sincroniza aquí también.
    window.addEventListener('storage', (evento) => {
        if (evento.key === CLAVE) {
            aplicar(evento.newValue);
            const boton = document.getElementById('interruptor-tema');
            if (boton) pintarBoton(boton);
        }
    });
})();
