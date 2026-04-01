// ==================== MÓDULO DE USUARIOS ====================

import { API_USUARIOS } from '../config.js';
import { mostrarModalCarga, cerrarModalCarga, mostrarNotificacionExito } from '../ui.js';
import { getUsuarioActual } from '../auth.js';

// ==================== FUNCIONES PÚBLICAS ====================

/**
 * Abrir modal nuevo usuario
 */
export function abrirModalNuevoUsuario() {
    document.getElementById('modalNuevoUsuario').classList.add('show');
    document.getElementById('formNuevoUsuario').reset();
}

/**
 * Cerrar modal nuevo usuario
 */
export function cerrarModalNuevoUsuario() {
    document.getElementById('modalNuevoUsuario').classList.remove('show');
}

/**
 * Guardar nuevo usuario
 */
export async function guardarNuevoUsuario(e) {
    e.preventDefault();
    const usuario = document.getElementById('nuevoUsuarioNombre').value.trim();
    const correo = document.getElementById('nuevoUsuarioCorreo').value.trim();
    const clave = document.getElementById('nuevoUsuarioClave').value;
    const rol = document.getElementById('nuevoUsuarioRol').value;

    try {
        mostrarModalCarga('Creando usuario...');
        const response = await fetch(`${API_USUARIOS}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, correo, clave, rol })
        });

        cerrarModalCarga();

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear usuario');
        }

        cerrarModalNuevoUsuario();
        mostrarNotificacionExito('Usuario creado exitosamente');
        cargarUsuarios();
    } catch (error) {
        cerrarModalCarga();
        alert('Error: ' + error.message);
    }
}

/**
 * Cargar usuarios
 */
export async function cargarUsuarios() {
    const container = document.getElementById('usuariosContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-spinner-inline">
            <div class="loading-spinner-circle"></div>
            <p class="loading-spinner-text">Cargando usuarios...</p>
        </div>`;

    try {
        const response = await fetch(`${API_USUARIOS}`);
        if (!response.ok) throw new Error('Error al cargar usuarios');
        
        const usuarios = await response.json();
        const usuarioActual = getUsuarioActual();

        if (usuarios.length === 0) {
            container.innerHTML = '<div class="no-records">No hay usuarios registrados</div>';
            return;
        }

        let html = `<table class="records-table">
            <thead>
                <tr>
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Fecha Creación</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>`;

        usuarios.forEach(u => {
            const esMiUsuario = usuarioActual && u._id === usuarioActual.id;
            const fechaCreacion = u.fecha_creacion ? new Date(u.fecha_creacion).toLocaleDateString('es-PE') : 'N/A';
            const rolBadge = u.rol === 'admin' 
                ? '<span style="background: #e3f2fd; color: #1565C0; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;"><i class="fas fa-shield-alt"></i> Admin</span>'
                : '<span style="background: #f5f5f5; color: #666; padding: 3px 10px; border-radius: 12px; font-size: 12px;"><i class="fas fa-user"></i> Usuario</span>';

            html += `<tr>
                <td data-label="Usuario"><strong>${u.usuario}</strong></td>
                <td data-label="Correo">${u.correo}</td>
                <td data-label="Rol">${rolBadge}</td>
                <td data-label="Fecha">${fechaCreacion}</td>
                <td data-label="Acciones">
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        <button class="btn-edit" onclick="abrirModalEditarUsuario('${u._id}', '${u.usuario}', '${u.correo}', '${u.rol}')" style="padding: 6px 12px; font-size: 12px;">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        ${esMiUsuario 
                            ? '<span style="color: #999; font-size: 11px;"><i class="fas fa-lock"></i> Tu cuenta</span>'
                            : `<button class="btn-danger" onclick="eliminarUsuario('${u._id}', '${u.usuario}')" style="padding: 6px 12px; font-size: 12px;">
                                <i class="fas fa-trash"></i> Eliminar
                              </button>`
                        }
                    </div>
                </td>
            </tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="no-records" style="color: #c62828;">Error al cargar usuarios</div>';
    }
}

/**
 * Eliminar usuario
 */
export async function eliminarUsuario(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${nombre}"?`)) return;

    try {
        mostrarModalCarga('Eliminando usuario...');
        const response = await fetch(`${API_USUARIOS}/${id}`, {
            method: 'DELETE'
        });

        cerrarModalCarga();

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar usuario');
        }

        mostrarNotificacionExito('Usuario eliminado');
        cargarUsuarios();
    } catch (error) {
        cerrarModalCarga();
        alert('Error: ' + error.message);
    }
}

/**
 * Abrir modal editar usuario
 */
export function abrirModalEditarUsuario(id, usuario, correo, rol) {
    document.getElementById('editUsuarioId').value = id;
    document.getElementById('editUsuarioNombre').value = usuario;
    document.getElementById('editUsuarioCorreo').value = correo;
    document.getElementById('editUsuarioRol').value = rol;
    document.getElementById('editUsuarioClaveNueva').value = '';
    document.getElementById('editUsuarioClaveAdmin').value = '';
    document.getElementById('seccionClaveAdmin').style.display = 'none';
    document.getElementById('modalEditarUsuario').classList.add('show');

    // Mostrar/ocultar campo de clave admin al escribir nueva contraseña
    document.getElementById('editUsuarioClaveNueva').oninput = function() {
        document.getElementById('seccionClaveAdmin').style.display = this.value.length > 0 ? 'block' : 'none';
    };
}

/**
 * Cerrar modal editar usuario
 */
export function cerrarModalEditarUsuario() {
    document.getElementById('modalEditarUsuario').classList.remove('show');
}

/**
 * Guardar edición de usuario
 */
export async function guardarEdicionUsuario(e) {
    e.preventDefault();
    const id = document.getElementById('editUsuarioId').value;
    const usuario = document.getElementById('editUsuarioNombre').value.trim();
    const correo = document.getElementById('editUsuarioCorreo').value.trim();
    const rol = document.getElementById('editUsuarioRol').value;
    const claveNueva = document.getElementById('editUsuarioClaveNueva').value;
    const claveAdmin = document.getElementById('editUsuarioClaveAdmin').value;

    const body = { usuario, correo, rol };
    if (claveNueva) {
        body.clave_nueva = claveNueva;
        body.clave_admin = claveAdmin;
    }

    try {
        mostrarModalCarga('Actualizando usuario...');
        const response = await fetch(`${API_USUARIOS}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        cerrarModalCarga();

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar usuario');
        }

        cerrarModalEditarUsuario();
        mostrarNotificacionExito('Usuario actualizado');
        cargarUsuarios();
    } catch (error) {
        cerrarModalCarga();
        alert('Error: ' + error.message);
    }
}
