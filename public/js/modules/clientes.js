// ==================== MÓDULO DE CLIENTES ====================

import { API } from '../config.js';
import { getJSON, postJSON, putJSON } from '../api.js';
import { 
    mostrarModal, 
    cerrarModal, 
    mostrarModalCarga, 
    cerrarModalCarga,
    mostrarNotificacionExito,
    mostrarSpinnerInline,
    mostrarErrorEnContenedor,
    mostrarSinRegistros
} from '../ui.js';

// ==================== ESTADO DEL MÓDULO ====================
let clientesCache = [];
let clienteEnEdicion = null;

// ==================== FUNCIONES PÚBLICAS ====================

/**
 * Abrir modal para nuevo cliente
 */
export function abrirModalNuevoCliente() {
    mostrarModal('modalNuevoCliente');
    document.getElementById('formModalCliente').reset();
    document.getElementById('decolectaError').style.display = 'none';
    document.getElementById('decolectaLoading').style.display = 'none';
}

/**
 * Cerrar modal de nuevo cliente
 */
export function cerrarModalNuevoCliente() {
    cerrarModal('modalNuevoCliente');
    document.getElementById('formModalCliente').reset();
    document.getElementById('decolectaError').style.display = 'none';
    document.getElementById('decolectaLoading').style.display = 'none';
}

/**
 * Consultar DECOLECTA por DNI
 */
export async function consultarDecolecta() {
    const dni = document.getElementById('dniConsulta').value.trim();

    // Validar DNI
    if (!dni || !/^\d{8}$/.test(dni)) {
        document.getElementById('decolectaErrorMsg').textContent = 'DNI inválido. Debe tener 8 dígitos';
        document.getElementById('decolectaError').style.display = 'block';
        return;
    }

    document.getElementById('decolectaLoading').style.display = 'block';
    document.getElementById('decolectaError').style.display = 'none';
    document.getElementById('btnConsultarDNI').disabled = true;

    try {
        const datos = await getJSON(`${API.DECOLECTA}/${dni}`);

        // Llenar formulario con datos obtenidos
        document.getElementById('inputDNI').value = datos.document_number || dni;
        document.getElementById('inputNombre').value = datos.first_name || '';
        document.getElementById('inputApellidoPaterno').value = datos.first_last_name || '';
        document.getElementById('inputApellidoMaterno').value = datos.second_last_name || '';
        document.getElementById('dniConsulta').value = ''; // Limpiar campo de búsqueda

        document.getElementById('decolectaError').style.display = 'none';
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('decolectaErrorMsg').textContent = error.message || 'No se encontraron datos para este DNI';
        document.getElementById('decolectaError').style.display = 'block';
    } finally {
        document.getElementById('decolectaLoading').style.display = 'none';
        document.getElementById('btnConsultarDNI').disabled = false;
    }
}

/**
 * Guardar cliente desde modal
 */
export async function guardarClienteDesdeModal(e) {
    e.preventDefault();
    const formData = new FormData(document.getElementById('formModalCliente'));
    const cliente = Object.fromEntries(formData);

    try {
        mostrarModalCarga('Guardando...');
        
        const clienteGuardado = await postJSON(API.CLIENTES, cliente);

        cerrarModalCarga();
        document.getElementById('formModalCliente').reset();
        cerrarModalNuevoCliente();
        
        // Agregar al caché y actualizar tabla sin recargar
        clientesCache.unshift(clienteGuardado);
        renderTablaClientes(clientesCache);
        await actualizarSelectsClientes();
        
        mostrarNotificacionExito('Cliente guardado');
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al guardar cliente: ' + error.message);
    }
}

/**
 * Cargar lista de clientes
 */
export async function cargarClientes() {
    const container = document.getElementById('clientesContainer');
    mostrarSpinnerInline('clientesContainer', 'Cargando clientes...');
    
    try {
        // Verificar si se deben incluir eliminados
        const toggleEliminados = document.getElementById('toggleClientesEliminados');
        const incluirEliminados = toggleEliminados && toggleEliminados.checked;
        
        const url = incluirEliminados ? `${API.CLIENTES}?incluirEliminados=true` : API.CLIENTES;
        clientesCache = await getJSON(url);

        if (clientesCache.length === 0) {
            mostrarSinRegistros('clientesContainer', 'No hay clientes registrados');
            return;
        }

        renderTablaClientes(clientesCache);
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        mostrarErrorEnContenedor('clientesContainer', 'Error al cargar clientes');
    }
}

