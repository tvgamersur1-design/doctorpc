// ==================== MÓDULO DE USUARIOS ====================

import { API_USUARIOS } from '../config.js';
import { getJSON, postJSON, putJSON, patchJSON, deleteJSON } from '../api.js';
import { mostrarModalCarga, cerrarModalCarga, mostrarNotificacionExito, mostrarModalNotificacion } from '../ui.js';
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
        const usuarioGuardado = await postJSON(API_USUARIOS, { usuario, correo, clave, rol });

        cerrarModalCarga();
        cerrarModalNuevoUsuario();
        mostrarNotificacionExito('Usuario creado exitosamente');
        
        // Agregar al caché y actualizar tabla sin recargar
        usuariosCache.unshift(usuarioGuardado);
        renderTablaUsuarios(usuariosCache);
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
        const usuarios = await getJSON(API_USUARIOS);
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
                    <th>Estado</th>
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

            // ✅ NUEVO: Badge de estado activo/inactivo
            const activo = u.activo !== false; // Por defecto true si no existe el campo
            const estadoBadge = activo
                ? '<span style="background: #C8E6C9; color: #2E7D32; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;"><i class="fas fa-check-circle"></i> Activo</span>'
                : '<span style="background: #FFCDD2; color: #C62828; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;"><i class="fas fa-ban"></i> Inactivo</span>';

            // ✅ Toggle para activar/desactivar (solo si no es mi usuario)
            const toggleEstado = esMiUsuario 
                ? '<span style="color: #999; font-size: 11px;"><i class="fas fa-lock"></i> Tu cuenta</span>'
                : `<label class="switch" style="display: inline-block; position: relative; width: 50px; height: 24px;">
                    <input type="checkbox" id="toggle-${u._id}" ${activo ? 'checked' : ''} onclick="event.preventDefault(); window.handleToggleUsuario('${u._id}', '${u.usuario}', ${activo})" style="opacity: 0; width: 0; height: 0;">
                    <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${activo ? '#4CAF50' : '#ccc'}; transition: .4s; border-radius: 24px;"></span>
                   </label>`;

            html += `<tr style="${!activo ? 'opacity: 0.6; background-color: #ffebee;' : ''}">
                <td data-label="Usuario"><strong>${u.usuario}</strong></td>
                <td data-label="Correo">${u.correo}</td>
                <td data-label="Rol">${rolBadge}</td>
                <td data-label="Estado">${estadoBadge}</td>
                <td data-label="Fecha">${fechaCreacion}</td>
                <td data-label="Acciones">
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        ${toggleEstado}
                        <button class="btn-edit" onclick="abrirModalEditarUsuario('${u._id}', '${u.usuario}', '${u.correo}', '${u.rol}')" style="padding: 6px 12px; font-size: 12px;">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        ${esMiUsuario 
                            ? ''
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
        await deleteJSON(`${API_USUARIOS}/${id}`);

        cerrarModalCarga();
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
        const usuarioActualizado = await putJSON(`${API_USUARIOS}/${id}`, body);

        cerrarModalCarga();
        cerrarModalEditarUsuario();
        mostrarNotificacionExito('Usuario actualizado');
        
        // Actualizar en el caché
        const index = usuariosCache.findIndex(u => u._id === id);
        if (index !== -1) {
            usuariosCache[index] = usuarioActualizado;
        }
        renderTablaUsuarios(usuariosCache);
    } catch (error) {
        cerrarModalCarga();
        alert('Error: ' + error.message);
    }
}

/**
 * ✅ Manejar click en toggle de usuario
 */
export async function handleToggleUsuario(id, nombreUsuario, estadoActual) {
    const nuevoEstado = !estadoActual;
    
    // Mostrar modal de confirmación personalizado
    const confirmar = await mostrarModalConfirmacionEstado(nombreUsuario, nuevoEstado);
    
    if (!confirmar) {
        // No hacer nada si cancela
        return;
    }

    try {
        mostrarModalCarga(nuevoEstado ? 'Activando usuario...' : 'Desactivando usuario...');
        
        console.log('Cambiando estado de usuario:', {
            id,
            nombre: nombreUsuario,
            estadoActual,
            nuevoEstado
        });
        
        // Usar endpoint específico PATCH /usuarios/:id/estado
        const respuesta = await patchJSON(`${API_USUARIOS}/${id}/estado`, { 
            activo: nuevoEstado 
        });

        console.log('Respuesta del servidor:', JSON.stringify(respuesta, null, 2));
        console.log('Campo activo en respuesta:', respuesta.activo);
        console.log('¿Se actualizó correctamente?', respuesta.activo === nuevoEstado);

        cerrarModalCarga();
        
        if (respuesta.activo === nuevoEstado) {
            mostrarNotificacionExito(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`);
        } else {
            throw new Error('El estado no se actualizó correctamente en la base de datos');
        }
        
        // Recargar usuarios para mostrar el cambio
        await cargarUsuarios();
    } catch (error) {
        console.error('Error al cambiar estado de usuario:', error);
        cerrarModalCarga();
        mostrarModalNotificacion('Error al ' + (nuevoEstado ? 'activar' : 'desactivar') + ' usuario: ' + error.message, 'error');
        // Recargar para mostrar el estado real
        cargarUsuarios();
    }
}

