// ==================== AUTENTICACIÓN Y SESIÓN ====================

import { API } from './config.js';

/**
 * Verificar si hay una sesión activa
 * @returns {boolean} true si hay sesión válida
 */
export function verificarSesion() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

/**
 * Cerrar sesión del usuario
 */
export function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
}

/**
 * Obtener token de autenticación
 * @returns {string|null} Token JWT
 */
export function getToken() {
    return localStorage.getItem('token');
}

/**
 * Obtener datos del usuario actual
 * @returns {Object|null} Datos del usuario
 */
export function getUsuarioActual() {
    try {
        const usuario = localStorage.getItem('usuario');
        return usuario ? JSON.parse(usuario) : null;
    } catch (error) {
        console.error('Error al parsear usuario:', error);
        return null;
    }
}

/**
 * Verificar si el usuario es administrador
 * @returns {boolean}
 */
export function esAdmin() {
    const usuario = getUsuarioActual();
    return usuario && usuario.rol === 'admin';
}

/**
 * Login de usuario
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} Datos del usuario y token
 */
export async function login(email, password) {
    const response = await fetch(`${API.AUTH}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Credenciales inválidas');
    }
    
    const data = await response.json();
    
    // Guardar en localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    
    return data;
}

/**
 * Actualizar nombre del usuario en el sidebar
 */
export function actualizarNombreUsuarioUI() {
    const usuario = getUsuarioActual();
    if (usuario) {
        const nombreElement = document.getElementById('nombreUsuarioSidebar');
        if (nombreElement) {
            nombreElement.textContent = usuario.nombre || 'Usuario';
        }
    }
}

/**
 * Mostrar/ocultar elementos según rol
 */
export function configurarPermisos() {
    const usuario = getUsuarioActual();
    if (!usuario) return;
    
    // Mostrar tab de usuarios solo para admin
    const tabUsuarios = document.getElementById('tabUsuarios');
    if (tabUsuarios) {
        tabUsuarios.style.display = usuario.rol === 'admin' ? 'block' : 'none';
    }
    
    // Mostrar toggle de eliminados solo para admin
    const toggleEliminadosClientes = document.getElementById('toggleEliminadosContainer');
    if (toggleEliminadosClientes) {
        toggleEliminadosClientes.style.display = usuario.rol === 'admin' ? 'flex' : 'none';
    }
    
    const toggleEliminadosEquipos = document.getElementById('toggleEliminadosEquiposContainer');
    if (toggleEliminadosEquipos) {
        toggleEliminadosEquipos.style.display = usuario.rol === 'admin' ? 'flex' : 'none';
    }
}