/**
 * Filtrar clientes por búsqueda
 */
export async function filtrarClientes() {
    const busqueda = document.getElementById('searchClientes').value.toLowerCase();
    
    try {
        // Si no hay búsqueda, mostrar todos
        if (!busqueda) {
            await cargarClientes();
            return;
        }
        
        // Filtrar desde el cache
        const filtrados = clientesCache.filter(c =>
            c.nombre.toLowerCase().includes(busqueda) ||
            (c.telefono && c.telefono.includes(busqueda)) ||
            (c.email && c.email.toLowerCase().includes(busqueda)) ||
            (c.dni && c.dni.includes(busqueda))
        );

        if (filtrados.length === 0) {
            mostrarSinRegistros('clientesContainer', 'No se encontraron clientes');
            return;
        }

        renderTablaClientes(filtrados);
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Abrir modal con detalles del cliente
 */
export async function abrirModalVerCliente(id) {
    try {
        // Buscar cliente por ID
        let cliente = await getJSON(`${API.CLIENTES}/${id}`).catch(() => null);

        if (!cliente) {
            // Buscar en el cache
            cliente = clientesCache.find(c => c._id == id);
        }

        if (!cliente) {
            alert('⚠️ Cliente no encontrado. Recargando lista...');
            await cargarClientes();
            return;
        }

        // Guardar datos originales para detectar cambios
        clienteEnEdicion = { ...cliente };
        window.clienteEnEdicion = clienteEnEdicion; // Para funciones auxiliares

        const detalles = generarHTMLDetallesCliente(cliente);
        document.getElementById('detallesClienteContent').innerHTML = detalles;
        mostrarModal('modalVerCliente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar detalles del cliente');
    }
}

/**
 * Cerrar modal de detalles del cliente
 */
export function cerrarModalVerCliente() {
    cerrarModal('modalVerCliente');
    clienteEnEdicion = null;
}

/**
 * Guardar cambios del cliente
 */
export async function guardarEdicionCliente(clienteId) {
    const telefonoNuevo = document.getElementById('telefonoEditar').value.trim();
    const emailNuevo = document.getElementById('emailEditar').value.trim();
    const direccionNueva = document.getElementById('direccionEditar').value.trim();

    // Validar que el teléfono sea obligatorio
    if (!telefonoNuevo) {
        alert('El teléfono es obligatorio');
        return;
    }

    // Detectar si hubo cambios reales
    const telefonoCambio = clienteEnEdicion.telefono !== telefonoNuevo;
    const emailCambio = (clienteEnEdicion.email || '') !== emailNuevo;
    const direccionCambio = (clienteEnEdicion.direccion || '') !== direccionNueva;
    
    const huboCambios = telefonoCambio || emailCambio || direccionCambio;
    
    // Si no hubo cambios, solo cerrar modal
    if (!huboCambios) {
        cerrarModalVerCliente();
        return;
    }

    // Si cambió el teléfono, mostrar modal de confirmación
    if (telefonoCambio) {
        mostrarModalConfirmacionTelefono(
            clienteEnEdicion.telefono || 'sin teléfono',
            telefonoNuevo,
            clienteId,
            emailNuevo,
            direccionNueva
        );
        return;
    }

    // Si no cambió el teléfono, guardar directamente
    await guardarCambiosClienteDirecto(clienteId, telefonoNuevo, emailNuevo, direccionNueva);
}

/**
 * Confirmar eliminación de cliente
 */
export async function confirmarEliminarCliente(id) {
    document.getElementById('confirmMsg').textContent = '¿Estás seguro de que deseas eliminar este cliente?';
    document.getElementById('confirmBtn').onclick = () => eliminarCliente(id);
    mostrarModal('confirmModal');
}

/**
 * Confirmar eliminación desde modal de detalles
 */
export function confirmarEliminarClienteDesdeModal(id) {
    cerrarModalVerCliente();
    confirmarEliminarCliente(id);
}

/**
 * Restaurar cliente eliminado
 */
export async function restaurarCliente(id) {
    try {
        mostrarModalCarga('Restaurando...');
        
        await putJSON(`${API.CLIENTES}/${id}/restaurar`, {});

        cerrarModalCarga();
        await cargarClientes();
        mostrarNotificacionExito('Cliente restaurado');
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al restaurar cliente');
    }
}

// ==================== FUNCIONES PRIVADAS ====================

/**
 * Renderizar tabla de clientes
 */
function renderTablaClientes(clientes) {
    const container = document.getElementById('clientesContainer');
    
    let html = `
        <table class="records-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>DNI</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    clientes.forEach(cliente => {
        const esEliminado = cliente.eliminado === true;
        const rowStyle = esEliminado ? 'style="background-color: #ffebee; opacity: 0.7;"' : '';
        
        html += `
            <tr ${rowStyle}>
                <td data-label="Nombre"><strong>${cliente.nombre}</strong>${esEliminado ? ' <span style="color: #d32f2f; font-size: 11px;">(ELIMINADO)</span>' : ''}</td>
                <td data-label="Teléfono">${cliente.telefono || 'N/A'}</td>
                <td data-label="Email">${cliente.email || 'N/A'}</td>
                <td data-label="DNI">${cliente.dni || 'N/A'}</td>
                <td data-label="Acciones" class="actions">
                     ${!esEliminado ? `
                     <button class="btn-edit" onclick="abrirModalVerCliente('${cliente._id}')">
                         <i class="fas fa-eye"></i> Ver
                     </button>
                     <button class="btn-danger" onclick="confirmarEliminarCliente('${cliente._id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                     ` : `
                     <button class="btn-primary" onclick="restaurarCliente('${cliente._id}')">
                        <i class="fas fa-undo"></i> Restaurar
                    </button>
                     `}
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/**
 * Generar HTML de detalles del cliente
 */
function generarHTMLDetallesCliente(cliente) {
    return `
        <div style="padding: 20px;">
            <div style="font-size: 40px; color: #2192B8; margin-bottom: 20px; text-align: center;">
                <i class="fas fa-user-circle"></i>
            </div>
            
            <div style="text-align: left; background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <!-- Campos NO editables -->
                <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 15px;">
                    <strong>Nombre:</strong>
                    <input type="text" value="${cliente.nombre || ''}" readonly style="background-color: #e0e0e0; cursor: not-allowed; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 15px;">
                    <strong>DNI:</strong>
                    <input type="text" value="${cliente.dni || ''}" readonly style="background-color: #e0e0e0; cursor: not-allowed; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 15px;">
                    <strong>Apellido Paterno:</strong>
                    <input type="text" value="${cliente.apellido_paterno || ''}" readonly style="background-color: #e0e0e0; cursor: not-allowed; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 15px;">
                    <strong>Apellido Materno:</strong>
                    <input type="text" value="${cliente.apellido_materno || ''}" readonly style="background-color: #e0e0e0; cursor: not-allowed; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <!-- Campos editables -->
                <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 15px;">
                    <strong>Teléfono: <span style="color: #d32f2f;">*</span></strong>
                    <input type="text" id="telefonoEditar" value="${cliente.telefono || ''}" placeholder="Ingrese teléfono" style="padding: 8px; border: 1px solid #2192B8; border-radius: 4px; background: #fff;">
                </div>
                
                <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 15px;">
                    <strong>Email:</strong>
                    <input type="email" id="emailEditar" value="${cliente.email || ''}" placeholder="Ingrese email" style="padding: 8px; border: 1px solid #2192B8; border-radius: 4px; background: #fff;">
                </div>
                
                <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px;">
                    <strong>Dirección:</strong>
                    <input type="text" id="direccionEditar" value="${cliente.direccion || ''}" placeholder="Ingrese dirección" style="padding: 8px; border: 1px solid #2192B8; border-radius: 4px; background: #fff;">
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                <button class="btn-secondary" onclick="cerrarModalVerCliente()">Cerrar</button>
                <button class="btn-primary" onclick="guardarEdicionCliente('${cliente._id}')">
                    <i class="fas fa-save"></i> Guardar Cambios
                </button>
                <button class="btn-danger" onclick="confirmarEliminarClienteDesdeModal('${cliente._id}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `;
}

/**
 * Mostrar modal de confirmación para cambio de teléfono
 */
function mostrarModalConfirmacionTelefono(telefonoAnterior, telefonoNuevo, clienteId, emailNuevo, direccionNueva) {
    const modalHTML = `
        <div id="modalConfirmacionTelefono" class="modal show">
            <div class="modal-content" style="max-width: 450px; background: white; border-radius: 8px; padding: 30px; text-align: center;">
                <div style="font-size: 48px; color: #2192B8; margin-bottom: 20px;">
                    <i class="fas fa-phone"></i>
                </div>
                
                <h2 style="color: #333; margin-bottom: 20px; font-size: 20px;">
                    ¿Cambiar teléfono?
                </h2>
                
                <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                    <p style="margin: 0; color: #666; font-size: 13px; margin-bottom: 10px;">Teléfono anterior:</p>
                    <p style="margin: 0; color: #333; font-weight: bold; font-size: 16px; margin-bottom: 15px;">
                        ${telefonoAnterior}
                    </p>
                    
                    <div style="border-top: 2px solid #ddd; padding-top: 15px;">
                        <p style="margin: 0; color: #666; font-size: 13px; margin-bottom: 10px;">Teléfono nuevo:</p>
                        <p style="margin: 0; color: #2192B8; font-weight: bold; font-size: 16px;">
                            ${telefonoNuevo}
                        </p>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="window.Clientes.cerrarModalConfirmacionTelefono()" style="flex: 1; padding: 12px; background: #e0e0e0; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">
                        <i class="fas fa-times" style="margin-right: 8px;"></i>Cancelar
                    </button>
                    <button onclick="window.Clientes.confirmarCambioTelefono('${clienteId}', '${telefonoNuevo}', '${emailNuevo}', '${direccionNueva}')" style="flex: 1; padding: 12px; background: #2192B8; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">
                        <i class="fas fa-check" style="margin-right: 8px;"></i>Sí, cambiar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal anterior si existe
    const modalAnterior = document.getElementById('modalConfirmacionTelefono');
    if (modalAnterior) modalAnterior.remove();
    
    // Crear y mostrar nuevo modal
    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div);
}

/**
 * Cerrar modal de confirmación de teléfono
 */
export function cerrarModalConfirmacionTelefono() {
    const modal = document.getElementById('modalConfirmacionTelefono');
    if (modal) modal.remove();
}

/**
 * Confirmar cambio de teléfono
 */
export function confirmarCambioTelefono(clienteId, telefonoNuevo, emailNuevo, direccionNueva) {
    cerrarModalConfirmacionTelefono();
    guardarCambiosClienteDirecto(clienteId, telefonoNuevo, emailNuevo, direccionNueva);
}

/**
 * Guardar cambios del cliente directamente
 */
async function guardarCambiosClienteDirecto(clienteId, telefonoNuevo, emailNuevo, direccionNueva) {
    const datosActualizados = {
        telefono: telefonoNuevo,
        email: emailNuevo || null,
        direccion: direccionNueva || null
    };

    try {
        mostrarModalCarga('Guardando...');
        
        const clienteActualizado = await putJSON(`${API.CLIENTES}/${clienteId}`, datosActualizados);

        if (!clienteActualizado || !clienteActualizado._id) {
            throw new Error('El servidor no devolvió un cliente válido');
        }

        cerrarModalCarga();
        cerrarModalVerCliente();
        
        // Actualizar en el caché
        const index = clientesCache.findIndex(c => c._id === clienteActualizado._id);
        if (index !== -1) {
            clientesCache[index] = clienteActualizado;
        }
        renderTablaClientes(clientesCache);
        
        mostrarNotificacionExito('Cliente actualizado');
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('❌ Error al guardar cambios:\n' + error.message);
    }
}

/**
 * Eliminar cliente (soft delete)
 */
async function eliminarCliente(id) {
    try {
        mostrarModalCarga('Eliminando...');
        
        // Soft delete: marcar como eliminado
        await putJSON(`${API.CLIENTES}/${id}`, { eliminado: true });

        cerrarModalCarga();
        await cargarClientes();
        cerrarModal('confirmModal');
        
        mostrarNotificacionExito('Cliente eliminado');
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al eliminar cliente');
    }
}

/**
 * Actualizar selects de clientes en otros formularios
 */
export async function actualizarSelectsClientes() {
    try {
        const clientes = await getJSON(API.CLIENTES);

        const selectClientes = document.getElementById('selectClientes');
        if (selectClientes) {
            const defaultOption = selectClientes.options[0];
            selectClientes.innerHTML = '';
            selectClientes.appendChild(defaultOption);

            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente._id;
                option.textContent = cliente.nombre;
                selectClientes.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al actualizar selects:', error);
    }
}

// Exportar cache para uso externo si es necesario
export { clientesCache };