/**
 * ✅ NUEVO: Toggle estado activo/inactivo de usuario (DEPRECADO - usar handleToggleUsuario)
 */
export async function toggleEstadoUsuario(id, nombreUsuario, nuevoEstado) {
    // Mostrar modal de confirmación personalizado
    const confirmar = await mostrarModalConfirmacionEstado(nombreUsuario, nuevoEstado);
    
    if (!confirmar) {
        // Revertir el toggle si cancela
        cargarUsuarios();
        return;
    }

    try {
        mostrarModalCarga(nuevoEstado ? 'Activando usuario...' : 'Desactivando usuario...');
        
        // Obtener datos completos del usuario primero
        const usuarios = await getJSON(API_USUARIOS);
        const usuario = usuarios.find(u => u._id === id);
        
        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }
        
        // Actualizar con todos los datos requeridos
        const respuesta = await putJSON(`${API_USUARIOS}/${id}`, { 
            usuario: usuario.usuario,
            correo: usuario.correo,
            rol: usuario.rol,
            activo: nuevoEstado 
        });

        cerrarModalCarga();
        mostrarNotificacionExito(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`);
        
        // Recargar usuarios para verificar el cambio
        await cargarUsuarios();
    } catch (error) {
        console.error('Error al cambiar estado de usuario:', error);
        cerrarModalCarga();
        mostrarModalNotificacion('Error al ' + (nuevoEstado ? 'activar' : 'desactivar') + ' usuario: ' + error.message, 'error');
        cargarUsuarios(); // Recargar para revertir el toggle
    }
}

/**
 * Mostrar modal de confirmación personalizado para cambio de estado
 */
function mostrarModalConfirmacionEstado(nombreUsuario, activar) {
    return new Promise((resolve) => {
        const color = activar ? '#4CAF50' : '#d32f2f';
        const icono = activar ? 'fa-user-check' : 'fa-user-slash';
        const modalHTML = `
            <div id="modalConfirmacionEstado" class="modal show">
                <div class="modal-content" style="max-width: 420px; padding: 0; overflow: hidden;">
                    <div style="background: ${color}; padding: 28px 20px; text-align: center;">
                        <i class="fas ${icono}" style="font-size: 48px; color: white;"></i>
                    </div>
                    <div style="padding: 24px 30px 30px;">
                        <h2 style="color: #333; margin: 0 0 16px; font-size: 20px; text-align: center;">
                            ${activar ? '¿Activar Usuario?' : '¿Desactivar Usuario?'}
                        </h2>
                        <div style="background: #f5f7fa; padding: 14px; border-radius: 8px; margin-bottom: 18px; border-left: 4px solid ${color};">
                            <p style="margin: 0; color: #888; font-size: 13px;">Usuario:</p>
                            <p style="margin: 4px 0 0; color: #2192B8; font-weight: 700; font-size: 17px;">${nombreUsuario}</p>
                        </div>
                        <div style="color: #555; font-size: 13px; line-height: 1.8; margin-bottom: 24px;">
                            <p style="margin: 0;"><i class="fas ${activar ? 'fa-check' : 'fa-times'}" style="color: ${color}; width: 18px;"></i> ${activar ? 'El usuario podrá iniciar sesión nuevamente' : 'El usuario no podrá iniciar sesión'}</p>
                            <p style="margin: 0;"><i class="fas ${activar ? 'fa-check' : 'fa-times'}" style="color: ${color}; width: 18px;"></i> ${activar ? 'Tendrá acceso completo al sistema' : 'Permanecerá bloqueado hasta ser reactivado'}</p>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button onclick="window.Usuarios.cerrarModalConfirmacionEstado(false)" 
                                style="flex: 1; padding: 11px 0; background: #e9ecef; color: #495057; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; transition: background 0.2s;">
                                <i class="fas fa-times" style="margin-right: 6px;"></i>Cancelar
                            </button>
                            <button onclick="window.Usuarios.cerrarModalConfirmacionEstado(true)" 
                                style="flex: 1; padding: 11px 0; background: ${color}; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; transition: opacity 0.2s;">
                                <i class="fas ${activar ? 'fa-check' : 'fa-user-slash'}" style="margin-right: 6px;"></i>${activar ? 'Sí, Activar' : 'Sí, Desactivar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalAnterior = document.getElementById('modalConfirmacionEstado');
        if (modalAnterior) modalAnterior.remove();

        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div.firstElementChild);

        window._resolverConfirmacionEstado = resolve;
    });
}

/**
 * Cerrar modal de confirmación de estado
 */
export function cerrarModalConfirmacionEstado(confirmado) {
    const modal = document.getElementById('modalConfirmacionEstado');
    if (modal) modal.remove();
    
    if (window._resolverConfirmacionEstado) {
        window._resolverConfirmacionEstado(confirmado);
        window._resolverConfirmacionEstado = null;
    }
}
