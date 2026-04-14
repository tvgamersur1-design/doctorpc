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
 * OPTIMIZADO: Actualiza caché correctamente y fuerza re-renderizado
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

        const resultado = await response.json();
        console.log('📥 Respuesta del servidor:', resultado);

        // Actualizar caché de servicios
        if (window.Servicios && window.Servicios.serviciosCache) {
            const serviciosCache = window.Servicios.serviciosCache;
            const index = serviciosCache.findIndex(s => s._id === servicioIdACancelar);
            
            console.log('🔍 Buscando servicio en caché:', {
                servicioId: servicioIdACancelar,
                encontrado: index !== -1,
                totalServicios: serviciosCache.length
            });
            
            if (index !== -1) {
                const servicioAntes = { ...serviciosCache[index] };
                
                // Actualizar el estado en el caché
                serviciosCache[index].estado = 'Cancelado';
                serviciosCache[index].motivo_cancelacion = motivo;
                serviciosCache[index].cancelado_por = usuarioActual ? usuarioActual.usuario : 'Sistema';
                serviciosCache[index].fecha_cancelacion = new Date().toISOString();
                
                console.log('✅ Caché actualizado:', {
                    numeroServicio: serviciosCache[index].numero_servicio,
                    estadoAntes: servicioAntes.estado,
                    estadoDespues: serviciosCache[index].estado
                });
            } else {
                console.error('❌ Servicio no encontrado en caché');
            }
        } else {
            console.error('❌ window.Servicios.serviciosCache no disponible');
        }
        
        cerrarModalCarga();
        cerrarModalCancelarServicio();
        mostrarNotificacionExito('Servicio cancelado exitosamente');
        
        // Forzar recarga de la vista (sin parámetros usa el caché actualizado)
        console.log('🔄 Recargando vista de servicios...');
        if (window.cargarServicios) {
            await window.cargarServicios(1, '');
        } else {
            console.error('❌ window.cargarServicios no disponible');
        }
        
    } catch (error) {
        console.error('❌ Error al cancelar servicio:', error);
        cerrarModalCarga();
        alert('Error al cancelar servicio: ' + error.message);
    }
}
