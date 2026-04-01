// ==================== MÓDULO DE CANCELACIÓN ====================

import { API_SERVICIOS } from '../config.js';
import { mostrarModalCarga, cerrarModalCarga, mostrarNotificacionExito } from '../ui.js';
import { getUsuarioActual } from '../auth.js';

// ==================== ESTADO DEL MÓDULO ====================

let servicioIdACancelar = null;

// ==================== FUNCIONES PÚBLICAS ====================

/**
 * Abrir modal para cancelar servicio
 */
export async function abrirModalCancelarServicio(id) {
    servicioIdACancelar = id;
    document.getElementById('motivoCancelacion').value = '';
    document.getElementById('modalCancelarServicio').classList.add('show');
}

/**
 * Cerrar modal de cancelación
 */
export function cerrarModalCancelarServicio() {
    servicioIdACancelar = null;
    document.getElementById('modalCancelarServicio').classList.remove('show');
}

/**
 * Confirmar cancelación de servicio
 */
export async function confirmarCancelacionServicio() {
    const motivo = document.getElementById('motivoCancelacion').value.trim();
    
    if (!motivo) {
        alert('Por favor, ingresa el motivo de la cancelación');
        return;
    }
    
    if (!servicioIdACancelar) {
        alert('Error: No se ha seleccionado un servicio');
        return;
    }
    
    try {
        mostrarModalCarga('Cancelando servicio...');
        
        const usuarioActual = getUsuarioActual();
        
        const response = await fetch(`${API_SERVICIOS}/${servicioIdACancelar}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                motivo_cancelacion: motivo,
                cancelado_por: usuarioActual ? usuarioActual.usuario : 'Sistema'
            })
        });

        if (!response.ok) {
            cerrarModalCarga();
            throw new Error('Error al cancelar el servicio');
        }

        cerrarModalCarga();
        cerrarModalCancelarServicio();
        
        // Recargar servicios
        if (window.cargarServicios) {
            window.cargarServicios();
        }
        
        mostrarNotificacionExito('Servicio cancelado exitosamente');
    } catch (error) {
        console.error('Error:', error);
        cerrarModalCarga();
        alert('Error al cancelar servicio: ' + error.message);
    }
}
