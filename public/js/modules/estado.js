// ==================== MÓDULO DE CAMBIO DE ESTADO ====================

import { API_CLIENTES, API_SERVICIOS, API_EQUIPOS } from '../config.js';
import { mostrarModalCarga, cerrarModalCarga, mostrarNotificacionExito } from '../ui.js';

// ==================== FUNCIONES PÚBLICAS ====================

/**
 * Obtener estados permitidos según estado actual
 */
export function obtenerEstadosPermitidos(estadoActual) {
    const transiciones = {
        'Pendiente': ['En diagnóstico'],
        'Pendiente de evaluación': ['En diagnóstico'],
        'En diagnóstico': ['En reparación'],
        'En reparación': ['Completado'],
        'Completado': ['Entregado'],
        'Entregado': [],
        'Diagnosticado': ['En reparación']
    };
    
    return transiciones[estadoActual] || [];
}

/**
 * Abrir modal para cambiar estado
 */
export async function abrirModalCambiarEstado(servicioId) {
    try {
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => s._id === servicioId);
        
        if (!servicio) {
            alert('Servicio no encontrado');
            return;
        }
        
        // Por ahora, mostrar alert simple
        const estadosPermitidos = obtenerEstadosPermitidos(servicio.estado);
        
        if (estadosPermitidos.length === 0) {
            alert('Este servicio ya está en estado final');
            return;
        }
        
        const nuevoEstado = prompt(
            `Estado actual: ${servicio.estado}\n\nSelecciona el nuevo estado:\n${estadosPermitidos.join('\n')}`,
            estadosPermitidos[0]
        );
        
        if (!nuevoEstado || !estadosPermitidos.includes(nuevoEstado)) {
            return;
        }
        
        await cambiarEstadoServicio(servicioId, nuevoEstado);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar estado: ' + error.message);
    }
}

/**
 * Cambiar estado del servicio
 */
export async function cambiarEstadoServicio(servicioId, nuevoEstado, datosAdicionales = '') {
    try {
        mostrarModalCarga('Cambiando estado...');
        
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => s._id === servicioId);
        
        if (!servicio) throw new Error('Servicio no encontrado');
        
        const actualizacion = {
            ...servicio,
            estado: nuevoEstado
        };
        
        // Agregar timestamps según transición
        const ahora = new Date().toLocaleString();
        switch(nuevoEstado) {
            case 'En diagnóstico':
                actualizacion.fecha_inicio_diagnostico = ahora;
                break;
            case 'En reparación':
                actualizacion.fecha_inicio_reparacion = ahora;
                if (datosAdicionales) {
                    actualizacion.datos_inicio_reparacion = datosAdicionales;
                }
                break;
            case 'Completado':
                actualizacion.fecha_completado = ahora;
                if (datosAdicionales) {
                    actualizacion.datos_reparacion_completa = datosAdicionales;
                }
                break;
            case 'Entregado':
                actualizacion.fecha_entrega = ahora;
                if (datosAdicionales) {
                    actualizacion.datos_entrega = datosAdicionales;
                }
                break;
        }
        
        const response = await fetch(`${API_SERVICIOS}/${servicioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actualizacion)
        });
        
        if (!response.ok) {
            throw new Error('Error al cambiar estado');
        }
        
        cerrarModalCarga();
        
        // Recargar servicios
        if (window.cargarServicios) {
            window.cargarServicios();
        }
        
        mostrarNotificacionExito(`Estado cambiado a: ${nuevoEstado}`);
        
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al cambiar estado: ' + error.message);
    }
}

/**
 * Ver diagnóstico guardado
 */
export async function verDiagnostico(servicioId) {
    try {
        const response = await fetch(`${API_SERVICIOS}`);
        const servicios = await response.json();
        const servicio = servicios.find(s => s._id === servicioId);
        
        if (!servicio || !servicio.diagnostico) {
            alert('No hay diagnóstico disponible');
            return;
        }
        
        const diagnostico = JSON.parse(servicio.diagnostico);
        let mensaje = `Diagnóstico del servicio ${servicio.numero_servicio}\n\nTécnico: ${servicio.tecnico || 'N/A'}\n\n`;
        diagnostico.forEach((p, idx) => {
            mensaje += `${idx + 1}. ${p.descripcion}\n`;
            if (p.solucion) mensaje += `   Solución: ${p.solucion}\n`;
            mensaje += `   Costo: $${p.costo}\n\n`;
        });
        
        const total = diagnostico.reduce((sum, p) => sum + (p.costo || 0), 0);
        mensaje += `Total: $${total.toFixed(2)}`;
        
        alert(mensaje);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar diagnóstico: ' + error.message);
    }
}

/**
 * Abrir modal con detalles completos del servicio
 */
export async function abrirModalDetallesServicio(servicioId) {
    try {
        mostrarModalCarga('Cargando detalles...');
        
        const serviciosRes = await fetch(`${API_SERVICIOS}?incluir_cancelados=true`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => s._id === servicioId);

        if (!servicio) {
            cerrarModalCarga();
            alert('Servicio no encontrado');
            return;
        }

        const clientesRes = await fetch(`${API_CLIENTES}`);
        const clientes = await clientesRes.json();
        const cliente = clientes.find(c => c._id == servicio.cliente_id);

        const equiposRes = await fetch(`${API_EQUIPOS}`);
        const equipos = await equiposRes.json();
        let equipo = equipos.find(e => e._id == servicio.equipo_id);

        cerrarModalCarga();
        
        // Mostrar detalles en alert por ahora
        let detalles = `DETALLES DEL SERVICIO\n\n`;
        detalles += `Número: ${servicio.numero_servicio}\n`;
        detalles += `Fecha: ${servicio.fecha}\n`;
        detalles += `Estado: ${servicio.estado}\n`;
        detalles += `Local: ${servicio.local}\n\n`;
        detalles += `CLIENTE\n`;
        detalles += `Nombre: ${cliente ? cliente.nombre : 'N/A'}\n`;
        detalles += `DNI: ${cliente ? cliente.dni : 'N/A'}\n`;
        detalles += `Teléfono: ${cliente ? cliente.telefono : 'N/A'}\n\n`;
        detalles += `EQUIPO\n`;
        detalles += `Tipo: ${equipo ? equipo.tipo_equipo : 'N/A'}\n`;
        detalles += `Marca: ${equipo ? equipo.marca : 'N/A'}\n`;
        detalles += `Modelo: ${equipo ? equipo.modelo : 'N/A'}\n\n`;
        detalles += `COSTOS\n`;
        detalles += `Adelanto: $${servicio.adelanto || 0}\n`;
        detalles += `Monto Total: $${servicio.monto || 0}\n`;
        detalles += `Saldo: $${(servicio.monto || 0) - (servicio.adelanto || 0)}`;
        
        alert(detalles);
        
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al cargar detalles: ' + error.message);
    }
}
