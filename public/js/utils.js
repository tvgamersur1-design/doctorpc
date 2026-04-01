// ==================== UTILIDADES GENERALES ====================

import { ICONOS_EQUIPO, ESTILOS_ESTADO } from './config.js';

/**
 * Validar email
 * @param {string} email 
 * @returns {boolean}
 */
export function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validar DNI peruano (8 dígitos)
 * @param {string} dni 
 * @returns {boolean}
 */
export function validarDNI(dni) {
    return /^\d{8}$/.test(dni);
}

/**
 * Validar teléfono peruano (9 dígitos)
 * @param {string} telefono 
 * @returns {boolean}
 */
export function validarTelefono(telefono) {
    return /^\d{9}$/.test(telefono);
}

/**
 * Formatear fecha a formato local
 * @param {string|Date} fecha 
 * @returns {string}
 */
export function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-PE');
}

/**
 * Formatear fecha y hora
 * @param {string|Date} fecha 
 * @returns {string}
 */
export function formatearFechaHora(fecha) {
    const date = new Date(fecha);
    return `${date.toLocaleDateString('es-PE')} ${date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Formatear moneda (soles peruanos)
 * @param {number} monto 
 * @returns {string}
 */
export function formatearMoneda(monto) {
    return `S/ ${parseFloat(monto).toFixed(2)}`;
}

/**
 * Obtener icono según tipo de equipo
 * @param {string} tipo 
 * @returns {string}
 */
export function getIconoEquipo(tipo) {
    return ICONOS_EQUIPO[tipo] || 'fas fa-cube';
}

/**
 * Obtener badge HTML para estado de servicio
 * @param {string} estado 
 * @returns {string}
 */
export function getBadgeEstado(estado) {
    const estilo = ESTILOS_ESTADO[estado] || { bg: '#E0E0E0', color: '#424242', icon: 'fas fa-circle' };
    
    return `<span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; background: ${estilo.bg}; color: ${estilo.color};">
        <i class="${estilo.icon}"></i> ${estado}
    </span>`;
}

/**
 * Obtener badge HTML para local
 * @param {string} local 
 * @returns {string}
 */
export function getBadgeLocal(local) {
    const estilo = local === 'Ferreñafe' 
        ? 'background: #C8E6C9; color: #2E7D32;' 
        : 'background: #BBDEFB; color: #1565C0;';
    
    return `<span style="padding: 4px 8px; border-radius: 4px; font-weight: 600; ${estilo}">${local || 'N/A'}</span>`;
}

/**
 * Debounce function
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Truncar texto
 * @param {string} texto 
 * @param {number} maxLength 
 * @returns {string}
 */
export function truncarTexto(texto, maxLength = 40) {
    if (!texto) return 'N/A';
    return texto.length > maxLength ? texto.substring(0, maxLength) + '...' : texto;
}

/**
 * Escapar HTML para prevenir XSS
 * @param {string} texto 
 * @returns {string}
 */
export function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

/**
 * Generar ID único
 * @returns {string}
 */
export function generarID() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Copiar texto al portapapeles
 * @param {string} texto 
 * @returns {Promise<void>}
 */
export async function copiarAlPortapapeles(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        return true;
    } catch (error) {
        console.error('Error al copiar:', error);
        return false;
    }
}

/**
 * Descargar archivo
 * @param {string} contenido 
 * @param {string} nombreArchivo 
 * @param {string} tipo 
 */
export function descargarArchivo(contenido, nombreArchivo, tipo = 'text/plain') {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Calcular costo total de diagnóstico
 * @param {string|Array} diagnostico 
 * @returns {number}
 */
export function calcularCostoTotal(diagnostico) {
    if (!diagnostico) return 0;
    
    try {
        const problemas = typeof diagnostico === 'string' ? JSON.parse(diagnostico) : diagnostico;
        return problemas.reduce((sum, p) => sum + (parseFloat(p.costo) || 0), 0);
    } catch (error) {
        console.error('Error al calcular costo:', error);
        return 0;
    }
}

/**
 * Normalizar estado de servicio
 * @param {string} estado 
 * @returns {string}
 */
export function normalizarEstado(estado) {
    return (estado || '').trim();
}
