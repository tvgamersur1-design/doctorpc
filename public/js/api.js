// ==================== FUNCIONES DE API ====================

import { getToken } from './auth.js';

/**
 * Wrapper de fetch con autenticación automática
 * @param {string} url 
 * @param {Object} options 
 * @returns {Promise<Response>}
 */
export async function fetchAPI(url, options = {}) {
    // Validar URL
    if (typeof url === 'string') {
        const urlStr = url.toLowerCase();
        if (urlStr.includes('%ef%bf%bd') || urlStr.includes('undefined') || urlStr.includes('null')) {
            console.error('❌ URL INVÁLIDA - Fetch bloqueado:', url);
            throw new Error('URL inválida: ' + url);
        }
    }
    
    const token = getToken();
    
    // Agregar token de autenticación si existe
    if (token && !url.includes('/api/auth/login')) {
        options.headers = options.headers || {};
        if (typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    
    const response = await fetch(url, options);
    
    // Manejar errores de autenticación
    if (response.status === 401 || response.status === 403) {
        if (!url.includes('/api/auth/')) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = 'index.html';
        }
    }
    
    return response;
}

/**
 * GET request que retorna JSON
 * @param {string} url 
 * @returns {Promise<any>}
 */
export async function getJSON(url) {
    const response = await fetchAPI(url);
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * POST request con JSON
 * @param {string} url 
 * @param {Object} data 
 * @returns {Promise<any>}
 */
export async function postJSON(url, data) {
    const response = await fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
}

/**
 * PUT request con JSON
 * @param {string} url 
 * @param {Object} data 
 * @returns {Promise<any>}
 */
export async function putJSON(url, data) {
    const response = await fetchAPI(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
}

/**
 * PATCH request con JSON
 * @param {string} url 
 * @param {Object} data 
 * @returns {Promise<any>}
 */
export async function patchJSON(url, data) {
    const response = await fetchAPI(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
}

/**
 * DELETE request
 * @param {string} url 
 * @returns {Promise<any>}
 */
export async function deleteJSON(url) {
    const response = await fetchAPI(url, { method: 'DELETE' });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
}

/**
 * Validar ID antes de hacer requests
 * @param {string} id 
 * @returns {string|null}
 */
export function validarID(id) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
        console.error('❌ ID inválido:', id);
        return null;
    }
    return id.trim();
}
