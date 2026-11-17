// public/js/reporte.js
// OSMAR: PB-43 (Generar reporte de avance en PDF) y PB-44 (Descargar reporte)

document.addEventListener('DOMContentLoaded', () => {
    const btnReporte = document.getElementById('generar-reporte-pdf');
    if (!btnReporte) return;

    // Extraer id_proyecto de la URL (/proyectos/1)
    const partesRuta = window.location.pathname.split('/');
    const idProyecto = partesRuta[partesRuta.length - 1];

    // Verificar rol en el proyecto para mostrar el botón solo al Scrum Master
    verificarPermisoReporte(idProyecto, btnReporte);

    btnReporte.addEventListener('click', () => generarYDescargarPDF(idProyecto, btnReporte));
});

async function verificarPermisoReporte(idProyecto, btnReporte) {
    try {
        const res = await fetch(`/proyectos/${idProyecto}/datos`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });
        if (!res.ok) return;
        const datos = await res.json();

        if (datos.rol === 'Scrum Master') {
            btnReporte.hidden = false;
        }
    } catch (error) {
        console.error('Error al verificar rol para reporte PDF:', error);
    }
}

function calcularPorcentajeAvance(estado) {
    switch (estado) {
        case 'Aprobada':
        case 'Terminada':
            return '100%';
        case 'En revision':
            return '80%';
        case 'En curso':
            return '50%';
        case 'Rechazada':
            return '25%';
        case 'Pendiente':
        default:
            return '0%';
    }
}

async function generarYDescargarPDF(idProyecto, btnReporte) {
    const textoOriginal = btnReporte.innerHTML;
    btnReporte.disabled = true;
    btnReporte.textContent = 'Generando PDF...';

    try {
        // 1. Consultar datos generales del proyecto, sprints e integrantes
        const [resDatos, resBacklog, resIntegrantes] = await Promise.all([
            fetch(`/proyectos/${idProyecto}/datos`, { headers: { Accept: 'application/json' } }),
            fetch(`/backlog/${idProyecto}`, { headers: { Accept: 'application/json' } }),
            fetch(`/proyectos/${idProyecto}/integrantes`, { headers: { Accept: 'application/json' } }).catch(() => null)
        ]);

        if (!resDatos.ok || !resBacklog.ok) {
            throw new Error('No se pudieron obtener los datos del proyecto.');
        }

        const datosProyecto = await resDatos.json();
        const historias = await resBacklog.json();
        
        // Mapear nombres de integrantes por id_usuario para mostrar el responsable
        const mapaUsuarios = {};
        if (resIntegrantes && resIntegrantes.ok) {
            const listaInt = await resIntegrantes.json();
            const integrantes = Array.isArray(listaInt) ? listaInt : (listaInt.integrantes || []);
            integrantes.forEach(u => {
                mapaUsuarios[u.id_usuario] = u.nombre;
            });
        }

        const proyecto = datosProyecto.proyecto;
        const sprints = datosProyecto.sprints || [];

        // Mapear Sprints por ID
        const mapaSprints = {};
        sprints.forEach(s => {
            mapaSprints[s.id_sprint] = `Sprint ${s.numero} (${s.estado})`;
        });

        // Cálculos globales de avance
        const totalPuntos = historias.reduce((acc, h) => acc + (Number(h.puntos) || 0), 0);
        const puntosCompletados = historias
            .filter(h => h.estado_historia === 'Aprobada' || h.estado_historia === 'Terminada')
            .reduce((acc, h) => acc + (Number(h.puntos) || 0), 0);
        const porcentajeGlobal = totalPuntos > 0 ? Math.round((puntosCompletados / totalPuntos) * 100) : 0;

        // 2. Inicializar jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const fechaHoy = new Date().toLocaleDateString('es-MX', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Encabezado del documento
        doc.setFillColor(24, 54, 97);
        doc.rect(0, 0, 210, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Scrument - Reporte de Avance del Proyecto', 14, 15);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado el ${fechaHoy}`, 14, 22);

        // Información general del proyecto
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(proyecto.nombre || 'Proyecto sin nombre', 14, 38);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const objetivoLineas = doc.splitTextToSize(`Objetivo: ${proyecto.objetivo || 'Sin objetivo definido.'}`, 180);
        doc.text(objetivoLineas, 14, 45);

        let yActual = 45 + (objetivoLineas.length * 5) + 4;

        // Resumen ejecutivo
        doc.setFillColor(244, 246, 249);
        doc.roundedRect(14, yActual, 182, 18, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text(`Sprints: ${sprints.length}`, 20, yActual + 7);
        doc.text(`Historias: ${historias.length}`, 65, yActual + 7);
        doc.text(`Puntos: ${puntosCompletados} / ${totalPuntos} pts`, 110, yActual + 7);
        doc.text(`Avance general: ${porcentajeGlobal}%`, 155, yActual + 7);

        yActual += 26;

        // 3. Tabla de Sprints
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('1. Resumen de Sprints', 14, yActual);

        const filasSprints = sprints.length > 0
            ? sprints.map(s => [
                `Sprint ${s.numero}`,
                s.objetivo || '—',
                `${s.fecha_inicio} al ${s.fecha_fin}`,
                s.estado
            ])
            : [['—', 'No hay Sprints registrados en este proyecto', '—', '—']];

        doc.autoTable({
            startY: yActual + 4,
            head: [['Sprint', 'Objetivo', 'Periodo', 'Estado']],
            body: filasSprints,
            theme: 'grid',
            headStyles: { fillColor: [24, 54, 97] },
            styles: { fontSize: 9 }
        });

        yActual = doc.lastAutoTable.finalY + 12;

        // 4. Tabla de Historias, Estados, Puntos, Avance y Responsables
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. Detalle de Historias y Avance', 14, yActual);

        const filasHistorias = historias.length > 0
            ? historias.map(h => {
                const responsable = h.nombre_responsable 
                    || mapaUsuarios[h.id_responsable] 
                    || 'Sin asignar';
                const sprintNombre = h.id_sprint ? (mapaSprints[h.id_sprint] || `Sprint #${h.id_sprint}`) : 'Backlog';
                const estado = h.estado_historia || 'Pendiente';
                const puntos = h.puntos !== null ? `${h.puntos} pts` : '0 pts';
                const avance = calcularPorcentajeAvance(estado);

                return [
                    h.titulo,
                    sprintNombre,
                    responsable,
                    estado,
                    puntos,
                    avance
                ];
            })
            : [['No hay historias registradas', '—', '—', '—', '—', '—']];

        doc.autoTable({
            startY: yActual + 4,
            head: [['Historia', 'Ubicación', 'Responsable', 'Estado', 'Puntos', 'Avance']],
            body: filasHistorias,
            theme: 'striped',
            headStyles: { fillColor: [24, 54, 97] },
            styles: { fontSize: 8.5 },
            columnStyles: {
                0: { cellWidth: 52 },
                4: { halign: 'center' },
                5: { halign: 'center' }
            }
        });

        // 5. Descargar archivo con nombre limpio del proyecto (PB-44)
        const nombreLimpio = (proyecto.nombre || 'Proyecto')
            .trim()
            .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_');
        
        doc.save(`Reporte_${nombreLimpio}.pdf`);

    } catch (error) {
        console.error('Error al generar el reporte PDF:', error);
        alert('Ocurrió un error al generar el reporte PDF del proyecto.');
    } finally {
        btnReporte.disabled = false;
        btnReporte.innerHTML = textoOriginal;
    }
}