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
    // Crear modal de confirmación
    const modalHTML = `
        <div id="modalCerrarSesion" class="modal" style="display: flex; align-items: center; justify-content: center;">
            <div class="modal-content" style="max-width: 420px; text-align: center; padding: 45px 35px;">
                <!-- Logo SVG -->
                <div style="margin-bottom: 30px;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="20 20 165 38" width="160" height="80">
                        <!-- Icono de computadora con estetoscopio -->
                        <g transform="translate(20, 15)">
                            <!-- Monitor/Pantalla -->
                            <rect x="5" y="5" width="35" height="25" rx="2" fill="#2192B8" stroke="#2192B8" stroke-width="2"/>
                            <rect x="7" y="7" width="31" height="21" fill="#E3F2FD"/>
                            
                            <!-- Base del monitor -->
                            <rect x="18" y="30" width="9" height="4" fill="#2192B8"/>
                            <rect x="12" y="34" width="21" height="2" rx="1" fill="#2192B8"/>
                            
                            <!-- Cruz médica en la pantalla -->
                            <g transform="translate(22.5, 17.5)">
                                <rect x="-1.5" y="-4" width="3" height="8" fill="#2192B8"/>
                                <rect x="-4" y="-1.5" width="8" height="3" fill="#2192B8"/>
                            </g>
                            
                            <!-- Estetoscopio -->
                            <path d="M 35 12 Q 42 12 42 18" stroke="#2192B8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                            <circle cx="42" cy="21" r="3" fill="#2192B8"/>
                            <path d="M 42 24 L 42 28" stroke="#2192B8" stroke-width="2" stroke-linecap="round"/>
                        </g>
                        
                        <!-- Texto "Doctor PC" -->
                        <text x="70" y="35" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#2192B8">
                            Doctor PC
                        </text>
                        
                        <!-- Subtítulo "Sistema Admin" -->
                        <text x="70" y="52" font-family="Arial, sans-serif" font-size="11" fill="#2192B8">
                            Sistema Admin
                        </text>
                        
                        <!-- Línea decorativa -->
                        <line x1="70" y1="57" x2="180" y2="57" stroke="#2192B8" stroke-width="1" opacity="0.5"/>
                    </svg>
                </div>
                
                <!-- Mensaje -->
                <h2 style="color: #2c3e50; margin: 0 0 12px 0; font-size: 24px; font-weight: 600;">¿Cerrar Sesión?</h2>
                <p style="color: #7f8c8d; margin: 0 0 35px 0; font-size: 15px; line-height: 1.6;">
                    ¿Estás seguro que deseas salir del sistema?
                </p>
                
                <!-- Botones -->
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="document.getElementById('modalCerrarSesion').remove()" 
                            class="btn-secondary" 
                            style="flex: 1; max-width: 160px; padding: 14px 24px; font-size: 15px; border-radius: 8px; background: #ecf0f1; color: #2c3e50; font-weight: 600;">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button onclick="confirmarCerrarSesion()" 
                            class="btn-danger" 
                            style="flex: 1; max-width: 160px; padding: 14px 24px; font-size: 15px; border-radius: 8px; background: #e74c3c; color: white; font-weight: 600;">
                        <i class="fas fa-sign-out-alt"></i> Salir
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Función global para confirmar
    window.confirmarCerrarSesion = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'index.html';
    };
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
        // Usar el campo 'usuario' si no existe 'nombre'
        const nombreMostrar = usuario.nombre || usuario.usuario || 'Usuario';
        
        const nombreElement = document.getElementById('nombreUsuarioSidebar');
        if (nombreElement) {
            nombreElement.textContent = nombreMostrar;
        }
        
        // Actualizar header
        const nombreHeaderElement = document.getElementById('nombreUsuarioHeader');
        if (nombreHeaderElement) {
            nombreHeaderElement.textContent = nombreMostrar;
        }
        
        const rolHeaderElement = document.getElementById('rolUsuarioHeader');
        if (rolHeaderElement) {
            const rolTexto = usuario.rol === 'admin' ? 'Administrador' : 'Usuario';
            rolHeaderElement.textContent = rolTexto;
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
    const separadorAdmin = document.getElementById('separadorAdmin');
    if (tabUsuarios) {
        tabUsuarios.style.display = usuario.rol === 'admin' ? 'flex' : 'none';
    }
    if (separadorAdmin) {
        separadorAdmin.style.display = usuario.rol === 'admin' ? 'block' : 'none';
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
