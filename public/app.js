// ==================== CONFIG ====================
// Detectar si estamos en local o en Netlify
const isLocal = window.location.hostname === 'localhost';
const API_BASE = isLocal ? 'http://localhost:3000' : window.location.origin;

// Usar /api/* en ambos casos - en Netlify los redirects de netlify.toml redirigen a las funciones
const API_CLIENTES = `${API_BASE}/api/clientes`;
const API_EQUIPOS = `${API_BASE}/api/equipos`;
const API_SERVICIOS = `${API_BASE}/api/servicios`;
const API_SERVICIO_EQUIPO = `${API_BASE}/api/servicio-equipo`;
const API_DECOLECTA = `${API_BASE}/api/decolecta`;
const API_URL = `${API_BASE}/api`;

// ✅ Interceptar fetch para validar URLs
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    // Validar que URL no contenga caracteres especiales o encoding incorrecto
    if (typeof url === 'string') {
        const urlStr = url.toLowerCase();
        // Rechazar URLs con caracteres especiales UTF-8 (replacement character)
        if (urlStr.includes('%ef%bf%bd') || urlStr.includes('undefined') || urlStr.includes('null')) {
            console.error('❌ URL INVÁLIDA - Fetch bloqueado:', url);
            return Promise.reject(new Error('URL inválida: ' + url));
        }
    }
    return originalFetch.apply(this, arguments);
};

let reniecData = null;

// ==================== UTILIDADES ====================

// ✅ Validar ID antes de hacer requests
function validarID(id) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
        console.error('❌ ID inválido:', id);
        return null;
    }
    return id.trim();
}

// ✅ Hacer request con manejo de errores
async function hacerRequest(url, options = {}) {
    try {
        console.log(`🔗 Request: ${url}`);
        const response = await fetch(url, options);
        
        if (!response.ok) {
            console.error(`❌ Error HTTP ${response.status}: ${url}`);
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error(`❌ Error en request: ${error.message}`);
        return null;
    }
}

// Función para obtener icono según tipo de equipo
function getIconoEquipo(tipo) {
    const iconos = {
        'Laptop': 'fas fa-laptop',
        'Desktop': 'fas fa-desktop',
        'Monitor': 'fas fa-tv',
        'Impresora': 'fas fa-print',
        'Otro': 'fas fa-cube'
    };
    return iconos[tipo] || 'fas fa-cube';
}

// Actualizar icono en modal nuevo equipo
function actualizarIconoNuevo() {
    const tipo = document.getElementById('tipoEquipoNuevoForm').value;
    const icono = document.getElementById('iconoNuevoEquipo');
    icono.className = getIconoEquipo(tipo);
}

// Actualizar icono en modal editar equipo
function actualizarIconoEditar() {
    const tipo = document.getElementById('editTipoEquipo').value;
    const icono = document.getElementById('iconoEditarEquipo');
    icono.className = getIconoEquipo(tipo);
}

// Función para alternar menú móvil
function toggleMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');

    // Cerrar menú al hacer clic en un botón de tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    });
}

// Mostrar/ocultar botón de menú según el tamaño de pantalla
function updateMenuToggleVisibility() {
    const menuToggle = document.getElementById('menuToggle');
    if (window.innerWidth <= 768) {
        menuToggle.style.display = 'inline-flex';
    } else {
        menuToggle.style.display = 'none';
        document.querySelector('.sidebar').classList.remove('open');
    }
}

// Evento de redimensión de ventana
window.addEventListener('resize', updateMenuToggleVisibility);

// Llamar función al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    updateMenuToggleVisibility();

    // Cerrar menú cuando se hace clic fuera de él
    document.addEventListener('click', function (event) {
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = document.getElementById('menuToggle');
        if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
            sidebar.classList.remove('open');
        }
    });
});

function mostrarExito(elementId) {
    const element = document.getElementById(elementId);
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 3000);
}

function switchTab(tab) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
    });

    // Mostrar tab seleccionado
    document.getElementById(tab + 'Tab').classList.add('active');
    event.target.classList.add('active');

    // Cargar datos cuando sea necesario
    if (tab === 'clientes') cargarClientes();
    if (tab === 'servicios') {
        cargarServicios();
        actualizarSelectsClientes();
        actualizarSelectsEquipos();
    }
    if (tab === 'equipos') {
        cargarEquipos();
        actualizarSelectsClientes();
    }
}

// ==================== CLIENTES ====================

// Abrir modal nuevo cliente
function abrirModalNuevoCliente() {
    document.getElementById('modalNuevoCliente').classList.add('show');
    document.getElementById('formModalCliente').reset();
    document.getElementById('decolectaError').style.display = 'none';
    document.getElementById('decolectaLoading').style.display = 'none';
}

// Cerrar modal nuevo cliente
function cerrarModalNuevoCliente() {
    document.getElementById('modalNuevoCliente').classList.remove('show');
    document.getElementById('formModalCliente').reset();
    document.getElementById('decolectaError').style.display = 'none';
    document.getElementById('decolectaLoading').style.display = 'none';
}

// Consultar DECOLECTA por DNI
async function consultarDecolecta() {
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
        const response = await fetch(`${API_DECOLECTA}/${dni}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error en la consulta');
        }

        const datos = await response.json();

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

// Guardar cliente desde modal
async function guardarClienteDesdeModal(e) {
    e.preventDefault();
    const formData = new FormData(document.getElementById('formModalCliente'));
    const cliente = Object.fromEntries(formData);

    try {
        // ✅ MEJORA: Mostrar modal de carga
        mostrarModalCarga('Guardando...');
        
        const response = await fetch(`${API_CLIENTES}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cliente)
        });

        if (!response.ok) {
            cerrarModalCarga();
            throw new Error('Error al guardar cliente');
        }

        // ✅ MEJORA: Cerrar modal de carga
        cerrarModalCarga();
        
        document.getElementById('formModalCliente').reset();
        cerrarModalNuevoCliente();
        cargarClientes();
        actualizarSelectsClientes();
        
        // ✅ MEJORA: Mostrar modal de éxito centrado
        mostrarNotificacionExito('Cliente guardado');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar cliente');
    }
}

async function cargarClientes() {
    const container = document.getElementById('clientesContainer');
    container.innerHTML = `
        <div class="loading-spinner-inline">
            <div class="loading-spinner-circle"></div>
            <p class="loading-spinner-text">Cargando clientes...</p>
        </div>`;
    try {
        const response = await fetch(`${API_CLIENTES}`);
        const clientes = await response.json();

        // Check if response is an error
        if (!response.ok || clientes.error || !Array.isArray(clientes)) {
            container.innerHTML = `<div class="error-message">Error al cargar clientes: ${clientes.error || 'Error desconocido'}</div>`;
            console.error('API error:', clientes);
            return;
        }

        if (clientes.length === 0) {
            container.innerHTML = '<div class="no-records">No hay clientes registrados</div>';
            return;
        }

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
            html += `
                <tr>
                    <td><strong>${cliente.nombre}</strong></td>
                    <td>${cliente.telefono || 'N/A'}</td>
                    <td>${cliente.email || 'N/A'}</td>
                    <td>${cliente.dni || 'N/A'}</td>
                    <td class="actions">
                         <button class="btn-edit" onclick="abrirModalVerCliente('${cliente._id}')">
                             <i class="fas fa-eye"></i> Ver
                         </button>
                         <button class="btn-danger" onclick="confirmarEliminarCliente('${cliente._id}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (error) {
        console.error('Error al cargar clientes:', error);
    }
}

async function filtrarClientes() {
    const busqueda = document.getElementById('searchClientes').value.toLowerCase();
    try {
        const response = await fetch(`${API_CLIENTES}`);
        const clientes = await response.json();
        
        // Check if response is an error
        if (!response.ok || clientes.error || !Array.isArray(clientes)) {
            console.error('API error:', clientes);
            return;
        }
        
        const filtrados = clientes.filter(c =>
            c.nombre.toLowerCase().includes(busqueda) ||
            (c.telefono && c.telefono.includes(busqueda)) ||
            (c.email && c.email.toLowerCase().includes(busqueda)) ||
            (c.dni && c.dni.includes(busqueda))
        );

        const container = document.getElementById('clientesContainer');

        if (filtrados.length === 0) {
            container.innerHTML = '<div class="no-records">No se encontraron clientes</div>';
            return;
        }

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

        filtrados.forEach(cliente => {
            html += `
                <tr>
                    <td><strong>${cliente.nombre}</strong></td>
                    <td>${cliente.telefono || 'N/A'}</td>
                    <td>${cliente.email || 'N/A'}</td>
                    <td>${cliente.dni || 'N/A'}</td>
                    <td class="actions">
                         <button class="btn-edit" onclick="abrirModalVerCliente('${cliente._id}')">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn-danger" onclick="confirmarEliminarCliente('${cliente._id}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Abrir modal con detalles del cliente
async function abrirModalVerCliente(id) {
    try {
        console.log('Abriendo cliente con ID:', id); // DEBUG
        
        // Primero intenta obtener el cliente específico por ID
        let cliente = null;
        const response = await fetch(`${API_CLIENTES}/${id}`);
        if (response.ok) {
            cliente = await response.json();
        } else {
            console.warn(`GET /api/clientes/${id} retornó ${response.status}`);
        }

        if (!cliente) {
            // Si no lo encuentra por ese ID, busca entre todos
            const responseAll = await fetch(`${API_URL}/clientes`);
            const clientes = await responseAll.json();
            console.log('Buscando entre', clientes.length, 'clientes');
            console.log('IDs disponibles:', clientes.map(c => c._id));
            cliente = clientes.find(c => c._id == id);
        }

        if (!cliente) {
            console.error('Cliente no encontrado con ID:', id);
            alert('⚠️ Cliente no encontrado. Recargando lista...');
            cargarClientes();
            return;
        }

        console.log('Cliente encontrado:', cliente);

        // Guardar datos originales para detectar cambios
        window.clienteEnEdicion = {
            _id: cliente._id,
            ...cliente
        };

        const detalles = `
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

        document.getElementById('detallesClienteContent').innerHTML = detalles;
        document.getElementById('modalVerCliente').classList.add('show');
    } catch (error) {
        console.error('Error:', error);
    }
}

// Guardar cambios del cliente
async function guardarEdicionCliente(clienteId) {
    const telefonoNuevo = document.getElementById('telefonoEditar').value.trim();
    const emailNuevo = document.getElementById('emailEditar').value.trim();
    const direccionNueva = document.getElementById('direccionEditar').value.trim();

    // Validar que el teléfono sea obligatorio
    if (!telefonoNuevo) {
        alert('El teléfono es obligatorio');
        return;
    }

    // ✅ MEJORA: Detectar si hubo cambios reales
    const telefonoCambio = window.clienteEnEdicion.telefono !== telefonoNuevo;
    const emailCambio = (window.clienteEnEdicion.email || '') !== emailNuevo;
    const direccionCambio = (window.clienteEnEdicion.direccion || '') !== direccionNueva;
    
    const huboCambios = telefonoCambio || emailCambio || direccionCambio;
    
    // Si no hubo cambios, solo cerrar modal
    if (!huboCambios) {
        cerrarModalVerCliente();
        return;
    }

    // Si cambió el teléfono, mostrar modal de confirmación
    if (telefonoCambio) {
        mostrarModalConfirmacionTelefono(
            window.clienteEnEdicion.telefono || 'sin teléfono',
            telefonoNuevo,
            clienteId,
            emailNuevo,
            direccionNueva
        );
        return;
    }

    // Si no cambió el teléfono, guardar directamente
    guardarCambiosClienteDirecto(clienteId, telefonoNuevo, emailNuevo, direccionNueva);
}

// Modal de confirmación para cambio de teléfono
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
                    <button onclick="cerrarModalConfirmacionTelefono()" style="flex: 1; padding: 12px; background: #e0e0e0; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s;">
                        <i class="fas fa-times" style="margin-right: 8px;"></i>Cancelar
                    </button>
                    <button onclick="confirmarCambioTelefono('${clienteId}', '${telefonoNuevo}', '${emailNuevo}', '${direccionNueva}')" style="flex: 1; padding: 12px; background: #2192B8; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s;">
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

function cerrarModalConfirmacionTelefono() {
    const modal = document.getElementById('modalConfirmacionTelefono');
    if (modal) modal.remove();
}

function confirmarCambioTelefono(clienteId, telefonoNuevo, emailNuevo, direccionNueva) {
    cerrarModalConfirmacionTelefono();
    guardarCambiosClienteDirecto(clienteId, telefonoNuevo, emailNuevo, direccionNueva);
}

// Guardar cambios del cliente (sin confirmación adicional)
async function guardarCambiosClienteDirecto(clienteId, telefonoNuevo, emailNuevo, direccionNueva) {
    const datosActualizados = {
        telefono: telefonoNuevo,
        email: emailNuevo || null,
        direccion: direccionNueva || null
    };

    try {
        // ✅ MEJORA: Mostrar modal de carga
        mostrarModalCarga('Guardando...');
        
        const response = await fetch(`${API_CLIENTES}/${clienteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosActualizados)
        });

        if (!response.ok) {
            cerrarModalCarga();
            const errorData = await response.json();
            const errorMsg = errorData.error || 'Error al actualizar cliente';
            const detalles = errorData.detalles ? '\n\nDetalles:\n' + errorData.detalles.join('\n') : '';
            throw new Error(errorMsg + detalles);
        }

        // ✅ MEJORA: Cerrar modal de carga
        cerrarModalCarga();
        
        cerrarModalVerCliente();
        cargarClientes();
        
        // ✅ MEJORA: Mostrar modal de éxito centrado
        mostrarNotificacionExito('Cliente actualizado');
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al guardar cambios:\n' + error.message);
    }
}

// Cerrar modal detalles cliente
function cerrarModalVerCliente() {
    document.getElementById('modalVerCliente').classList.remove('show');
}

// Eliminar cliente desde modal detalles
function confirmarEliminarClienteDesdeModal(id) {
    cerrarModalVerCliente();
    confirmarEliminarCliente(id);
}

async function confirmarEliminarCliente(id) {
    document.getElementById('confirmMsg').textContent = '¿Estás seguro de que deseas eliminar este cliente?';
    document.getElementById('confirmBtn').onclick = () => eliminarCliente(id);
    document.getElementById('confirmModal').classList.add('show');
}

async function eliminarCliente(id) {
    try {
        // ✅ MEJORA: Mostrar modal de carga
        mostrarModalCarga('Eliminando...');
        
        const response = await fetch(`${API_CLIENTES}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            cerrarModalCarga();
            throw new Error('Error al eliminar');
        }

        // ✅ MEJORA: Cerrar modal de carga
        cerrarModalCarga();
        
        cargarClientes();
        cerrarModal();
        
        // ✅ MEJORA: Mostrar modal de éxito centrado
        mostrarNotificacionExito('Cliente eliminado');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar cliente');
    }
}

async function actualizarSelectsClientes() {
    try {
        const response = await fetch(`${API_CLIENTES}`);
        const clientes = await response.json();

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
        console.error('Error:', error);
    }
}

// ==================== SERVICIOS ====================

// MEJORA 6: Tarifas estimadas por tipo de equipo y problema
const TARIFAS_ESTIMADAS = {
    'Laptop': {
        'pantalla_rota': 80,
        'bateria': 60,
        'lento': 40,
        'no_enciende': 100,
        'teclado': 50,
        'ventilador': 30
    },
    'Desktop': {
        'monitor': 60,
        'fuente': 50,
        'ram': 30,
        'disco': 40,
        'lento': 35
    },
    'Impresora': {
        'no_imprime': 45,
        'papel_atasco': 25,
        'cartucho': 50,
        'tinta': 40
    }
};

// MEJORA 5: Problemas pre-configurados por tipo de equipo
const PROBLEMAS_TIPO_EQUIPO = {
    'Laptop': [
        { id: 'pantalla_rota', label: 'Pantalla rota', icono: '🖥️' },
        { id: 'bateria', label: 'Batería no carga', icono: '🔋' },
        { id: 'lento', label: 'Equipo lento', icono: '⚡' },
        { id: 'no_enciende', label: 'No enciende', icono: '💻' },
        { id: 'teclado', label: 'Teclado dañado', icono: '⌨️' },
        { id: 'ventilador', label: 'Ventilador ruidoso', icono: '🌀' }
    ],
    'Desktop': [
        { id: 'monitor', label: 'Monitor', icono: '🖥️' },
        { id: 'fuente', label: 'Fuente de poder', icono: '⚡' },
        { id: 'ram', label: 'Memoria RAM', icono: '💾' },
        { id: 'disco', label: 'Disco duro', icono: '💿' },
        { id: 'lento', label: 'Sistema lento', icono: '🐌' }
    ],
    'Impresora': [
        { id: 'no_imprime', label: 'No imprime', icono: '🖨️' },
        { id: 'papel_atasco', label: 'Papel atascado', icono: '📄' },
        { id: 'cartucho', label: 'Cartucho vacío', icono: '🎨' },
        { id: 'tinta', label: 'Falta tinta', icono: '🖨️' }
    ]
};

// Nueva función que funciona con tipo de equipo directamente
function actualizarProblemasSegunEquipoTipo(tipoEquipo) {
    const problemas = PROBLEMAS_TIPO_EQUIPO[tipoEquipo] || [];
    const container = document.getElementById('problemasCheckbox');

    if (!container) return;

    let html = '';
    problemas.forEach(problema => {
        html += `
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" value="${problema.id}" name="problema_${problema.id}" 
                       onchange="actualizarTextareaProblemas()">
                <span>${problema.icono} ${problema.label}</span>
            </label>
        `;
    });

    container.innerHTML = html;
}

// Función antigua mantenida por compatibilidad
function actualizarProblemasSegunEquipo(equipoId) {
    // Obtener tipo de equipo del select
    const equipoSelect = document.getElementById('equipo_id');
    const opcionSeleccionada = equipoSelect.options[equipoSelect.selectedIndex];
    const tipoEquipo = opcionSeleccionada?.dataset?.tipoEquipo || opcionSeleccionada?.text?.split('-')[0]?.trim();

    actualizarProblemasSegunEquipoTipo(tipoEquipo);
}

// Agregar problema desde atajos rápidos
function agregarProblemaAtajo(problema) {
    const textarea = document.getElementById('problemasTexto');
    
    if (!textarea) return;
    
    let textoActual = textarea.value.trim();
    
    // Si ya existe el problema, no lo agregamos de nuevo
    if (textoActual.includes('- ' + problema)) {
        return;
    }
    
    // Si el textarea está vacío, solo agregar el problema
    if (!textoActual) {
        textarea.value = '- ' + problema;
    } else {
        // Agregar en nueva línea
        textarea.value = textoActual + '\n- ' + problema;
    }
    
    // Enfocar textarea
    textarea.focus();
}

function actualizarTextareaProblemas() {
    const checkboxes = document.querySelectorAll('#problemasCheckbox input:checked');
    const problemasSeleccionados = Array.from(checkboxes)
        .map(cb => cb.value.replace(/_/g, ' ').toUpperCase());

    const textarea = document.getElementById('problemasTexto');
    const problemasActuales = textarea.value.trim();

    let textoFinal = problemasSeleccionados.join(', ');
    if (problemasActuales && !problemasSeleccionados.includes(problemasActuales)) {
        textoFinal += (textoFinal ? ' | ' : '') + problemasActuales;
    }

    textarea.value = textoFinal;

    // MEJORA 6: Recalcular presupuesto cuando cambian los problemas
    calcularPresupuestoEstimado();
}

// MEJORA 6: Calcular presupuesto automático
function calcularPresupuestoEstimado() {
    const equipoSelect = document.getElementById('equipo_id');
    if (!equipoSelect || !equipoSelect.value) return;

    const opcionSeleccionada = equipoSelect.options[equipoSelect.selectedIndex];
    const tipoEquipo = opcionSeleccionada?.dataset?.tipoEquipo || opcionSeleccionada?.text?.split('-')[0]?.trim();

    const checkboxes = document.querySelectorAll('#problemasCheckbox input:checked');

    let totalEstimado = 0;
    const problemasCosto = [];

    checkboxes.forEach(cb => {
        const costo = TARIFAS_ESTIMADAS[tipoEquipo]?.[cb.value] || 0;
        totalEstimado += costo;
        problemasCosto.push({
            problema: cb.value.replace(/_/g, ' '),
            costo: costo
        });
    });

    // Mostrar desglose
    mostrarDesglose(problemasCosto, totalEstimado);

    // Actualizar campo de monto
    const montoInput = document.getElementById('montoEstimado') || document.getElementById('monto');
    if (montoInput) {
        montoInput.value = totalEstimado.toFixed(2);
        montoInput.style.color = '#2192B8';
        montoInput.title = 'Presupuesto automático calculado';
    }
}

function mostrarDesglose(problemasCosto, total) {
    const desglose = document.getElementById('desgloseMonto');
    if (!desglose) return;

    let html = '<div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0;">';
    html += '<strong>💰 Desglose de Costos:</strong>';

    if (problemasCosto.length === 0) {
        html += '<div style="padding: 10px; color: #999;">Selecciona problemas para ver el presupuesto</div>';
    } else {
        problemasCosto.forEach(item => {
            html += `<div style="display: flex; justify-content: space-between; padding: 5px;">
                        <span>${item.problema.toUpperCase()}</span>
                        <span>$${item.costo.toFixed(2)}</span>
                     </div>`;
        });

        html += `<div style="border-top: 1px solid #ddd; padding-top: 5px; font-weight: bold; display: flex; justify-content: space-between;">
                    <span>TOTAL ESTIMADO:</span>
                    <span style="color: #2192B8; font-size: 16px;">$${total.toFixed(2)}</span>
                 </div>`;
    }

    html += '</div>';
    desglose.innerHTML = html;
}

// Abrir modal nuevo servicio
async function abrirModalNuevoServicio() {
    try {
        document.getElementById('modalNuevoServicio').classList.add('show');
        document.getElementById('formServicio').reset();

        // MEJORA 4: Generar número de servicio secuencial
        const numeroServicio = await generarNumeroSecuencial();
        document.getElementById('numeroServicio').value = numeroServicio;

        // Establecer fecha actual
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('fechaServicio').value = hoy;

        // MEJORA 3: Establecer hora actual y validar horario laboral
        const ahora = new Date();
        const horaFormato = String(ahora.getHours()).padStart(2, '0') + ':' +
            String(ahora.getMinutes()).padStart(2, '0');

        const horaServicioInput = document.getElementById('horaServicio');
        if (horaServicioInput) {
            horaServicioInput.value = horaFormato;
            
            // Actualizar la hora automáticamente cada segundo mientras el modal está abierto
            window.actualizadorHora = setInterval(() => {
                const ahora = new Date();
                const horaActual = String(ahora.getHours()).padStart(2, '0') + ':' +
                    String(ahora.getMinutes()).padStart(2, '0');
                
                // Solo actualizar si el campo no tiene enfoque (no está siendo editado manualmente)
                if (document.activeElement !== horaServicioInput) {
                    horaServicioInput.value = horaActual;
                }
            }, 1000);
        }

        // ✅ REMOVIDO: Validación de horario laboral - se puede registrar en cualquier momento

        // Limpiar selección de cliente
        document.getElementById('cliente_id').value = '';
        document.getElementById('clienteSeleccionado').value = '';

        document.getElementById('btnBuscarEquipo').disabled = false;

        // Limpiar selección de equipo
        document.getElementById('equipo_id').value = '';
        document.getElementById('equipoSeleccionado').value = '';
        window.clienteIdActual = null;
    } catch (error) {
        console.error('Error:', error);
        alert('Error al abrir modal de nuevo servicio');
    }
}

// MEJORA 4: Generar número de servicio secuencial
async function generarNumeroSecuencial() {
    try {
        // Opción 1: Obtener del servidor
        const response = await fetch(`${API_SERVICIOS}/proximo-numero`);
        if (response.ok) {
            const datos = await response.json();
            return datos.numero; // SRV-2025-001
        }
    } catch (error) {
        console.error('Error al obtener número del servidor:', error);
    }

    // Opción 2: Generar localmente (si no hay servidor)
    try {
        const servicios = await fetch(`${API_SERVICIOS}`);
        const todosServicios = await servicios.json();

        const ano = new Date().getFullYear();
        const contador = todosServicios.filter(s =>
            s.numero_servicio && s.numero_servicio.startsWith(`SRV-${ano}`)
        ).length + 1;

        return `SRV-${ano}-${String(contador).padStart(3, '0')}`;
    } catch (error) {
        console.error('Error:', error);
        // Fallback: usar timestamp
        return 'SRV-' + Date.now();
    }
}

// Cerrar modal nuevo servicio
function cerrarModalNuevoServicio() {
    // Detener la actualización automática de hora
    if (window.actualizadorHora) {
        clearInterval(window.actualizadorHora);
        window.actualizadorHora = null;
    }
    
    document.getElementById('modalNuevoServicio').classList.remove('show');
    document.getElementById('formServicio').reset();
}

// Abrir modal seleccionar cliente
function abrirModalSeleccionarCliente() {
    document.getElementById('modalSeleccionarCliente').classList.add('show');
    document.getElementById('dniClienteBusqueda').value = '';
    document.getElementById('dniClienteBusqueda').focus();
    document.getElementById('clientesBusquedaContainer').innerHTML = '<div id="mensajeBusqueda" style="text-align: center; color: #999; padding: 20px;">Ingrese un DNI para buscar</div>';
    document.getElementById('btnConsultarReniecServicio').style.display = 'none';
    document.getElementById('resultadoReniec').style.display = 'none';
    document.getElementById('errorReniec').style.display = 'none';
}

// Cerrar modal seleccionar cliente
function cerrarModalSeleccionarCliente() {
    document.getElementById('modalSeleccionarCliente').classList.remove('show');
    
    // ✅ Habilitar botón de equipo si hay cliente seleccionado
    const clienteIdInput = document.getElementById('cliente_id').value;
    if (clienteIdInput) {
        document.getElementById('btnBuscarEquipo').disabled = false;
    }
}

// Buscar clientes por DNI en tiempo real
async function buscarClientesPorDNI() {
    const dni = document.getElementById('dniClienteBusqueda').value.trim();
    const btnReniec = document.getElementById('btnConsultarReniecServicio');
    const container = document.getElementById('clientesBusquedaContainer');

    if (!dni) {
        container.innerHTML = '<div id="mensajeBusqueda" style="text-align: center; color: #999; padding: 20px;">Ingrese un DNI para buscar</div>';
        btnReniec.style.display = 'none';
        document.getElementById('resultadoReniec').style.display = 'none';
        document.getElementById('errorReniec').style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${API_CLIENTES}`);
        const clientes = await response.json();
        const coincidencias = clientes.filter(c => c.dni && c.dni.includes(dni));

        if (coincidencias.length > 0) {
            // Si encuentra clientes, mostrarlos
            let html = '<div style="max-height: 300px; overflow-y: auto;">';
            coincidencias.forEach(cliente => {
                html += `
                    <div style="padding: 12px; border: 1px solid #ddd; margin-bottom: 8px; border-radius: 4px; cursor: pointer; background: #fff; transition: background 0.2s;" onclick="seleccionarClienteServicio('${cliente._id}', '${cliente.nombre}')" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                        <strong>${cliente.nombre}</strong><br>
                        <small>DNI: ${cliente.dni} | Tel: ${cliente.telefono || 'N/A'}</small>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
            btnReniec.style.display = 'none';
            document.getElementById('resultadoReniec').style.display = 'none';
            document.getElementById('errorReniec').style.display = 'none';
        } else {
            // Si no encuentra, mostrar opción de consultar RENIEC
            container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No se encontraron clientes con este DNI</div>';

            // Validar que el DNI sea válido para RENIEC
            if (/^\d{8}$/.test(dni)) {
                btnReniec.style.display = 'inline-block';
                document.getElementById('resultadoReniec').style.display = 'none';
            } else {
                btnReniec.style.display = 'none';
            }
            document.getElementById('errorReniec').style.display = 'none';
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div style="text-align: center; color: #d32f2f; padding: 20px;">Error al buscar clientes</div>';
    }
}

// Seleccionar cliente desde la búsqueda
async function seleccionarClienteServicio(clienteId, clienteNombre) {
    // Obtener datos del cliente para verificar teléfono
    try {
        const response = await fetch(`${API_CLIENTES}`);
        const clientes = await response.json();
        const cliente = clientes.find(c => String(c._id) === String(clienteId));

        if (cliente) {
            // Guardar datos temporales
            window.clienteSeleccionadoTemp = {
                _id: clienteId,
                nombre: clienteNombre,
                dni: cliente.dni || '',
                telefono: cliente.telefono || '',
                email: cliente.email || ''
            };

            // Mostrar sección de confirmación de teléfono
            document.getElementById('clientesBusquedaContainer').style.display = 'none';
            document.getElementById('btnConsultarReniecServicio').style.display = 'none';
            document.getElementById('nombreClienteConfirm').textContent = `Cliente: ${clienteNombre}`;

            // Si tiene teléfono, mostrarlo como readonly, sino dejar vacío para que lo ingrese
            const telefonoInput = document.getElementById('telefonoClienteServicio');
            if (cliente.telefono) {
                telefonoInput.value = cliente.telefono;
                telefonoInput.readOnly = true;
            } else {
                telefonoInput.value = '';
                telefonoInput.readOnly = false;
                telefonoInput.focus();
            }

            document.getElementById('seccionTelefonoCliente').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al obtener datos del cliente');
    }
}

// Confirmar cliente con teléfono
async function confirmarClienteConTelefono() {
    const telefono = document.getElementById('telefonoClienteServicio').value.trim();
    const cliente = window.clienteSeleccionadoTemp;

    // MEJORA 1: Validar teléfono del cliente
    const errores = [];

    // 1. Validar teléfono obligatorio
    if (!telefono) {
        errores.push('El número de teléfono es obligatorio');
    } else if (!/^\d{7,9}$/.test(telefono)) {
        // 2. Validar formato: 7-9 dígitos solamente
        errores.push('El teléfono debe tener 7-9 dígitos');
    }

    // 4. Mostrar errores si existen (solo de teléfono)
    if (errores.length > 0) {
        alert('❌ Errores en la validación:\n\n' + errores.join('\n'));
        return;
    }

    // Si el cliente no tenía teléfono, actualizarlo
    if (!cliente.telefono) {
        try {
            const response = await fetch(`${API_URL}/clientes/${cliente._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefono: telefono })
            });

            if (!response.ok) {
                console.error('Advertencia: No se pudo actualizar teléfono en BD');
                // Continuar de todas formas - el teléfono fue ingresado
            }
        } catch (error) {
            console.error('Error al actualizar teléfono:', error);
            // Continuar de todas formas - el teléfono fue ingresado
        }
    }

    // Seleccionar el cliente
    document.getElementById('cliente_id').value = cliente._id;
    document.getElementById('clienteSeleccionado').value = cliente.nombre;
    window.clienteIdActual = cliente._id; // Guardar ID para luego usar en equipos
    cerrarModalSeleccionarCliente();
    cargarClientes();
    actualizarSelectsClientes();

    // ✅ MEJORA: Habilitar botón de equipo después de seleccionar cliente
    document.getElementById('btnBuscarEquipo').disabled = false;

    // Mensaje de éxito
    console.log('✅ Validación completada exitosamente');
}

// NUEVO: Cargar todos los equipos disponibles
async function cargarEquiposDelCliente(clienteId) {
    try {
        const response = await fetch(`${API_EQUIPOS}`);
        const equipos = response.ok ? await response.json() : [];

        mostrarModalEquiposCliente(equipos, clienteId);
    } catch (error) {
        console.error('Error al cargar equipos:', error);
        mostrarModalEquiposCliente([], clienteId);
    }
}

// NUEVO: Abrirmodal equipos desde botón "Buscar"
async function abrirModalEquiposDelCliente() {
    const clienteId = window.clienteIdActual || null;

    try {
        const response = await fetch(`${API_EQUIPOS}`);
        const equipos = response.ok ? await response.json() : [];

        mostrarModalEquiposCliente(equipos, clienteId);
    } catch (error) {
        console.error('Error al cargar equipos:', error);
        mostrarModalEquiposCliente([], clienteId);
    }
}

// NUEVO: Mostrar modal con equipos del cliente
function mostrarModalEquiposCliente(equipos, clienteId) {
    // Crear modal de selección de equipo
    const existente = document.getElementById('modalEquiposCliente');
    if (existente) existente.remove();

    const modal = document.createElement('div');
    modal.id = 'modalEquiposCliente';
    modal.className = 'modal show';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    let contenidoEquipos = '';

    if (equipos.length > 0) {
        contenidoEquipos = '<div style="margin-bottom: 20px;"><h4 style="color: #2192B8; margin-bottom: 10px;"><i class="fas fa-list" style="margin-right: 8px;"></i>Equipos Disponibles:</h4>';

        equipos.forEach(equipo => {
            const icono = getIconoEquipo(equipo.tipo_equipo);

            contenidoEquipos += `
                <div style="background: white; padding: 10px; margin: 8px 0; border-radius: 4px; border-left: 4px solid #2192B8; cursor: pointer;" 
                     onclick="seleccionarEquipo('${equipo._id}', '${equipo.tipo_equipo} - ${equipo.marca} ${equipo.modelo}')">
                    <i class="${icono}" style="color: #2192B8; margin-right: 8px; width: 16px;"></i><strong>${equipo.tipo_equipo}</strong> - ${equipo.marca} ${equipo.modelo}
                    ${equipo.numero_serie ? `<br><small style="color: #666; margin-left: 24px;">Serie: ${equipo.numero_serie}</small>` : ''}
                </div>
            `;
        });

        contenidoEquipos += '</div>';
    }

    const html = `
        <div class="modal-content" style="max-width: 500px; padding: 20px;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #2192B8;"><i class="fas fa-cogs" style="margin-right: 10px;"></i>Seleccionar Equipo</h2>
                <button class="close-btn" onclick="document.getElementById('modalEquiposCliente').remove()">×</button>
            </div>
            
            ${contenidoEquipos}
            
            <div style="background: #f0f8ff; padding: 15px; border-radius: 4px; border: 2px solid #2192B8; margin: 20px 0;">
                <h4 style="color: #2192B8; margin-top: 0;"><i class="fas fa-plus" style="margin-right: 8px;"></i>Agregar Nuevo Equipo</h4>
                <p style="font-size: 13px; color: #666; margin-bottom: 15px;">O registra un equipo nuevo que será seleccionado automáticamente</p>
                <button onclick="abrirFormularioNuevoEquipo('${clienteId}')" 
                    style="width: 100%; padding: 10px; background: #2192B8; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    <i class="fas fa-plus" style="margin-right: 5px;"></i>Agregar Equipo Nuevo
                </button>
            </div>
            
            <button onclick="document.getElementById('modalEquiposCliente').remove()" 
                style="width: 100%; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 10px;">
                Cerrar
            </button>
        </div>
    `;

    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// NUEVO: Abrir formulario para agregar equipo nuevo
function abrirFormularioNuevoEquipo(clienteId) {
    document.getElementById('modalEquiposCliente').remove();

    const modal = document.createElement('div');
    modal.id = 'modalNuevoEquipoServicio';
    modal.className = 'modal show';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    const html = `
        <div class="modal-content" style="max-width: 500px; padding: 20px;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #2192B8;"><i class="fas fa-plus" style="margin-right: 10px;"></i>Nuevo Equipo</h2>
                <button class="close-btn" onclick="document.getElementById('modalNuevoEquipoServicio').remove()">×</button>
            </div>
            
            <form id="formNuevoEquipoServicio" onsubmit="guardarNuevoEquipoYSeleccionar(event, '${clienteId}')">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Tipo de Equipo *</label>
                    <select id="tipoEquipoNuevo" name="tipo_equipo" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">-- Selecciona tipo --</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Desktop">Desktop</option>
                        <option value="Impresora">Impresora</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Marca *</label>
                    <input type="text" id="marcaEquipoNuevo" name="marca" placeholder="Ej: Dell, HP, Lenovo..." required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Modelo *</label>
                    <input type="text" id="modeloEquipoNuevo" name="modelo" placeholder="Ej: Inspiron 15..." required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Serie (Opcional)</label>
                    <input type="text" id="serieEquipoNuevo" name="serie" placeholder="Ej: ABC123XYZ..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="button" onclick="document.getElementById('modalNuevoEquipoServicio').remove()" 
                        style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        Cancelar
                    </button>
                    <button type="submit" 
                        style="flex: 1; padding: 10px; background: #2192B8; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ✅ Guardar y Seleccionar
                    </button>
                </div>
            </form>
        </div>
    `;

    modal.innerHTML = html;
    document.body.appendChild(modal);
    document.getElementById('tipoEquipoNuevo').focus();
}

// NUEVO: Guardar nuevo equipo y seleccionarlo automáticamente
async function guardarNuevoEquipoYSeleccionar(event, clienteId) {
    event.preventDefault();

    const equipo = {
        tipo_equipo: document.getElementById('tipoEquipoNuevo').value,
        marca: document.getElementById('marcaEquipoNuevo').value,
        modelo: document.getElementById('modeloEquipoNuevo').value,
        serie: document.getElementById('serieEquipoNuevo').value || null
    };

    try {
        const response = await fetch(`${API_EQUIPOS}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(equipo)
        });

        if (response.ok) {
            const equipoGuardado = await response.json();

            // Seleccionar automáticamente el nuevo equipo
            seleccionarEquipo(equipoGuardado.id, `${equipo.tipo_equipo} - ${equipo.marca} ${equipo.modelo}`);

            document.getElementById('modalNuevoEquipoServicio').remove();
            alert('✅ Equipo registrado y seleccionado');
        } else {
            alert('❌ Error al guardar equipo');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al guardar equipo');
    }
}

// NUEVO: Seleccionar equipo (mostrar en campo y cerrar modal)
function seleccionarEquipo(equipoId, equipoNombre) {
    const equipoSelect = document.getElementById('equipo_id');
    if (equipoSelect) {
        equipoSelect.value = equipoId;
    }

    const equipoText = document.getElementById('equipoSeleccionado');
    if (equipoText) {
        equipoText.value = equipoNombre;
    }

    // Actualizar problemas según equipo
    actualizarProblemasSegunEquipo(equipoId);

    // Cerrar modal
    const modal = document.getElementById('modalEquiposCliente');
    if (modal) modal.remove();

    console.log('✅ Equipo seleccionado:', equipoNombre);
}

// Limpiar selección y volver a búsqueda
function limpiarSeleccionClienteServicio() {
    document.getElementById('seccionTelefonoCliente').style.display = 'none';
    document.getElementById('clientesBusquedaContainer').style.display = 'block';
    document.getElementById('dniClienteBusqueda').focus();
}

// Consultar RENIEC desde el modal de servicio
async function consultarReniecServicio() {
    const dni = document.getElementById('dniClienteBusqueda').value.trim();

    if (!dni || !/^\d{8}$/.test(dni)) {
        document.getElementById('mensajeErrorReniec').textContent = 'DNI inválido. Debe tener 8 dígitos';
        document.getElementById('errorReniec').style.display = 'block';
        return;
    }

    document.getElementById('loadingReniec').style.display = 'block';
    document.getElementById('errorReniec').style.display = 'none';
    document.getElementById('resultadoReniec').style.display = 'none';

    try {
        const response = await fetch(`${API_DECOLECTA}/${dni}`);

        if (!response.ok) {
            throw new Error('No se encontraron datos para este DNI');
        }

        const datos = await response.json();
        window.reniecDataServicio = datos;

        const html = `
            <p><strong>Nombre:</strong> ${datos.first_name || 'N/A'}</p>
            <p><strong>Apellido Paterno:</strong> ${datos.first_last_name || 'N/A'}</p>
            <p><strong>Apellido Materno:</strong> ${datos.second_last_name || 'N/A'}</p>
            <p><strong>DNI:</strong> ${datos.document_number || dni}</p>
        `;
        document.getElementById('datosReniecServicio').innerHTML = html;
        document.getElementById('resultadoReniec').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('mensajeErrorReniec').textContent = error.message || 'Error al consultar RENIEC';
        document.getElementById('errorReniec').style.display = 'block';
    } finally {
        document.getElementById('loadingReniec').style.display = 'none';
    }
}

// Agregar cliente desde RENIEC en servicio
async function agregarClienteDesdeReniecServicio() {
    if (!window.reniecDataServicio) return;

    const telefono = document.getElementById('telefonoReniecServicio').value.trim();

    if (!telefono) {
        alert('El número de teléfono es obligatorio');
        return;
    }

    const cliente = {
        nombre: window.reniecDataServicio.first_name || '',
        apellido_paterno: window.reniecDataServicio.first_last_name || '',
        apellido_materno: window.reniecDataServicio.second_last_name || '',
        dni: window.reniecDataServicio.document_number || document.getElementById('dniClienteBusqueda').value,
        telefono: telefono,
        email: '',
        direccion: ''
    };

    try {
        const response = await fetch(`${API_CLIENTES}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cliente)
        });

        if (!response.ok) throw new Error('Error al guardar cliente');

        const clienteGuardado = await response.json();

         // ✅ Seleccionar el cliente creado
         document.getElementById('cliente_id').value = clienteGuardado._id;
         document.getElementById('clienteSeleccionado').value = clienteGuardado.nombre;
         window.clienteIdActual = clienteGuardado._id; // Guardar ID para equipos
         
         // ✅ Habilitar botón de equipo
         document.getElementById('btnBuscarEquipo').disabled = false;

         cerrarModalSeleccionarCliente();
         cargarClientes();
         actualizarSelectsClientes();
         
         console.log('✅ Cliente importado desde RENIEC:', clienteGuardado);
        } catch (error) {
         console.error('❌ Error:', error);
         alert('Error al guardar cliente: ' + error.message);
        }
        }

// MEJORA 2: Validar estado del equipo
async function validarEquipo(equipoId) {
    try {
        const response = await fetch(`${API_EQUIPOS}/${equipoId}`);
        const equipo = await response.json();

        // Verificar estado
        if (equipo.estado === 'En reparación') {
            const servicios = await fetch(`${API_SERVICIOS}?equipo_id=${equipoId}`);
            const serviciosActivos = await servicios.json();
            const servicioActivo = serviciosActivos.find(s => s.estado !== 'Completado');

            alert(`⚠️ Este equipo ya está siendo reparado\n\n` +
                `Servicio: ${servicioActivo ? servicioActivo.numero_servicio : 'N/A'}\n` +
                `Estado: ${servicioActivo ? servicioActivo.estado : 'N/A'}`);
            return false;
        }

        if (equipo.estado === 'Fuera de servicio') {
            alert('❌ Este equipo está fuera de servicio y no puede ser reparado');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error:', error);
        return true; // Permitir si no hay equipo (compatibilidad hacia atrás)
    }
}

// MEJORA 3: Validar horario laboral
function esHorarioLaboral(fecha) {
    const hora = fecha.getHours();
    const diaSemana = fecha.getDay();

    // De lunes (1) a viernes (5), 08:00 a 20:00
    const esLaborable = diaSemana >= 1 && diaSemana <= 5;
    const esHoraValida = hora >= 8 && hora < 20;

    return esLaborable && esHoraValida;
}

function validarHoraServicio() {
    const horaInput = document.getElementById('horaServicio');

    // Si el elemento no existe, permitir (compatibilidad hacia atrás)
    if (!horaInput) {
        return true;
    }

    const hora = horaInput.value;

    if (!hora) {
        alert('❌ Debe ingresar una hora');
        return false;
    }

    const [horas, minutos] = hora.split(':').map(Number);

    // Validar rango horario
    if (horas < 8 || horas >= 20) {
        alert('❌ Horario válido: 08:00 - 20:00');
        horaInput.focus();
        return false;
    }

    return true;
}

async function guardarServicio(e) {
    e.preventDefault();
    const formData = new FormData(document.getElementById('formServicio'));
    const servicio = Object.fromEntries(formData);

    // Asegurar que equipo_id se incluye aunque esté vacío
    if (!servicio.equipo_id) {
        servicio.equipo_id = document.getElementById('equipo_id').value || null;
    }

    console.log('Servicio a guardar:', servicio);

    // MEJORA 2: Validar equipo antes de guardar
    const equipoId = document.getElementById('equipo_id').value;
    if (equipoId && !(await validarEquipo(equipoId))) {
        return;
    }

    // MEJORA 3: Validar hora de servicio antes de guardar
    if (!validarHoraServicio()) {
        return;
    }

    // Agregar estado inicial
    servicio.estado = 'Pendiente de evaluación';

    // MEJORA 7: Mostrar resumen antes de guardar
    await mostrarResumenServicio(servicio);
}

// MEJORA 7: Mostrar resumen del servicio antes de guardar
async function mostrarResumenServicio(servicio) {
    try {
        // Inicializar objetos por defecto
        let cliente = { nombre: 'N/A', dni: 'N/A', telefono: 'N/A', email: 'N/A' };
        let equipo = { tipo_equipo: 'N/A', marca: 'N/A', modelo: 'N/A', serie: 'N/A' };
        
        // Usar IDs como strings (son ObjectId de MongoDB, no números)
        const clienteId = servicio.cliente_id ? servicio.cliente_id : null;
        const equipoId = servicio.equipo_id ? servicio.equipo_id : null;
        
        // ✅ MEJORA: Intentar usar datos del cliente en memoria primero
        if (clienteId && window.clienteSeleccionadoTemp && window.clienteSeleccionadoTemp._id === clienteId) {
            cliente = window.clienteSeleccionadoTemp;
        } else if (clienteId) {
            // Obtener datos del cliente si existe
            try {
                const clienteRes = await fetch(`${API_URL}/clientes/${clienteId}`);
                if (clienteRes.ok) {
                    cliente = await clienteRes.json();
                } else {
                    console.warn('Cliente no encontrado:', clienteId);
                    // Si tampoco está en memoria, intentar desde FormData
                    const nombreCliente = document.getElementById('clienteSeleccionado').value;
                    if (nombreCliente) {
                        cliente.nombre = nombreCliente;
                    }
                }
            } catch (clienteError) {
                console.error('Error al obtener cliente:', clienteError);
                const nombreCliente = document.getElementById('clienteSeleccionado').value;
                if (nombreCliente) {
                    cliente.nombre = nombreCliente;
                }
            }
        }

        // ✅ MEJORA: Intentar usar datos del equipo en memoria primero
        if (equipoId && window.equipoSeleccionadoTemp && window.equipoSeleccionadoTemp._id === equipoId) {
            equipo = window.equipoSeleccionadoTemp;
        } else if (equipoId) {
            // Obtener datos del equipo si existe
            try {
                const equipoRes = await fetch(`${API_EQUIPOS}/${equipoId}`);
                if (equipoRes.ok) {
                    equipo = await equipoRes.json();
                } else {
                    console.warn('Equipo no encontrado:', equipoId);
                    // Si tampoco está en memoria, intentar desde FormData
                    const nombreEquipo = document.getElementById('equipoSeleccionado').value;
                    if (nombreEquipo) {
                        equipo.tipo_equipo = nombreEquipo;
                    }
                }
            } catch (equipoError) {
                console.error('Error al obtener equipo:', equipoError);
                const nombreEquipo = document.getElementById('equipoSeleccionado').value;
                if (nombreEquipo) {
                    equipo.tipo_equipo = nombreEquipo;
                }
            }
        }

        // Crear HTML del resumen
         const resumenHTML = `
             <div style="padding: 20px; background: #f5f5f5; border-radius: 8px;">
                 <h3 style="color: #2192B8; margin-bottom: 15px;"><i class="fas fa-clipboard-list" style="margin-right: 8px;"></i>RESUMEN DEL SERVICIO</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <!-- Datos del Servicio -->
                    <div style="background: white; padding: 15px; border-radius: 4px;">
                        <h4 style="color: #333; margin-bottom: 10px;">Información del Servicio</h4>
                        <div style="font-size: 13px; line-height: 1.8;">
                            <p><strong>Número:</strong> ${servicio.numero_servicio}</p>
                            <p><strong>Fecha:</strong> ${servicio.fecha}</p>
                            <p><strong>Hora:</strong> ${servicio.hora}</p>
                            <p><strong>Local:</strong> <span style="padding: 2px 6px; border-radius: 3px; ${servicio.local === 'Ferreñafe' ? 'background: #C8E6C9; color: #2E7D32;' : 'background: #BBDEFB; color: #1565C0;'}">${servicio.local || 'N/A'}</span></p>
                            <p><strong>Estado:</strong> <span style="background: #FFF3CD; padding: 2px 6px; border-radius: 3px;">Pendiente</span></p>
                        </div>
                    </div>
                    
                    <!-- Datos del Cliente -->
                    <div style="background: white; padding: 15px; border-radius: 4px;">
                        <h4 style="color: #333; margin-bottom: 10px;">Cliente</h4>
                        <div style="font-size: 13px; line-height: 1.8;">
                            <p><strong>Nombre:</strong> ${cliente.nombre}</p>
                            <p><strong>DNI:</strong> ${cliente.dni}</p>
                            <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
                            <p><strong>Email:</strong> ${cliente.email || 'No registrado'}</p>
                        </div>
                    </div>
                    
                    <!-- Datos del Equipo -->
                    <div style="background: white; padding: 15px; border-radius: 4px;">
                        <h4 style="color: #333; margin-bottom: 10px;">Equipo</h4>
                        <div style="font-size: 13px; line-height: 1.8;">
                            <p><strong>Tipo:</strong> ${equipo.tipo_equipo}</p>
                            <p><strong>Marca:</strong> ${equipo.marca}</p>
                            <p><strong>Modelo:</strong> ${equipo.modelo}</p>
                            <p><strong>Serie:</strong> ${equipo.numero_serie || equipo.serie || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <!-- Costos -->
                    <div style="background: white; padding: 15px; border-radius: 4px;">
                        <h4 style="color: #333; margin-bottom: 10px;">Costos</h4>
                        <div style="font-size: 13px; line-height: 1.8;">
                            <p><strong>Adelanto:</strong> $${parseFloat(servicio.adelanto || 0).toFixed(2)}</p>
                            <p><strong>Monto Total:</strong> <span style="color: #2192B8; font-weight: bold; font-size: 16px;">$${parseFloat(servicio.monto || 0).toFixed(2)}</span></p>
                            <p><strong>Saldo:</strong> $${(parseFloat(servicio.monto || 0) - parseFloat(servicio.adelanto || 0)).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Problemas -->
                <div style="background: white; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <h4 style="color: #333; margin-bottom: 10px;">Problema Reportado</h4>
                    <p style="font-size: 13px; line-height: 1.6;">${servicio.problemas || 'No especificado'}</p>
                </div>
                
                <!-- Observaciones si existen -->
                ${servicio.observaciones ? `
                    <div style="background: white; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <h4 style="color: #333; margin-bottom: 10px;">Observaciones</h4>
                        <p style="font-size: 13px; line-height: 1.6;">${servicio.observaciones}</p>
                    </div>
                ` : ''}
                
                <!-- Botones -->
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="cerrarModalResumen()" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-edit"></i> Revisar
                    </button>
                    <button onclick="confirmarGuardarServicio()" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-check-circle"></i> Confirmar y Guardar
                    </button>
                </div>
            </div>
        `;

        // Mostrar modal con resumen
        const modal = document.createElement('div');
        modal.id = 'modalResumen';
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Confirmar Servicio</h2>
                    <button class="close-btn" onclick="cerrarModalResumen()">×</button>
                </div>
                ${resumenHTML}
            </div>
        `;

        document.body.appendChild(modal);

        // Guardar datos temporales
        window.servicioParaGuardar = servicio;
    } catch (error) {
        console.error('Error:', error);
        alert('Error al mostrar resumen: ' + error.message);
    }
}

function confirmarGuardarServicio() {
    guardarServicioReal(window.servicioParaGuardar);
}

function cerrarModalResumen() {
    const modal = document.getElementById('modalResumen');
    if (modal) modal.remove();
}

// ✅ FUNCIÓN: Mostrar modal de éxito centrado
function mostrarNotificacionExito(mensaje = 'Guardado exitosamente') {
    const modal = document.createElement('div');
    modal.id = 'successModal';
    modal.className = 'success-modal';
    modal.innerHTML = `
        <div class="success-content">
            <div class="success-icon">
                <i class="fas fa-check"></i>
            </div>
            <p class="success-text">${mensaje}</p>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Cerrar después de 0.8 segundos
    setTimeout(() => {
        const content = modal.querySelector('.success-content');
        content.classList.add('hide');
        setTimeout(() => modal.remove(), 400); // Remover después de animación
    }, 800);
}

// ✅ FUNCIÓN: Mostrar modal de carga V2
function mostrarModalCarga(mensaje = 'Procesando...') {
    // Remover modal anterior si existe
    const existente = document.getElementById('loadingSpinnerModal');
    if (existente) existente.remove();
    
    const modal = document.createElement('div');
    modal.id = 'loadingSpinnerModal';
    modal.className = 'loading-spinner-modal';
    modal.innerHTML = `
        <div class="loading-spinner-content">
            <div class="loading-spinner-circle"></div>
            <p class="loading-spinner-text">${mensaje}</p>
        </div>
    `;
    document.body.appendChild(modal);
}

// ✅ FUNCIÓN: Cerrar modal de carga
function cerrarModalCarga() {
    const modal = document.getElementById('loadingSpinnerModal');
    if (modal) {
        modal.remove();
    }
}

async function guardarServicioReal(servicio) {
    try {
        // ✅ MEJORA: Mostrar modal de carga
        mostrarModalCarga('Guardando...');
        
        // Mantener equipo_id en el servicio principal
        // (se guardará directamente en la tabla servicios)

        // Guardar servicio
        const servicioRes = await fetch(`${API_SERVICIOS}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(servicio)
        });

        if (!servicioRes.ok) {
            const errorData = await servicioRes.json();
            cerrarModalCarga(); // Cerrar modal si hay error
            throw new Error(`${servicioRes.status}: ${errorData.error || 'Error desconocido'} ${errorData.detalles ? '- ' + errorData.detalles.join(', ') : ''}`);
        }

        const servicioGuardado = await servicioRes.json();

        // Guardar relación servicio-equipo si hay equipo seleccionado
        if (servicio.equipo_id) {
            const servicioEquipo = {
                servicio_id: servicioGuardado._id,
                equipo_id: servicio.equipo_id,
                cliente_id: servicio.cliente_id,
                diagnostico: '',
                trabajo_realizado: '',
                fecha_inicio: servicio.fecha,
                fecha_cierre: '',
                estado: 'Pendiente de evaluación',
                costo: servicio.monto || 0,
                fotos: []
            };

            console.log('📤 Enviando servicio-equipo:', servicioEquipo);
            const seRes = await fetch(`${API_SERVICIO_EQUIPO}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(servicioEquipo)
            });
            
            if (!seRes.ok) {
                const errorData = await seRes.json();
                console.error('❌ Error al guardar servicio-equipo:', errorData);
                cerrarModalCarga(); // Cerrar modal si hay error
                throw new Error(`Error al guardar servicio-equipo: ${errorData.error}`);
            }
            
            console.log('✅ Servicio-equipo guardado');
        }

        // ✅ CORRECCIÓN: Cerrar primero el modal de resumen
        cerrarModalResumen();
        
        // ✅ MEJORA: Cerrar modal de carga
        cerrarModalCarga();
        
        // Limpiar formulario
        document.getElementById('formServicio').reset();
        
        // Cerrar modal de nuevo servicio
        cerrarModalNuevoServicio();
        
        // ✅ MEJORA: Mostrar modal de éxito centrado
        mostrarNotificacionExito('Servicio guardado');
        
        // Recargar servicios
        cargarServicios();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar servicio: ' + error.message);
    }
}

async function cargarServicios() {
    const container = document.getElementById('serviciosContainer');
    container.innerHTML = `
        <div class="loading-spinner-inline">
            <div class="loading-spinner-circle"></div>
            <p class="loading-spinner-text">Cargando servicios...</p>
        </div>`;
    try {
        const clientesRes = await fetch(`${API_URL}/clientes`);
        const clientes = await clientesRes.json();

        const equiposRes = await fetch(`${API_EQUIPOS}`);
        const equipos = await equiposRes.json();

        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();

        const servicioEquipoRes = await fetch(`${API_SERVICIO_EQUIPO}`);
        const serviciosEquipo = await servicioEquipoRes.json();

        if (servicios.length === 0) {
            container.innerHTML = '<div class="no-records">No hay servicios registrados</div>';
            return;
        }

        let html = `
            <div style="margin-bottom: 20px; position: relative;">
                <i class="fas fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #2192B8; font-size: 14px; pointer-events: none;"></i>
                <input type="text" id="busquedaServicios" placeholder="Buscar por número, cliente, local, estado, equipo..." 
                       onkeyup="filtrarServicios()" style="max-width: 100%; padding: 12px 15px 12px 40px; font-size: 14px; border: 2px solid #e0e0e0; border-radius: 8px; width: 100%;">
            </div>

            <table class="records-table" id="tablaServicios">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Fecha</th>
                        <th>Local</th>
                        <th>Cliente</th>
                        <th>Equipo</th>
                        <th>Descripción</th>
                        <th>Estado</th>
                        <th>Costo Total</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        servicios.forEach(srv => {
            const cliente = clientes.find(c => c._id == srv.cliente_id);
            
            // Buscar equipo por equipo_id directo o por servicio_equipo
            let equipo = null;
            if (srv.equipo_id) {
                equipo = equipos.find(e => e._id == srv.equipo_id);
            }
            if (!equipo) {
                const servicioEquipo = serviciosEquipo.find(se => se.servicio_id == srv._id);
                if (servicioEquipo) {
                    equipo = equipos.find(e => e._id == servicioEquipo.equipo_id);
                }
            }
            
            // Determinar color y ícono según estado
            let estadoBadge = '<span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">';
            
            switch(srv.estado) {
                case 'Pendiente':
                case 'Pendiente de evaluación':
                    estadoBadge += '<i class="fas fa-hourglass-half" style="color: #856404;"></i> Pendiente</span>';
                    estadoBadge = '<span style="background: #FFF3CD; color: #856404;' + estadoBadge.slice(6);
                    break;
                case 'En diagnóstico':
                    estadoBadge += '<i class="fas fa-stethoscope" style="color: #1565C0;"></i> Diagnóstico</span>';
                    estadoBadge = '<span style="background: #E3F2FD; color: #1565C0;' + estadoBadge.slice(6);
                    break;
                case 'En reparación':
                    estadoBadge += '<i class="fas fa-tools" style="color: #E65100;"></i> Reparación</span>';
                    estadoBadge = '<span style="background: #FFE0B2; color: #E65100;' + estadoBadge.slice(6);
                    break;
                case 'Completado':
                    estadoBadge += '<i class="fas fa-check-circle" style="color: #155724;"></i> Completado</span>';
                    estadoBadge = '<span style="background: #D4EDDA; color: #155724;' + estadoBadge.slice(6);
                    break;
                case 'Entregado':
                    estadoBadge += '<i class="fas fa-box-open" style="color: #6A1B9A;"></i> Entregado</span>';
                    estadoBadge = '<span style="background: #F3E5F5; color: #6A1B9A;' + estadoBadge.slice(6);
                    break;
                case 'Diagnosticado':
                    // Para datos antiguos
                    estadoBadge += '<i class="fas fa-check-circle" style="color: #155724;"></i> Diagnosticado</span>';
                    estadoBadge = '<span style="background: #D4EDDA; color: #155724;' + estadoBadge.slice(6);
                    break;
                default:
                    estadoBadge += srv.estado + '</span>';
                    estadoBadge = '<span style="background: #E0E0E0; color: #424242;' + estadoBadge.slice(6);
            }

            // Calcular costo total del diagnóstico
            let costoTotal = 0;
            if (srv.diagnostico) {
                try {
                    const diagnostico = JSON.parse(srv.diagnostico);
                    costoTotal = diagnostico.reduce((sum, p) => sum + (p.costo || 0), 0);
                } catch (e) {
                    costoTotal = 0;
                }
            }

            const equipoStr = equipo ? `${equipo.tipo_equipo} ${equipo.marca || ''}`.trim() : 'N/A';
            const descripcionStr = srv.problemas ? srv.problemas.substring(0, 40) + (srv.problemas.length > 40 ? '...' : '') : 'N/A';

            html += `
                <tr class="row-servicio" data-numero="${srv.numero_servicio}" data-cliente="${cliente ? cliente.nombre.toLowerCase() : ''}" 
                    data-estado="${srv.estado.toLowerCase()}" data-equipo="${equipoStr.toLowerCase()}" data-problemas="${(srv.problemas || '').toLowerCase()}" data-local="${(srv.local || '').toLowerCase()}">
                    <td><strong>${srv.numero_servicio || 'N/A'}</strong></td>
                    <td>${new Date(srv.fecha).toLocaleDateString('es-PE')}</td>
                    <td><span style="padding: 4px 8px; border-radius: 4px; font-weight: 600; ${srv.local === 'Ferreñafe' ? 'background: #C8E6C9; color: #2E7D32;' : 'background: #BBDEFB; color: #1565C0;'}">${srv.local || 'N/A'}</span></td>
                    <td>${cliente ? cliente.nombre : 'N/A'}</td>
                    <td>${equipoStr}</td>
                    <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${srv.problemas || ''}">${descripcionStr}</td>
                    <td>${estadoBadge}</td>
                    <td><strong>${costoTotal > 0 ? '$' + costoTotal.toFixed(2) : '-'}</strong></td>
                    <td class="actions">
                        <button class="btn-edit" onclick="abrirModalDetallesServicio('${srv._id}')" style="padding: 6px 12px; font-size: 12px;" title="Ver todos los detalles">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        ${srv.estado === 'Pendiente' || srv.estado === 'Pendiente de evaluación' ?
                    `<button class="btn-primary" onclick="abrirModalDiagnostico('${srv._id}', '${cliente ? cliente.nombre : 'N/A'}')" style="padding: 6px 12px; font-size: 12px;" title="Diagnosticar">
                                <i class="fas fa-stethoscope"></i>
                            </button>` :
                    srv.estado === 'En diagnóstico' ?
                    `<button class="btn-success" onclick="abrirModalDiagnostico('${srv._id}', '${cliente ? cliente.nombre : 'N/A'}')" style="padding: 6px 12px; font-size: 12px; background: #4CAF50; border-color: #4CAF50;" title="Continuar diagnóstico">
                                <i class="fas fa-stethoscope"></i>
                            </button>` :
                    srv.estado === 'Diagnosticado' ?
                    `<button class="btn-info" onclick="verDiagnostico('${srv._id}')" style="padding: 6px 12px; font-size: 12px; background: #2196F3; border-color: #2196F3;" title="Ver diagnóstico">
                                <i class="fas fa-eye"></i>
                            </button>` :
                    `<button class="btn-warning" onclick="abrirModalCambiarEstado('${srv._id}')" style="padding: 6px 12px; font-size: 12px; background: #FF9800; border-color: #FF9800; color: white;" title="Cambiar estado">
                                <i class="fas fa-arrow-right"></i>
                            </button>`
                    }
                        <button class="btn-danger" onclick="confirmarEliminarServicio('${srv._id}')" style="padding: 6px 12px; font-size: 12px;" title="Eliminar servicio">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Validar transiciones permitidas de estados
function obtenerEstadosPermitidos(estadoActual) {
    const transiciones = {
        'Pendiente': ['En diagnóstico'],
        'Pendiente de evaluación': ['En diagnóstico'],
        'En diagnóstico': ['En reparación'],
        'En reparación': ['Completado'],
        'Completado': ['Entregado'],
        'Entregado': [],
        'Diagnosticado': ['En reparación'] // Para datos antiguos
    };
    
    return transiciones[estadoActual] || [];
}

// Cambiar estado del servicio
async function abrirModalCambiarEstado(servicioId) {
    try {
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => s._id === servicioId);
        
        if (!servicio) {
            alert('Servicio no encontrado');
            return;
        }
        
        // Si está en "En reparación", mostrar modal de confirmación de reparación
         if (servicio.estado === 'En reparación') {
             abrirModalConfirmarReparacion(servicioId, servicio);
             return;
         }
        
        // Si está en "Completado", mostrar modal de entrega
        if (servicio.estado === 'Completado') {
            abrirModalEntrega(servicioId, servicio);
            return;
        }
        
        const estadosPermitidos = obtenerEstadosPermitidos(servicio.estado);
        
        if (estadosPermitidos.length === 0) {
            alert('Este servicio ya está en estado final (Entregado)');
            return;
        }
        
        // Crear selector de estado
        let opciones = '';
        estadosPermitidos.forEach(estado => {
            opciones += `<option value="${estado}">${estado}</option>`;
        });
        
        // Si va a "En reparación", mostrar modal con opciones
        if (estadosPermitidos.includes('En reparación')) {
            abrirModalIniciarReparacion(servicioId, servicio);
            return;
        }
        
        const nuevoEstado = prompt(
            `Estado actual: ${servicio.estado}\n\nSelecciona el nuevo estado:\n${estadosPermitidos.join('\n')}`,
            estadosPermitidos[0]
        );
        
        if (!nuevoEstado || !estadosPermitidos.includes(nuevoEstado)) {
            return;
        }
        
        // Actualizar estado
        await cambiarEstadoServicio(servicioId, nuevoEstado);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar estado: ' + error.message);
    }
}

// Abrir modal para iniciar reparación
async function abrirModalIniciarReparacion(servicioId, servicio) {
    try {
        // Obtener datos del cliente
        let cliente = { nombre: 'N/A', telefono: 'N/A' };
        if (servicio.cliente_id) {
            try {
                const clienteRes = await fetch(`${API_URL}/clientes/${servicio.cliente_id}`);
                if (clienteRes.ok) {
                    cliente = await clienteRes.json();
                }
            } catch (error) {
                console.error('Error al obtener cliente:', error);
            }
        }

        // Obtener datos del equipo
        let equipo = { tipo_equipo: 'N/A', marca: 'N/A', modelo: 'N/A' };
        if (servicio.equipo_id) {
            try {
                const equipoRes = await fetch(`${API_EQUIPOS}/${servicio.equipo_id}`);
                if (equipoRes.ok) {
                    equipo = await equipoRes.json();
                }
            } catch (error) {
                console.error('Error al obtener equipo:', error);
            }
        }

        // Guardar datos en memoria
        window.servicioEnInicioReparacion = {
            id: servicioId,
            numero_servicio: servicio.numero_servicio
        };

        // Llenar datos del servicio, equipo y cliente
        document.getElementById('repNumeroServicio').textContent = servicio.numero_servicio || '-';
        document.getElementById('repFechaServicio').textContent = 'Fecha: ' + (servicio.fecha || '-');
        document.getElementById('repTipoEquipo').textContent = equipo.tipo_equipo || '-';
        document.getElementById('repMarcaModelo').textContent = 'Marca/Modelo: ' + ((equipo.marca || '-') + ' ' + (equipo.modelo || '')).trim();
        document.getElementById('repNombreCliente').textContent = cliente.nombre || '-';
        document.getElementById('repTelefonoCliente').textContent = 'Teléfono: ' + (cliente.telefono || '-');

        // Limpiar campos
        document.getElementById('repTecnicoReparacion').value = '';
        document.getElementById('repTiempoEstimado').value = '';
        document.getElementById('repObservacionesInicio').value = '';

        document.getElementById('modalIniciarReparacion').classList.add('show');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al abrir modal de reparación: ' + error.message);
    }
}

// Cerrar modal iniciar reparación
function cerrarModalIniciarReparacion() {
    document.getElementById('modalIniciarReparacion').classList.remove('show');
    window.servicioEnInicioReparacion = null;
}

// Confirmar inicio de reparación
async function confirmarInicioReparacion() {
    if (!window.servicioEnInicioReparacion) {
        alert('Error: No hay servicio en reparación');
        return;
    }

    // Validar campos obligatorios
    const tecnicoReparacion = document.getElementById('repTecnicoReparacion').value.trim();
    const tiempoEstimado = document.getElementById('repTiempoEstimado').value.trim();

    if (!tecnicoReparacion) {
        document.getElementById('repTecnicoReparacion').style.borderColor = '#d32f2f';
        document.getElementById('repTecnicoReparacion').style.borderWidth = '2px';
        alert('Por favor ingresa el nombre del técnico');
        return;
    }

    if (!tiempoEstimado) {
        document.getElementById('repTiempoEstimado').style.borderColor = '#d32f2f';
        document.getElementById('repTiempoEstimado').style.borderWidth = '2px';
        alert('Por favor ingresa el tiempo estimado');
        return;
    }

    try {
        // Recopilar datos de inicio de reparación
        const datosInicioReparacion = {
            tecnicoReparacion: tecnicoReparacion,
            tiempoEstimado: tiempoEstimado,
            observacionesInicio: document.getElementById('repObservacionesInicio').value.trim()
        };

        // Convertir a JSON para almacenar
        const datosJSON = JSON.stringify(datosInicioReparacion);

        // Cambiar estado a 'En reparación' pasando datos
        await cambiarEstadoServicio(window.servicioEnInicioReparacion.id, 'En reparación', datosJSON);
        cerrarModalIniciarReparacion();
        alert('Reparación iniciada correctamente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al iniciar reparación: ' + error.message);
    }
}

// Abrir modal para confirmar reparación completada
async function abrirModalConfirmarReparacion(servicioId, servicio) {
    try {
         // Guardar ID en memoria
         window.servicioEnReparacion = {
             id: servicioId,
             estado: servicio.estado
         };

         // Parsear diagnóstico
         let problemas = [];
         if (servicio.diagnostico) {
             try {
                 problemas = JSON.parse(servicio.diagnostico);
             } catch (error) {
                 console.error('Error parsing diagnostico:', error);
                 alert('Error al cargar los problemas');
                 return;
             }
         }

         if (problemas.length === 0) {
             alert('No hay problemas registrados en el diagnóstico');
             return;
         }

         // Obtener datos del cliente
         let cliente = { nombre: 'N/A', telefono: 'N/A' };
         if (servicio.cliente_id) {
             try {
                 const clienteRes = await fetch(`${API_URL}/clientes/${servicio.cliente_id}`);
                 if (clienteRes.ok) {
                     cliente = await clienteRes.json();
                 }
             } catch (error) {
                 console.error('Error al obtener cliente:', error);
             }
         }

         // Obtener datos del equipo
         let equipo = { tipo_equipo: 'N/A', marca: 'N/A', modelo: 'N/A' };
         if (servicio.equipo_id) {
             try {
                 const equipoRes = await fetch(`${API_EQUIPOS}/${servicio.equipo_id}`);
                 if (equipoRes.ok) {
                     equipo = await equipoRes.json();
                 }
             } catch (error) {
                 console.error('Error al obtener equipo:', error);
             }
         }

         // Llenar datos del servicio, equipo y cliente
         document.getElementById('numeroServicioReparacion').textContent = servicio.numero_servicio || '-';
         document.getElementById('fechaServicioReparacion').textContent = servicio.fecha || '-';
         document.getElementById('equipoTipoReparacion').textContent = equipo.tipo_equipo || '-';
         document.getElementById('marcaModeloReparacion').textContent = ((equipo.marca || '-') + ' ' + (equipo.modelo || '')).trim();
         document.getElementById('clienteNombreReparacion').textContent = cliente.nombre || '-';
         document.getElementById('clienteTelefonoReparacion').textContent = cliente.telefono || '-';

        // Construir HTML con checkboxes incluyendo solución
         let htmlProblemas = '';
         problemas.forEach((problema, index) => {
             htmlProblemas += `
                 <div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: white; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 10px;">
                     <input type="checkbox" id="problema-${index}" class="checkboxProblema" style="margin-top: 4px; cursor: pointer;" onchange="verificarTodosReparados()">
                     <div style="flex: 1;">
                         <label for="problema-${index}" style="cursor: pointer; display: block;">
                             <strong style="color: #333; font-size: 14px;">Problema ${index + 1}:</strong>
                             <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">${problema.descripcion}</p>
                             ${problema.solucion ? `<p style="margin: 5px 0 0 0; color: #4CAF50; font-size: 12px;"><strong>Solución:</strong> ${problema.solucion}</p>` : ''}
                             <p style="margin: 5px 0 0 0; color: #2192B8; font-weight: bold;">$${parseFloat(problema.costo).toFixed(2)}</p>
                         </label>
                     </div>
                 </div>
             `;
         });

         document.getElementById('problemasReparacionContainer').innerHTML = htmlProblemas;
         document.getElementById('modalConfirmarReparacion').classList.add('show');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al abrir confirmación de reparación');
    }
}

// Abrir modal de entrega cuando estado es "Completado"
async function abrirModalEntrega(servicioId, servicio) {
    try {
        // Guardar ID en memoria
        window.servicioEnEntrega = {
            id: servicioId,
            monto: servicio.monto || 0,
            adelanto: servicio.adelanto || 0
        };

        // Obtener datos del cliente
        let cliente = { nombre: 'N/A', telefono: 'N/A' };
        if (servicio.cliente_id) {
            try {
                const clienteRes = await fetch(`${API_URL}/clientes/${servicio.cliente_id}`);
                if (clienteRes.ok) {
                    cliente = await clienteRes.json();
                }
            } catch (error) {
                console.error('Error al obtener cliente:', error);
            }
        }

        // Obtener datos del equipo
        let equipo = { tipo_equipo: 'N/A', marca: 'N/A', modelo: 'N/A' };
        if (servicio.equipo_id) {
            try {
                const equipoRes = await fetch(`${API_EQUIPOS}/${servicio.equipo_id}`);
                if (equipoRes.ok) {
                    equipo = await equipoRes.json();
                }
            } catch (error) {
                console.error('Error al obtener equipo:', error);
            }
        }

        // Llenar datos del servicio, equipo y cliente
        document.getElementById('entregaNumeroServicio').textContent = servicio.numero_servicio || '-';
        document.getElementById('entregaFechaServicio').textContent = 'Fecha: ' + (servicio.fecha || '-');
        document.getElementById('entregaTipoEquipo').textContent = equipo.tipo_equipo || '-';
        document.getElementById('entregaMarcaModelo').textContent = 'Marca/Modelo: ' + ((equipo.marca || '-') + ' ' + (equipo.modelo || '')).trim();
        document.getElementById('entregaNombreCliente').textContent = cliente.nombre || '-';
        document.getElementById('entregaTelefonoCliente').textContent = 'Teléfono: ' + (cliente.telefono || '-');

        // Llenar fechas automáticamente
        const hoy = new Date();
        const fechaHoy = hoy.toISOString().split('T')[0];
        const horaActual = hoy.toTimeString().slice(0, 5);
        
        // Calcular fecha de garantía a 30 días
        const fechaGarantia = new Date(hoy);
        fechaGarantia.setDate(fechaGarantia.getDate() + 30);
        const fechaGarantiaStr = fechaGarantia.toISOString().split('T')[0];
        
        document.getElementById('entFechaEntrega').value = fechaHoy;
        document.getElementById('entHoraEntrega').value = horaActual;
        document.getElementById('entGarantia').value = fechaGarantiaStr;

        // Llenar datos financieros
        const montoTotal = parseFloat(servicio.monto || 0);
        const pagadoHasta = parseFloat(servicio.adelanto || 0);
        const saldoPendiente = montoTotal - pagadoHasta;

        document.getElementById('entMontoTotal').textContent = montoTotal.toFixed(2);
        document.getElementById('entPagadoHasta').textContent = pagadoHasta.toFixed(2);
        document.getElementById('entSaldoPendiente').textContent = saldoPendiente.toFixed(2);
        
        // Establecer el monto a cobrar hoy como el saldo pendiente
        document.getElementById('entMontoCobraHoy').value = saldoPendiente.toFixed(2);

        // Limpiar otros campos
        document.getElementById('entEncargado').value = '';
        document.getElementById('entEstadoEquipo').value = '';
        document.getElementById('entObservaciones').value = '';
        document.getElementById('entMetodoPago').value = '';
        document.getElementById('entComprobante').value = '';
        document.getElementById('entGarantia').value = '';
        document.getElementById('entRecomendaciones').value = '';

        document.getElementById('modalEntregaServicio').classList.add('show');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al abrir modal de entrega: ' + error.message);
    }
}

// Cerrar modal de entrega
function cerrarModalEntrega() {
    document.getElementById('modalEntregaServicio').classList.remove('show');
    window.servicioEnEntrega = null;
}

// Recalcular saldo en entrega
function recalcularSaldoEntrega() {
    const montoTotal = parseFloat(document.getElementById('entMontoTotal').textContent || 0);
    const pagadoHasta = parseFloat(document.getElementById('entPagadoHasta').textContent || 0);
    const montoCobraHoy = parseFloat(document.getElementById('entMontoCobraHoy').value || 0);
    
    const totalPagado = pagadoHasta + montoCobraHoy;
    const saldoFinal = montoTotal - totalPagado;
    
    document.getElementById('entSaldoPendiente').textContent = Math.max(0, saldoFinal).toFixed(2);
}

// Confirmar entrega del servicio
async function confirmarEntregaServicio() {
    if (!window.servicioEnEntrega) {
        alert('Error: No hay servicio en entrega');
        return;
    }

    // Limpiar estilos previos
    document.getElementById('entFechaEntrega').style.borderColor = '#ddd';
    document.getElementById('entHoraEntrega').style.borderColor = '#ddd';
    document.getElementById('entEncargado').style.borderColor = '#ddd';
    document.getElementById('entEstadoEquipo').style.borderColor = '#ddd';

    // Validar campos obligatorios
    const fechaEntrega = document.getElementById('entFechaEntrega').value;
    const horaEntrega = document.getElementById('entHoraEntrega').value;
    const encargadoEntrega = document.getElementById('entEncargado').value.trim();
    const estadoEquipo = document.getElementById('entEstadoEquipo').value;

    const camposFaltantes = [];

    if (!fechaEntrega) {
        camposFaltantes.push('Fecha de Entrega');
        document.getElementById('entFechaEntrega').style.borderColor = '#d32f2f';
        document.getElementById('entFechaEntrega').style.borderWidth = '2px';
    }
    if (!horaEntrega) {
        camposFaltantes.push('Hora de Entrega');
        document.getElementById('entHoraEntrega').style.borderColor = '#d32f2f';
        document.getElementById('entHoraEntrega').style.borderWidth = '2px';
    }
    if (!encargadoEntrega) {
        camposFaltantes.push('Encargado de Entrega');
        document.getElementById('entEncargado').style.borderColor = '#d32f2f';
        document.getElementById('entEncargado').style.borderWidth = '2px';
    }
    if (!estadoEquipo) {
        camposFaltantes.push('Estado del Equipo');
        document.getElementById('entEstadoEquipo').style.borderColor = '#d32f2f';
        document.getElementById('entEstadoEquipo').style.borderWidth = '2px';
    }

    // Si hay campos faltantes, mostrar modal de error
    if (camposFaltantes.length > 0) {
        const mensaje = 'Campos incompletos:\n• ' + camposFaltantes.join('\n• ');
        document.getElementById('mensajeErrorValidacion').textContent = mensaje;
        mostrarModalErrorValidacion();
        return;
    }

    try {
        // Recopilar todos los datos de entrega
        const datosEntrega = {
            fechaEntrega: fechaEntrega,
            horaEntrega: horaEntrega,
            encargadoEntrega: encargadoEntrega,
            estadoEquipo: estadoEquipo,
            observacionesEntrega: document.getElementById('entObservaciones').value.trim(),
            montoCobraHoy: parseFloat(document.getElementById('entMontoCobraHoy').value || 0),
            metodoPago: document.getElementById('entMetodoPago').value,
            comprobanteEntrega: document.getElementById('entComprobante').value.trim(),
            garantiaHasta: document.getElementById('entGarantia').value,
            recomendaciones: document.getElementById('entRecomendaciones').value.trim()
        };

        // Convertir a JSON para almacenar
        const datosEntregaJSON = JSON.stringify(datosEntrega);

        // Cambiar estado a 'Entregado' pasando datos de entrega
        await cambiarEstadoServicio(window.servicioEnEntrega.id, 'Entregado', datosEntregaJSON);
        cerrarModalEntrega();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al confirmar entrega: ' + error.message);
    }
}

// Mostrar modal de error de validación
function mostrarModalErrorValidacion() {
    document.getElementById('modalErrorValidacion').classList.add('show');
    
    // Cerrar automáticamente después de 3 segundos
    setTimeout(() => {
        cerrarModalErrorValidacion();
    }, 3000);
}

// Cerrar modal de error de validación
function cerrarModalErrorValidacion() {
    document.getElementById('modalErrorValidacion').classList.remove('show');
}

// Verificar si todos los problemas están marcados
function verificarTodosReparados() {
    const checkboxes = document.querySelectorAll('.checkboxProblema');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    document.getElementById('btnConfirmarReparacion').disabled = !todosChecked;
}

// Confirmar que la reparación está completa
async function confirmarReparacionCompleta() {
    if (!window.servicioEnReparacion) {
        mostrarMensaje('Error: No hay servicio en reparación', 'error');
        return;
    }

    try {
        const comentario = document.getElementById('comentarioReparacion').value.trim();
        
        // Recopilar datos de reparación completada
        const datosReparacionCompleta = {
            comentariosReparacion: comentario,
            estadoFinal: 'Completado',
            fechaCompletado: new Date().toLocaleString()
        };
        
        // Convertir a JSON para almacenar
        const datosJSON = JSON.stringify(datosReparacionCompleta);
        
        // Pasar datos completos al cambiar estado
        await cambiarEstadoServicio(window.servicioEnReparacion.id, 'Completado', datosJSON);
        cerrarModalConfirmarReparacion();
        mostrarModalReparacionCompleta();
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al completar reparación: ' + error.message, 'error');
    }
}

// Cerrar modal de confirmación de reparación
function cerrarModalConfirmarReparacion() {
    document.getElementById('modalConfirmarReparacion').classList.remove('show');
    window.servicioEnReparacion = null;
}

// Cambiar estado en el servidor
async function cambiarEstadoServicio(servicioId, nuevoEstado, datosAdicionales = '') {
    try {
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => s._id === servicioId);
        
        if (!servicio) throw new Error('Servicio no encontrado');
        
        // Actualizar con campos según nuevo estado
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
                // Guardar datos de inicio de reparación como JSON
                if (datosAdicionales) {
                    actualizacion.datos_inicio_reparacion = datosAdicionales;
                }
                break;
            case 'Completado':
                actualizacion.fecha_completado = ahora;
                // Agregar comentario si existe
                if (datosAdicionales) {
                    actualizacion.datos_reparacion_completa = datosAdicionales;
                }
                break;
            case 'Entregado':
                actualizacion.fecha_entrega = ahora;
                // Guardar datos de entrega como JSON
                if (datosAdicionales) {
                    actualizacion.datos_entrega = datosAdicionales;
                }
                break;
        }
        
        const putRes = await fetch(`${API_SERVICIOS}/${servicioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actualizacion)
        });
        
        if (!putRes.ok) throw new Error('Error al actualizar servicio');
        
        cargarServicios();
        
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Filtrar servicios en la tabla
function filtrarServicios() {
    const searchText = document.getElementById('busquedaServicios').value.toLowerCase();
    const filas = document.querySelectorAll('.row-servicio');

    filas.forEach(fila => {
        const numero = fila.getAttribute('data-numero').toLowerCase();
        const cliente = fila.getAttribute('data-cliente');
        const estado = fila.getAttribute('data-estado');
        const equipo = fila.getAttribute('data-equipo');
        const problemas = fila.getAttribute('data-problemas');
        const local = fila.getAttribute('data-local');

        const coincide = numero.includes(searchText) || 
                        cliente.includes(searchText) || 
                        estado.includes(searchText) || 
                        equipo.includes(searchText) ||
                        problemas.includes(searchText) ||
                        local.includes(searchText);

        fila.style.display = coincide ? '' : 'none';
    });
}

// Abrir modal diagnóstico



async function abrirModalDiagnostico(servicioId, clienteNombre) {
    try {
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => String(s._id) === String(servicioId));

        if (!servicio) {
            console.error('Servicio no encontrado:', servicioId);
            return;
        }

        const clientesRes = await fetch(`${API_URL}/clientes`);
        const clientes = await clientesRes.json();
        const cliente = clientes.find(c => c._id == servicio.cliente_id);

        // Guardar datos del servicio en memoria (NO cambiar estado aún)
        window.servicioActualDiagnostico = {
            id: servicioId,
            numero_servicio: servicio.numero_servicio,
            cliente: clienteNombre,
            telefono: cliente?.telefono || '',
            problemas: [],
            modificado: false
        };

        // Cambiar estado a "En diagnóstico" si está en "Pendiente"
        if (servicio.estado === 'Pendiente' || servicio.estado === 'Pendiente de evaluación') {
            try {
                const actualizacion = {
                    ...servicio,
                    estado: 'En diagnóstico',
                    fecha_inicio_diagnostico: new Date().toLocaleString()
                };
                
                await fetch(`${API_SERVICIOS}/${servicioId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(actualizacion)
                });
                
                console.log('✅ Estado cambiado a "En diagnóstico"');
            } catch (error) {
                console.error('Advertencia: No se pudo cambiar estado:', error);
                // Continuar de todas formas
            }
        }
        
        // Cargar información del equipo
         let equipoInfo = { tipo_equipo: '-', marca: '-', modelo: '-', serie: '-' };
         if (servicio.equipo_id) {
             try {
                 const equiposRes = await fetch(`${API_EQUIPOS}`);
                 const equipos = await equiposRes.json();
                 const equipo = equipos.find(e => String(e._id) === String(servicio.equipo_id));
                if (equipo) {
                    equipoInfo = equipo;
                }
            } catch (error) {
                console.error('Error al cargar equipo:', error);
            }
        }
        
        // Mostrar modal
        document.getElementById('modalDiagnostico').classList.add('show');
        document.getElementById('clienteDiagnostico').textContent = clienteNombre;
        document.getElementById('numeroServicioDiagnostico').textContent = servicio.numero_servicio;
        document.getElementById('telefonoDiagnostico').textContent = cliente?.telefono || 'N/A';
        
        // Mostrar descripción del servicio
        document.getElementById('descripcionServicioDiagnostico').textContent = servicio.problemas || 'Sin descripción';
        
        // Mostrar datos del equipo
         document.getElementById('equipoTipoDiagnostico').textContent = equipoInfo.tipo_equipo || '-';
         document.getElementById('equipoMarcaDiagnostico').textContent = equipoInfo.marca || '-';
         document.getElementById('equipoModeloDiagnostico').textContent = equipoInfo.modelo || '-';
         document.getElementById('equipoSerieDiagnostico').textContent = equipoInfo.numero_serie || '-';
        
        const inputTecnico = document.getElementById('nombreTecnicoDiagnostico');
        
        // Cargar datos guardados si existen
        let problemasGuardados = [];
        let tecnicoGuardado = '';
        
        if (servicio.diagnostico) {
            try {
                problemasGuardados = JSON.parse(servicio.diagnostico);
                tecnicoGuardado = servicio.tecnico || '';
            } catch (error) {
                console.error('Error parsing diagnostico:', error);
            }
        }
        
        // Establecer nombre del técnico
        inputTecnico.value = tecnicoGuardado;
        
        // Agregar listener para limpiar estilo rojo al escribir
        inputTecnico.addEventListener('input', function() {
            this.style.borderColor = '';
            this.style.backgroundColor = '';
        });
        
        // Limpiar contenedor
        document.getElementById('problemasContainer').innerHTML = '';
        
        // Cargar problemas guardados
        if (problemasGuardados.length > 0) {
            problemasGuardados.forEach(problema => {
                agregarProblemaFila();
                const filas = document.querySelectorAll('#problemasContainer > div');
                const ultimaFila = filas[filas.length - 1];
                
                const problemaInput = ultimaFila.querySelector('.problemaInput');
                const costoInput = ultimaFila.querySelector('.costoInput');
                const solucionInput = ultimaFila.querySelector('.solucionInput');
                
                if (problemaInput) problemaInput.value = problema.descripcion;
                if (costoInput) costoInput.value = problema.costo;
                if (solucionInput) solucionInput.value = problema.solucion || '';
            });
        } else {
            // Si no hay problemas guardados, agregar una fila vacía
            agregarProblemaFila();
        }
        
        // Recalcular monto total
        calcularMontoTotal();
        
        console.log('✅ Modal diagnóstico abierto');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al abrir diagnóstico');
    }
}

// Cerrar modal diagnóstico
function cerrarModalDiagnostico(acabaDeGuardar = false) {
    // Si acaba de guardar, cerrar sin preguntar
    if (!acabaDeGuardar) {
        // Verificar si hay cambios sin guardar
        const filas = document.querySelectorAll('#problemasContainer > div');
        const nombreTecnico = document.getElementById('nombreTecnicoDiagnostico').value.trim();
        
        const hayContenido = filas.length > 0 || nombreTecnico;
        
        if (hayContenido && window.servicioActualDiagnostico) {
            // Mostrar modal de confirmación en lugar de confirm()
            document.getElementById('modalConfirmarCierreDiagnostico').classList.add('show');
            return;
        }
    }
    
    document.getElementById('modalDiagnostico').classList.remove('show');
    window.servicioActualDiagnostico = null;
}

// Manejar respuesta de confirmación de cierre de diagnóstico
function cerrarConfirmacionDiagnostico(accion) {
    document.getElementById('modalConfirmarCierreDiagnostico').classList.remove('show');
    
    if (accion === 'confirmar') {
        // Cerrar diagnóstico sin guardar
        document.getElementById('modalDiagnostico').classList.remove('show');
        window.servicioActualDiagnostico = null;
    }
    // Si es 'cancelar', solo cierra el modal de confirmación y vuelve al diagnóstico
}

// Agregar fila de problema
function agregarProblemaFila() {
    const container = document.getElementById('problemasContainer');
    const id = Date.now();
    const numeroFila = container.querySelectorAll('[id^="problema-"]').length + 1;

    const fila = document.createElement('div');
    fila.id = `problema-${id}`;
    fila.style.cssText = 'padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; margin-bottom: 12px; background: #f9f9f9; transition: all 0.3s ease;';

    fila.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span style="background: #2192B8; color: white; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: bold;">${numeroFila}</span>
            <span style="font-size: 12px; color: #666;">Problema encontrado</span>
        </div>
        
        <!-- Fila 1: Descripción, Solución, Costo y Botón -->
        <div style="display: grid; grid-template-columns: 2fr 2fr 0.8fr auto; gap: 10px; align-items: flex-end; margin-bottom: 0;">
            <!-- Descripción del problema -->
            <div>
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 13px;">Descripción:</label>
                <input type="text" class="problemaInput" placeholder="Pantalla rota. Batería dañada. etc." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" onchange="calcularMontoTotal()" oninput="this.style.borderColor='#2192B8'; this.style.backgroundColor='';">
            </div>
            
            <!-- Solución -->
            <div>
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 13px;">Solución:</label>
                <input type="text" class="solucionInput" placeholder="Pantalla nueva. Batería reemplazada. etc." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" oninput="this.style.borderColor='#2192B8'; this.style.backgroundColor='';">
            </div>
            
            <!-- Costo -->
            <div>
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 13px;">Costo:</label>
                <div style="display: flex; align-items: center; gap: 3px;">
                    <span style="color: #666; font-weight: bold; font-size: 13px;">$</span>
                    <input type="number" class="costoInput" placeholder="0.00" step="0.01" min="0" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" onchange="calcularMontoTotal()" oninput="this.style.borderColor='#2192B8'; this.style.backgroundColor='';">
                </div>
            </div>
            
            <!-- Botón Eliminar -->
            <div>
                <button type="button" class="btn-danger" onclick="eliminarProblemaFila('${id}')" style="padding: 8px 10px; font-size: 12px; display: flex; align-items: center; gap: 5px; white-space: nowrap;" title="Eliminar problema">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `;

    fila.addEventListener('mouseover', () => {
        fila.style.borderColor = '#2192B8';
        fila.style.boxShadow = '0 2px 8px rgba(33, 146, 184, 0.2)';
    });

    fila.addEventListener('mouseout', () => {
        fila.style.borderColor = '#e0e0e0';
        fila.style.boxShadow = 'none';
    });

    container.appendChild(fila);
}

// Eliminar fila de problema
function eliminarProblemaFila(id) {
    const fila = document.getElementById(`problema-${id}`);
    if (fila) {
        const problemaInput = fila.querySelector('.problemaInput');
        const solucionInput = fila.querySelector('.solucionInput');
        const costoInput = fila.querySelector('.costoInput');
        
        const tieneProblema = problemaInput && problemaInput.value.trim() !== '';
        const tieneSolucion = solucionInput && solucionInput.value.trim() !== '';
        const tieneCosto = costoInput && costoInput.value.trim() !== '';
        
        // Si NO tiene datos, eliminar directamente
        if (!tieneProblema && !tieneSolucion && !tieneCosto) {
            fila.remove();
            calcularMontoTotal();
        } else {
            // Si tiene datos, mostrar modal de confirmación
            document.getElementById('confirmMsg').textContent = '¿Deseas eliminar este problema? Los datos se perderán.';
            document.getElementById('confirmBtn').textContent = 'Eliminar';
            document.getElementById('confirmBtn').style.background = '#f44336';
            document.getElementById('confirmBtn').style.borderColor = '#f44336';
            document.getElementById('confirmBtn').onclick = () => {
                fila.remove();
                calcularMontoTotal();
                cerrarModal();
            };
            document.getElementById('confirmModal').classList.add('show');
        }
    }
}

// Calcular monto total
function calcularMontoTotal() {
    const filas = document.querySelectorAll('#problemasContainer > div');
    let total = 0;

    filas.forEach(fila => {
        const costoInput = fila.querySelector('.costoInput');
        if (costoInput && costoInput.value) {
            total += parseFloat(costoInput.value) || 0;
        }
    });

    document.getElementById('montoTotalDiagnostico').textContent = total.toFixed(2);

    // Guardar en memoria
    if (window.servicioActualDiagnostico) {
        window.servicioActualDiagnostico.montoTotal = total;
    }
}

// Guardar diagnóstico
// Guardar progreso del diagnóstico (sin cambiar estado)
async function guardarProcesoDiagnostico() {
    await guardarDiagnosticoInterno(false);
}

// Finalizar diagnóstico (cambiar a "En reparación")
async function finalizarDiagnostico() {
    await guardarDiagnosticoInterno(true);
}

// Función interna compartida para guardar diagnóstico
async function guardarDiagnosticoInterno(finalizarDiag = false) {
    if (!window.servicioActualDiagnostico) {
        alert('Error: No hay servicio en diagnóstico');
        return;
    }

    // ✅ VALIDACIÓN 1: Nombre del técnico
    const inputTecnico = document.getElementById('nombreTecnicoDiagnostico');
    const nombreTecnico = inputTecnico.value.trim();
    
    // Limpiar estilos anteriores
    inputTecnico.style.borderColor = '';
    inputTecnico.style.backgroundColor = '';
    
    if (!nombreTecnico) {
        // Marcar campo en rojo sin alert
        inputTecnico.style.borderColor = '#d32f2f';
        inputTecnico.style.borderWidth = '2px';
        inputTecnico.style.backgroundColor = '#ffebee';
        inputTecnico.focus();
        return;
    }

    // ✅ VALIDACIÓN 2: Problemas encontrados
    const filas = document.querySelectorAll('#problemasContainer > div');
    
    if (filas.length === 0) {
        alert('❌ Debe agregar al menos un problema');
        return;
    }

    // ✅ VALIDACIÓN 3: Todos los problemas completados
    const problemas = [];
    let hayErrores = false;

    filas.forEach((fila, index) => {
         const problemaInput = fila.querySelector('.problemaInput');
         const costoInput = fila.querySelector('.costoInput');
         const solucionInput = fila.querySelector('.solucionInput');

         const problema = problemaInput?.value.trim() || '';
         const costo = costoInput?.value || '';
         const solucion = solucionInput?.value.trim() || '';

         // Limpiar estilos anteriores
         if (problemaInput) {
             problemaInput.style.borderColor = '';
             problemaInput.style.backgroundColor = '';
         }
         if (costoInput) {
             costoInput.style.borderColor = '';
             costoInput.style.backgroundColor = '';
         }

         // Marcar campos incompletos en rojo
         if (!problema) {
             if (problemaInput) {
                 problemaInput.style.borderColor = '#d32f2f';
                 problemaInput.style.borderWidth = '2px';
                 problemaInput.style.backgroundColor = '#ffebee';
             }
             hayErrores = true;
         }

         if (!costo) {
             if (costoInput) {
                 costoInput.style.borderColor = '#d32f2f';
                 costoInput.style.borderWidth = '2px';
                 costoInput.style.backgroundColor = '#ffebee';
             }
             hayErrores = true;
         }

         // Solo agregar si está completo (descripción y costo obligatorios, solución opcional)
         if (problema && costo) {
             problemas.push({
                 descripcion: problema,
                 solucion: solucion,
                 costo: parseFloat(costo)
             });
         }
     });

    // Si hay errores, no permitir guardar
    if (hayErrores || problemas.length === 0) {
        return;
    }

    const montoTotal = parseFloat(document.getElementById('montoTotalDiagnostico').textContent);

    if (montoTotal <= 0) {
        alert('❌ El monto total debe ser mayor a 0');
        return;
    }

    try {
        const servicioId = window.servicioActualDiagnostico.id;
        console.log('💾 Guardando diagnóstico para servicio ID:', servicioId);
        console.log('📋 Problemas:', problemas);
        console.log('💰 Monto total:', montoTotal);
        console.log(`📊 Finalizar: ${finalizarDiag ? 'Sí (→ En reparación)' : 'No (→ En diagnóstico)'}`);

        // Obtener servicio actual para preservar datos
         const serviciosRes = await fetch(`${API_SERVICIOS}`);
         const servicios = await serviciosRes.json();
         const servicioActual = servicios.find(s => String(s._id) === String(servicioId));
        
        // Determinar estado según si finaliza o no
        const nuevoEstado = finalizarDiag ? 'En reparación' : 'En diagnóstico';
        const actualizacion = {
            ...servicioActual,
            estado: nuevoEstado,
            monto: montoTotal,
            diagnostico: JSON.stringify(problemas),
            tecnico: nombreTecnico,
            fecha_inicio_diagnostico: servicioActual.fecha_inicio_diagnostico || new Date().toLocaleString()
        };
        
        // Solo agregar fecha de inicio de reparación si finaliza
        if (finalizarDiag) {
            actualizacion.fecha_inicio_reparacion = new Date().toLocaleString();
        }
        
        const response = await fetch(`${API_SERVICIOS}/${servicioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actualizacion)
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('❌ Response error:', errorData);
            throw new Error('Error al guardar diagnóstico: ' + response.status);
        }

        const servicioGuardado = await response.json();
        console.log('✅ Diagnóstico guardado exitosamente:', servicioGuardado);

        // Generar mensaje de WhatsApp solo si finaliza
        if (finalizarDiag) {
            generarMensajeWhatsApp(problemas, montoTotal, nombreTecnico);
        }

        // Cerrar y recargar (sin alerts, pasando true para indicar que se guardó)
        cerrarModalDiagnostico(true);
        cargarServicios();
        cargarDiagnosticos();
        // ✅ MEJORA: Mostrar modal de éxito centrado
        mostrarNotificacionExito('Diagnóstico guardado');
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error al guardar diagnóstico: ' + error.message);
    }
}

// Generar mensaje de WhatsApp
function generarMensajeWhatsApp(problemas, montoTotal, nombreTecnico) {
    const servicio = window.servicioActualDiagnostico;
    let mensaje = `*DIAGNÓSTICO DEL EQUIPO*%0A%0A`;
    mensaje += `Cliente: ${servicio.cliente}%0A`;
    mensaje += `Servicio: ${servicio.numero_servicio}%0A%0A`;
    mensaje += `*Problemas Encontrados:*%0A`;

    problemas.forEach((p, idx) => {
        mensaje += `${idx + 1}. ${p.descripcion} - $${p.costo.toFixed(2)}%0A`;
    });

    mensaje += `%0A*Monto Total del Diagnóstico: $${montoTotal.toFixed(2)}*%0A`;
    mensaje += `Técnico: ${nombreTecnico}%0A`;
    mensaje += `Fecha: ${new Date().toLocaleDateString('es-ES')}%0A%0A`;
    mensaje += `Para más información, contáctenos.`;

    // Guardar en memoria para mostrar en tab de diagnósticos
    servicio.mensajeWhatsApp = mensaje;
}

// Abrir modal con todos los detalles del servicio
async function abrirModalDetallesServicio(servicioId) {
    try {
        mostrarModalCarga('Cargando detalles...');
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => s._id === servicioId);

        if (!servicio) {
            alert('Servicio no encontrado');
            return;
        }

        const clientesRes = await fetch(`${API_URL}/clientes`);
        const clientes = await clientesRes.json();
        const cliente = clientes.find(c => c._id == servicio.cliente_id);

        const equiposRes = await fetch(`${API_EQUIPOS}`);
        const equipos = await equiposRes.json();

        // Buscar equipo por equipo_id del servicio (primero intenta eso)
        let equipo = null;
        if (servicio.equipo_id) {
            equipo = equipos.find(e => e._id == servicio.equipo_id);
        }

        // Si no encuentra por equipo_id, intenta buscar en la tabla servicio-equipo
        if (!equipo) {
            const servicioEquipoRes = await fetch(`${API_SERVICIO_EQUIPO}`);
            const serviciosEquipo = await servicioEquipoRes.json();
            const servicioEquipo = serviciosEquipo.find(se => se.servicio_id == servicioId);
            if (servicioEquipo) {
                equipo = equipos.find(e => String(e._id) === String(servicioEquipo.equipo_id));
            }
        }

        let diagnostico = [];
        if (servicio.diagnostico) {
            try {
                diagnostico = JSON.parse(servicio.diagnostico);
            } catch (e) {
                console.warn('Error parsing diagnostico:', e);
            }
        }

        // Crear HTML del modal con estilo textual e informativo
         let detallesHTML = `
                 <!-- Título y Estado -->
                 <div style="padding: 0 0 16px 0; border-bottom: 2px solid #2192B8;">
                     <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #1e3c72;">
                         <i class="fas fa-file-contract" style="margin-right: 8px; color: #2192B8;"></i>Orden de Servicio ${servicio.numero_servicio || 'N/A'}
                     </h2>
                     <div style="font-size: 13px; color: #666; line-height: 1.8;">
                         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 10px;">
                             <span><i class="fas fa-calendar-alt" style="margin-right: 6px; color: #2192B8;"></i><strong>Fecha:</strong> ${servicio.fecha || 'N/A'}</span>
                             <span><i class="fas fa-clock" style="margin-right: 6px; color: #2192B8;"></i><strong>Hora:</strong> ${servicio.hora || 'N/A'}</span>
                         </div>
                         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                             <span><i class="fas fa-map-marker-alt" style="margin-right: 6px; color: #2192B8;"></i><strong>Local:</strong> <span style="padding: 2px 8px; border-radius: 3px; ${servicio.local === 'Ferreñafe' ? 'background: #C8E6C9; color: #2E7D32;' : 'background: #BBDEFB; color: #1565C0;'}">${servicio.local || 'N/A'}</span></span>
                             <span><strong>Estado:</strong> <span style="padding: 3px 10px; border-radius: 3px; background: #FFF3CD; color: #856404;">${servicio.estado || 'N/A'}</span></span>
                         </div>
                     </div>
                 </div>

                 <!-- Información del Cliente -->
                 <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0;">
                     <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #2192B8; font-weight: 600;">
                         <i class="fas fa-user-circle" style="margin-right: 6px;"></i>Información del Cliente
                     </h3>
                     <p style="margin: 8px 0; font-size: 13px; line-height: 1.8; color: #333;">
                         <strong style="color: #1e3c72; font-size: 14px;">${cliente ? cliente.nombre : 'N/A'}</strong><br/>
                         <span style="display: inline-block; margin-top: 4px;">
                             <i class="fas fa-id-card" style="margin-right: 4px; color: #999;"></i>DNI: <strong>${cliente ? cliente.dni : 'N/A'}</strong>
                         </span>
                         <span style="display: inline-block; margin-left: 16px;">
                             <i class="fas fa-phone" style="margin-right: 4px; color: #999;"></i>Teléfono: <strong>${cliente ? (cliente.telefono || 'No registrado') : 'N/A'}</strong>
                         </span>
                         ${cliente && cliente.email ? `
                             <span style="display: inline-block; margin-left: 16px;">
                                 <i class="fas fa-envelope" style="margin-right: 4px; color: #999;"></i>Email: <strong>${cliente.email}</strong>
                             </span>
                         ` : ''}
                         ${cliente && cliente.direccion ? `
                            <br/><span style="display: inline-block; margin-top: 6px;">
                                <i class="fas fa-map-pin" style="margin-right: 4px; color: #2192B8;"></i><strong>Dirección:</strong><br/>
                                ${(() => {
                                    const direccionParts = cliente.direccion.split('/').map(p => p.trim()).filter(p => p);
                                    const iconos = ['fas fa-road', 'fas fa-home', 'fas fa-map-marker-alt', 'fas fa-map-pin'];
                                    return direccionParts.map((parte, idx) => `
                                        <i class="${iconos[idx] || 'fas fa-map-pin'}" style="color: #2192B8; margin: 0 4px;"></i>
                                        <strong>${parte}</strong>
                                        ${idx < direccionParts.length - 1 ? ' - ' : ''}
                                    `).join('');
                                })()}
                            </span>
                         ` : ''}
                     </p>
                 </div>

                 <!-- Información del Equipo -->
                 <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0;">
                     <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #2192B8; font-weight: 600;">
                         <i class="fas fa-laptop" style="margin-right: 6px;"></i>Equipo Ingresado
                     </h3>
                     <p style="margin: 8px 0; font-size: 13px; line-height: 1.8; color: #333;">
                         ${equipo ? `
                             <strong style="color: #1e3c72; font-size: 14px;">${equipo.tipo_equipo || 'N/A'}</strong><br/>
                             <i class="fas fa-tag" style="margin-right: 4px; color: #999;"></i>Marca: <strong>${equipo.marca || 'N/A'}</strong><br/>
                             <i class="fas fa-cube" style="margin-right: 4px; color: #999;"></i>Modelo: <strong>${equipo.modelo || 'N/A'}</strong>
                             ${equipo.serie ? `<br/><i class="fas fa-barcode" style="margin-right: 4px; color: #999;"></i>Serie: <strong style="font-family: monospace;">${equipo.serie}</strong>` : ''}
                         ` : '<span style="color: #999;">No hay equipo registrado</span>'}
                     </p>
                 </div>

                 <!-- Problemas Reportados -->
                 <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0;">
                     <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #E65100; font-weight: 600;">
                         <i class="fas fa-exclamation-circle" style="margin-right: 6px;"></i>Problemas Reportados
                     </h3>
                     <div style="background: #fff8e1; padding: 12px; border-radius: 4px; border-left: 3px solid #FF9800; font-size: 13px; line-height: 1.8; color: #333;">
                         ${servicio.problemas || 'No especificado'}
                     </div>
                 </div>

                 <!-- Costos y Financiero -->
                 <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0;">
                     <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #2192B8; font-weight: 600;">
                         <i class="fas fa-dollar-sign" style="margin-right: 6px;"></i>Resumen Financiero
                     </h3>
                     <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                         <div style="background: #f0f7ff; padding: 12px; border-radius: 4px; border-left: 3px solid #4CAF50;">
                             <p style="margin: 0 0 4px 0; font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600;"><i class="fas fa-check-circle" style="margin-right: 4px;"></i>Adelanto</p>
                             <p style="margin: 0; font-size: 16px; font-weight: 700; color: #4CAF50;">$${parseFloat(servicio.adelanto || 0).toFixed(2)}</p>
                         </div>
                         <div style="background: #f0f7ff; padding: 12px; border-radius: 4px; border-left: 3px solid #2196F3;">
                             <p style="margin: 0 0 4px 0; font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600;"><i class="fas fa-receipt" style="margin-right: 4px;"></i>Monto Total</p>
                             <p style="margin: 0; font-size: 16px; font-weight: 700; color: #2196F3;">$${parseFloat(servicio.monto || 0).toFixed(2)}</p>
                         </div>
                         <div style="background: #f0f7ff; padding: 12px; border-radius: 4px; border-left: 3px solid ${(parseFloat(servicio.monto || 0) - parseFloat(servicio.adelanto || 0)) > 0 ? '#d32f2f' : '#4CAF50'};">
                             <p style="margin: 0 0 4px 0; font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600;"><i class="fas fa-balance-scale" style="margin-right: 4px;"></i>Saldo Pendiente</p>
                             <p style="margin: 0; font-size: 16px; font-weight: 700; color: ${(parseFloat(servicio.monto || 0) - parseFloat(servicio.adelanto || 0)) > 0 ? '#d32f2f' : '#4CAF50'};">$${(parseFloat(servicio.monto || 0) - parseFloat(servicio.adelanto || 0)).toFixed(2)}</p>
                         </div>
                     </div>
                 </div>

                 ${servicio.observaciones ? `
                     <!-- Observaciones -->
                     <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0;">
                         <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #6A1B9A; font-weight: 600;">
                             <i class="fas fa-file-alt" style="margin-right: 6px;"></i>Observaciones Adicionales
                         </h3>
                         <div style="background: #f3e5f5; padding: 12px; border-radius: 4px; border-left: 3px solid #9C27B0; font-size: 13px; line-height: 1.8; color: #333; white-space: pre-wrap;">
                             ${servicio.observaciones}
                         </div>
                     </div>
                 ` : ''}

                 <!-- Diagnóstico Realizado -->
                 ${diagnostico && diagnostico.length > 0 ? `
                     <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0;">
                         <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #2192B8; font-weight: 600;">
                             <i class="fas fa-stethoscope" style="margin-right: 6px;"></i>Diagnóstico Realizado
                         </h3>
                         <p style="margin: 8px 0 12px 0; font-size: 13px; color: #666;">
                             <strong>Técnico Diagnosticador:</strong> ${servicio.tecnico || 'N/A'}
                         </p>
                         <div style="background: #e3f2fd; padding: 12px; border-radius: 4px; border-left: 3px solid #2196F3;">
                             <p style="margin: 0 0 10px 0; font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600;"><i class="fas fa-list-check" style="margin-right: 4px;"></i>Problemas Encontrados y Soluciones</p>
                             <ul style="margin: 0; padding-left: 0; list-style-type: none;">
                                 ${diagnostico.map((p, idx) => `
                                     <li style="margin: 8px 0; padding: 10px; background: white; border-radius: 3px; border-left: 3px solid #2196F3; font-size: 13px;">
                                         <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
                                             <div style="flex: 1;">
                                                 <p style="margin: 0 0 4px 0; font-weight: 600; color: #1e3c72;">
                                                     <i class="fas fa-bug" style="margin-right: 4px; color: #E65100;"></i>${p.descripcion}
                                                 </p>
                                                 ${p.solucion ? `<p style="margin: 0; font-size: 12px; color: #666;"><i class="fas fa-tools" style="margin-right: 4px; color: #4CAF50;"></i><strong>Solución:</strong> ${p.solucion}</p>` : ''}
                                             </div>
                                             <div style="text-align: right; white-space: nowrap;">
                                                 <p style="margin: 0; font-weight: 700; color: #2196F3; font-size: 14px;">$${parseFloat(p.costo).toFixed(2)}</p>
                                             </div>
                                         </div>
                                     </li>
                                 `).join('')}
                             </ul>
                             <div style="margin-top: 12px; padding: 10px; background: #BBDEFB; border-radius: 3px; text-align: right;">
                                 <p style="margin: 0; font-size: 12px; color: #1565C0; font-weight: 600;">
                                     <i class="fas fa-calculator" style="margin-right: 4px;"></i>Costo Total del Diagnóstico: <strong style="font-size: 14px;">$${parseFloat(servicio.monto || 0).toFixed(2)}</strong>
                                 </p>
                             </div>
                         </div>
                     </div>
                 ` : ''}

                 ${(servicio.estado === 'En reparación' || servicio.estado === 'Completado' || servicio.estado === 'Entregado') && servicio.datos_inicio_reparacion ? `
                     <!-- Datos de Inicio de Reparación -->
                     <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0;">
                         <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #FF6F00; font-weight: 600;">
                             <i class="fas fa-tools" style="margin-right: 6px;"></i>Datos de Reparación
                         </h3>
                         ${(() => {
                             try {
                                 const datosReparacion = JSON.parse(servicio.datos_inicio_reparacion);
                                 return `
                                     <div style="background: #fff3e0; padding: 12px; border-radius: 4px; border-left: 3px solid #FF6F00;">
                                         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
                                             <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #E65100;"><i class="fas fa-user" style="margin-right: 6px;"></i>Técnico Asignado:</strong><br/>
                                                 ${datosReparacion.tecnicoReparacion || 'N/A'}
                                             </p>
                                             <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #E65100;"><i class="fas fa-hourglass-half" style="margin-right: 6px;"></i>Tiempo Estimado:</strong><br/>
                                                 ${datosReparacion.tiempoEstimado || 'N/A'}
                                             </p>
                                         </div>
                                         ${datosReparacion.observacionesInicio ? `
                                             <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #E65100;"><i class="fas fa-file-alt" style="margin-right: 6px;"></i>Observaciones Iniciales:</strong><br/>
                                                 ${datosReparacion.observacionesInicio}
                                             </p>
                                         ` : ''}
                                     </div>
                                 `;
                             } catch (e) {
                                 return '<p style="color: #d32f2f; font-size: 13px;">Error al procesar datos de reparación</p>';
                             }
                         })()}
                     </div>
                 ` : ''}

                 ${(servicio.estado === 'Completado' || servicio.estado === 'Entregado') && servicio.datos_reparacion_completa ? `
                     <!-- Datos de Reparación Completada -->
                     <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0;">
                         <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #4CAF50; font-weight: 600;">
                             <i class="fas fa-check-circle" style="margin-right: 6px;"></i>Reparación Completada
                         </h3>
                         ${(() => {
                             try {
                                 const datosCompleta = JSON.parse(servicio.datos_reparacion_completa);
                                 return `
                                     <div style="background: #e8f5e9; padding: 12px; border-radius: 4px; border-left: 3px solid #4CAF50;">
                                         <div style="margin-bottom: 10px;">
                                             <p style="margin: 0 0 8px 0; font-size: 13px; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-check-circle" style="margin-right: 6px;"></i>Estado:</strong> Reparación completada
                                             </p>
                                             ${datosCompleta.fechaCompletado ? `
                                                 <p style="margin: 0 0 8px 0; font-size: 13px; color: #333;">
                                                     <strong style="color: #2E7D32;"><i class="fas fa-calendar-alt" style="margin-right: 6px;"></i>Fecha de Completación:</strong><br/>
                                                     ${datosCompleta.fechaCompletado}
                                                 </p>
                                             ` : ''}
                                         </div>
                                         ${datosCompleta.comentariosReparacion ? `
                                             <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-comment" style="margin-right: 6px;"></i>Comentarios:</strong><br/>
                                                 ${datosCompleta.comentariosReparacion}
                                             </p>
                                         ` : ''}
                                     </div>
                                 `;
                             } catch (e) {
                                 return '<p style="color: #d32f2f; font-size: 13px;">Error al procesar datos de reparación completada</p>';
                             }
                         })()}
                     </div>
                 ` : ''}

                 ${servicio.estado === 'Entregado' && servicio.datos_entrega ? `
                     <!-- Datos de Entrega -->
                     <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0;">
                         <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #4CAF50; font-weight: 600;">
                             <i class="fas fa-box-open" style="margin-right: 6px;"></i>Datos de Entrega
                         </h3>
                         ${(() => {
                             try {
                                 const datosEntrega = JSON.parse(servicio.datos_entrega);
                                 return `
                                     <div style="background: #e8f5e9; padding: 12px; border-radius: 4px; border-left: 3px solid #4CAF50;">
                                         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
                                             <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-calendar-alt" style="margin-right: 6px;"></i>Fecha Entrega:</strong><br/>
                                                 ${datosEntrega.fechaEntrega || 'N/A'}
                                             </p>
                                             <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-clock" style="margin-right: 6px;"></i>Hora Entrega:</strong><br/>
                                                 ${datosEntrega.horaEntrega || 'N/A'}
                                             </p>
                                         </div>
                                         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
                                             <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-user" style="margin-right: 6px;"></i>Encargado de Entrega:</strong><br/>
                                                 ${datosEntrega.encargadoEntrega || 'N/A'}
                                             </p>
                                             <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-check" style="margin-right: 6px;"></i>Estado del Equipo:</strong><br/>
                                                 <span style="padding: 2px 6px; border-radius: 3px; ${datosEntrega.estadoEquipo === 'Funcionando correctamente' ? 'background: #C8E6C9; color: #2E7D32;' : 'background: #FFF3CD; color: #856404;'}">${datosEntrega.estadoEquipo || 'N/A'}</span>
                                             </p>
                                         </div>
                                         ${datosEntrega.observacionesEntrega ? `
                                             <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-file-alt" style="margin-right: 6px;"></i>Observaciones de Entrega:</strong><br/>
                                                 ${datosEntrega.observacionesEntrega}
                                             </p>
                                         ` : ''}
                                         ${datosEntrega.montoCobraHoy ? `
                                             <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-money-bill" style="margin-right: 6px;"></i>Monto Cobrado Hoy:</strong><br/>
                                                 $${parseFloat(datosEntrega.montoCobraHoy).toFixed(2)}
                                             </p>
                                         ` : ''}
                                         ${datosEntrega.metodoPago ? `
                                             <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-credit-card" style="margin-right: 6px;"></i>Método de Pago:</strong><br/>
                                                 ${datosEntrega.metodoPago}
                                             </p>
                                         ` : ''}
                                         ${datosEntrega.comprobanteEntrega ? `
                                             <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-receipt" style="margin-right: 6px;"></i>Comprobante:</strong><br/>
                                                 ${datosEntrega.comprobanteEntrega}
                                             </p>
                                         ` : ''}
                                         ${datosEntrega.garantiaHasta ? `
                                             <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-shield-alt" style="margin-right: 6px;"></i>Garantía Hasta:</strong><br/>
                                                 ${datosEntrega.garantiaHasta}
                                             </p>
                                         ` : ''}
                                         ${datosEntrega.recomendaciones ? `
                                             <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6; color: #333;">
                                                 <strong style="color: #2E7D32;"><i class="fas fa-lightbulb" style="margin-right: 6px;"></i>Recomendaciones:</strong><br/>
                                                 ${datosEntrega.recomendaciones}
                                             </p>
                                         ` : ''}
                                     </div>
                                 `;
                             } catch (e) {
                                 return '<p style="color: #d32f2f; font-size: 13px;">Error al procesar datos de entrega</p>';
                             }
                         })()}
                     </div>
                 ` : ''}
         `;

        // Agregar estilos responsivos dinámicamente
         const styleSheet = document.createElement('style');
         styleSheet.textContent = `
             #modalDetallesServicio .modal-content {
                 width: 88vw !important;
                 max-width: 900px !important;
                 max-height: 90vh !important;
                 overflow-y: auto !important;
                 margin: auto !important;
                 padding: 20px !important;
                 background: white !important;
             }

             /* Desktop grande (1920px+) */
             @media (min-width: 1920px) {
                 #modalDetallesServicio .modal-content {
                     width: 80vw !important;
                     max-width: 1100px !important;
                 }
             }
             
             /* Desktop normal (1280px - 1919px) */
             @media (min-width: 1280px) and (max-width: 1919px) {
                 #modalDetallesServicio .modal-content {
                     width: 85vw !important;
                     max-width: 950px !important;
                 }
             }
             
             /* Tablet (768px - 1279px) */
             @media (min-width: 768px) and (max-width: 1279px) {
                 #modalDetallesServicio .modal-content {
                     width: 90vw !important;
                     max-width: 800px !important;
                     padding: 16px !important;
                 }
             }
             
             /* Móvil (< 768px) */
             @media (max-width: 767px) {
                 #modalDetallesServicio .modal-content {
                     width: 95vw !important;
                     max-width: 100% !important;
                     padding: 12px !important;
                 }
             }
         `;
         if (!document.getElementById('modalDetallesStyle')) {
             styleSheet.id = 'modalDetallesStyle';
             document.head.appendChild(styleSheet);
         }
         
         // Crear modal adaptativo
         const modal = document.createElement('div');
         modal.id = 'modalDetallesServicio';
         modal.className = 'modal show';
         modal.innerHTML = `
             <div class="modal-content" style="
                 border-radius: 8px;
                 background: white;
                 box-shadow: 0 4px 20px rgba(0,0,0,0.15);
             ">
                 <div class="modal-header" style="position: sticky; top: 0; background: white; z-index: 10; border-bottom: 2px solid #2192B8; padding: 20px;">
                     <h2 style="color: #2192B8; margin: 0;"><i class="fas fa-search"></i> Detalles del Servicio ${servicio.numero_servicio}</h2>
                     <button class="close-btn" onclick="cerrarModalDetallesServicio()" style="position: absolute; right: 20px; top: 20px;">×</button>
                 </div>
                 <div class="detalles-grid" style="
                     padding: 20px;
                     background: #f9f9f9;
                     display: grid;
                     grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                     gap: 15px;
                 ">
                     ${detallesHTML}
                 </div>
             </div>
         `;

         cerrarModalCarga();
         document.body.appendChild(modal);
        
        console.log('✅ Modal de detalles abierto:', servicio);
    } catch (error) {
        cerrarModalCarga();
        console.error('❌ Error:', error);
        alert('Error al cargar detalles del servicio: ' + error.message);
    }
}

// Cerrar modal de detalles
function cerrarModalDetallesServicio() {
    const modal = document.getElementById('modalDetallesServicio');
    if (modal) modal.remove();
}

// Ver diagnóstico guardado


async function confirmarEliminarServicio(id) {
    document.getElementById('confirmMsg').textContent = '¿Estás seguro de que deseas eliminar este servicio?';
    document.getElementById('confirmBtn').onclick = () => eliminarServicio(id);
    document.getElementById('confirmModal').classList.add('show');
}

async function eliminarServicio(id) {
    try {
        // ✅ MEJORA: Mostrar modal de carga
        mostrarModalCarga('Eliminando...');
        
        const response = await fetch(`${API_SERVICIOS}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            cerrarModalCarga();
            throw new Error('Error al eliminar');
        }

        // ✅ MEJORA: Cerrar modal de carga
        cerrarModalCarga();
        
        cargarServicios();
        cerrarModal();
        
        // ✅ MEJORA: Mostrar modal de éxito centrado
        mostrarNotificacionExito('Servicio eliminado');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar servicio');
    }
}

async function actualizarSelectsEquipos() {
    try {
        const response = await fetch(`${API_EQUIPOS}`);
        const equipos = await response.json();
        const select = document.getElementById('selectEquipos');

        // Solo actualizar si el elemento existe (antigua versión con select)
        if (select) {
            const defaultOption = select.options[0];
            select.innerHTML = '';
            select.appendChild(defaultOption);

            equipos.forEach(eq => {
                const option = document.createElement('option');
                option.value = eq.id;
                option.textContent = eq.tipo_equipo + ' - ' + eq.marca + ' ' + eq.modelo;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ==================== EQUIPOS ====================

// Abrir modal nuevo equipo
function abrirModalNuevoEquipo() {
    document.getElementById('modalNuevoEquipo').classList.add('show');
    document.getElementById('formEquipo').reset();
}

// Cerrar modal nuevo equipo
function cerrarModalNuevoEquipo() {
    document.getElementById('modalNuevoEquipo').classList.remove('show');
    document.getElementById('formEquipo').reset();
}

// Abrir modal seleccionar equipo
async function abrirModalSeleccionarEquipo() {
    // Mostrar modal
    document.getElementById('modalSeleccionarEquipo').classList.add('show');
    
    // Limpiar búsqueda
    document.getElementById('busquedaEquipoModal').value = '';
    
    // Cargar todos los equipos
    await cargarEquiposEnModal();
    
    // Enfocar campo de búsqueda
    setTimeout(() => {
        document.getElementById('busquedaEquipoModal').focus();
    }, 100);
}

// Cerrar modal seleccionar equipo
function cerrarModalSeleccionarEquipo() {
    document.getElementById('modalSeleccionarEquipo').classList.remove('show');
    document.getElementById('busquedaEquipoModal').value = ''; // Limpiar búsqueda
}

// Cargar todos los equipos al abrir modal
async function cargarEquiposEnModal() {
    try {
        const response = await fetch(`${API_EQUIPOS}`);
        const equipos = await response.json();
        
        // Guardar equipos globalmente para búsqueda
        window.equiposCompletos = equipos;
        
        mostrarEquiposEnModal(equipos);
    } catch (error) {
        console.error('Error al cargar equipos:', error);
        document.getElementById('equiposDisponiblesContainer').innerHTML = 
            '<div style="text-align: center; color: #d32f2f; padding: 20px;">Error al cargar equipos</div>';
    }
}

// Mostrar equipos en el modal
function mostrarEquiposEnModal(equipos) {
    const container = document.getElementById('equiposDisponiblesContainer');
    
    if (!equipos || equipos.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; padding: 30px; font-style: italic;">📦 No hay equipos registrados</div>';
        return;
    }

    let html = '';
    equipos.forEach(equipo => {
        const icono = getIconoEquipo(equipo.tipo_equipo);
        html += `
            <div style="padding: 15px; border: 1px solid #e8e8e8; margin-bottom: 10px; border-radius: 6px; cursor: pointer; background: #ffffff; transition: all 0.3s ease; box-sizing: border-box;" 
                 onclick="abrirModalConfirmarEquipo('${equipo._id}')"
                 onmouseover="this.style.background='#f5f9ff'; this.style.borderColor='#2192B8'; this.style.boxShadow='0 3px 8px rgba(33,146,184,0.15)'; this.style.transform='translateY(-1px)';" 
                 onmouseout="this.style.background='#ffffff'; this.style.borderColor='#e8e8e8'; this.style.boxShadow='none'; this.style.transform='translateY(0)';">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="font-size: 24px; color: #2192B8; min-width: 32px; text-align: center;">
                        <i class="${icono}"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #333; font-size: 15px; margin-bottom: 6px;">
                            ${equipo.tipo_equipo}
                        </div>
                        <div style="color: #666; font-size: 13px; line-height: 1.5;">
                            Marca: ${equipo.marca || 'N/A'} | Modelo: ${equipo.modelo || 'N/A'} | Serie: ${equipo.numero_serie || 'N/A'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Filtrar equipos en el modal
function filtrarEquiposModal() {
    const busqueda = document.getElementById('busquedaEquipoModal').value.toLowerCase().trim();
    
    if (!window.equiposCompletos) return;
    
    if (!busqueda) {
        mostrarEquiposEnModal(window.equiposCompletos);
        return;
    }
    
    const coincidencias = window.equiposCompletos.filter(eq =>
        eq.tipo_equipo.toLowerCase().includes(busqueda) ||
        (eq.marca && eq.marca.toLowerCase().includes(busqueda)) ||
        (eq.modelo && eq.modelo.toLowerCase().includes(busqueda)) ||
        (eq.numero_serie && eq.numero_serie.toLowerCase().includes(busqueda))
    );
    
    mostrarEquiposEnModal(coincidencias);
}

// Abrir formulario para nuevo equipo en modal
function abrirFormularioNuevoEquipoModal() {
    // Marcar que venimos desde selección para auto-seleccionar después
    window.viniendonFromSeleccion = true;
    
    // Cerrar modal de selección
    cerrarModalSeleccionarEquipo();
    
    // Abrir modal de nuevo equipo
    abrirModalNuevoEquipo();
}

// Mostrar modal de confirmación
async function abrirModalConfirmarEquipo(equipoId) {
    // Prevenir múltiples clicks
    if (window.abriendomodalEquipo) return;
    window.abriendomodalEquipo = true;
    
    try {
        // Obtener datos del equipo
        const response = await fetch(`${API_EQUIPOS}`);
        const equipos = await response.json();
        const equipo = equipos.find(e => String(e._id) === String(equipoId));
        
        if (!equipo) {
            alert('Equipo no encontrado');
            window.abriendomodalEquipo = false;
            return;
        }
        
        // Guardar ID y datos del equipo seleccionado
        window.equipoSeleccionadoId = equipoId;
        window.equipoSeleccionadoTipo = equipo.tipo_equipo;
        window.equipoSeleccionadoMarca = equipo.marca || '';
        window.equipoSeleccionadoModelo = equipo.modelo || '';
        window.equipoSeleccionadoSerie = equipo.numero_serie || equipo.serie || '';
        window.equipoSeleccionadoNombre = `${equipo.tipo_equipo} - ${equipo.marca || 'N/A'} ${equipo.modelo || 'N/A'}`;
        
        console.log('✅ Equipo cargado:', {
            tipo: window.equipoSeleccionadoTipo,
            marca: window.equipoSeleccionadoMarca,
            modelo: window.equipoSeleccionadoModelo,
            serie: window.equipoSeleccionadoSerie
        });
        
        // Llenar modal de confirmación
        const icono = getIconoEquipo(equipo.tipo_equipo);
        document.getElementById('confirmTipoEquipo').innerHTML = `<i class="${icono}" style="margin-right: 6px;"></i>${equipo.tipo_equipo}`;
        document.getElementById('confirmMarcaEquipo').textContent = equipo.marca || 'N/A';
        document.getElementById('confirmModeloEquipo').textContent = equipo.modelo || 'N/A';
        document.getElementById('confirmSerieEquipo').textContent = window.equipoSeleccionadoSerie || 'N/A';
        
        // Mostrar modal
        document.getElementById('modalConfirmarEquipo').classList.add('show');
        
        setTimeout(() => {
            window.abriendomodalEquipo = false;
        }, 500);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar datos del equipo');
        window.abriendomodalEquipo = false;
    }
}

// Cerrar modal de confirmación
function cerrarModalConfirmarEquipo() {
    document.getElementById('modalConfirmarEquipo').classList.remove('show');
    window.equipoSeleccionadoId = null;
    window.equipoSeleccionadoTipo = null;
    window.equipoSeleccionadoMarca = null;
    window.equipoSeleccionadoModelo = null;
    window.equipoSeleccionadoSerie = null;
    window.equipoSeleccionadoNombre = null;
}

// ==================== FUNCIONES DE EDICIÓN DE EQUIPO EN CONFIRMACIÓN ====================

// Alternar vista de edición
function toggleEditarDatosEquipo() {
    const viewDatos = document.getElementById('viewDatosEquipo');
    const editDatos = document.getElementById('editDatosEquipo');
    const btnToggle = document.getElementById('btnToggleEditar');
    
    if (editDatos.style.display === 'none') {
        // Mostrar vista editable
        // Cargar valores actuales en los campos
        const tipoValor = window.equipoSeleccionadoTipo || '';
        console.log('📋 Tipo a cargar:', tipoValor);
        
        // Para el select, normalizar el valor (case-insensitive search)
        const selectTipo = document.getElementById('editConfirmTipoEquipo');
        let encontrado = false;
        for (let option of selectTipo.options) {
            if (option.value.toLowerCase() === tipoValor.toLowerCase()) {
                selectTipo.value = option.value;
                encontrado = true;
                break;
            }
        }
        if (!encontrado && tipoValor) {
            console.warn('⚠️ Tipo no encontrado en opciones:', tipoValor);
            selectTipo.value = 'Otro';
        }
        
        document.getElementById('editConfirmMarcaEquipo').value = window.equipoSeleccionadoMarca || '';
        document.getElementById('editConfirmModeloEquipo').value = window.equipoSeleccionadoModelo || '';
        document.getElementById('editConfirmSerieEquipo').value = window.equipoSeleccionadoSerie || '';
        
        viewDatos.style.display = 'none';
        editDatos.style.display = 'grid';
        btnToggle.innerHTML = '<i class="fas fa-eye"></i> Ver';
        btnToggle.style.background = '#666';
    } else {
        // Volver a vista normal
        viewDatos.style.display = 'grid';
        editDatos.style.display = 'none';
        btnToggle.innerHTML = '<i class="fas fa-edit"></i> Editar';
        btnToggle.style.background = '#2192B8';
    }
}

// Cancelar edición
function cancelarEditarDatosEquipo() {
    const viewDatos = document.getElementById('viewDatosEquipo');
    const editDatos = document.getElementById('editDatosEquipo');
    const btnToggle = document.getElementById('btnToggleEditar');
    
    viewDatos.style.display = 'grid';
    editDatos.style.display = 'none';
    btnToggle.innerHTML = '<i class="fas fa-edit"></i> Editar';
    btnToggle.style.background = '#2192B8';
}

// Guardar cambios editados temporalmente (sin guardar en BD aún)
function guardarCambiosEquipoConfirm() {
    const nuevoTipo = document.getElementById('editConfirmTipoEquipo').value?.trim();
    const nuevaMarca = document.getElementById('editConfirmMarcaEquipo').value?.trim();
    const nuevoModelo = document.getElementById('editConfirmModeloEquipo').value?.trim();
    const nuevaSerie = document.getElementById('editConfirmSerieEquipo').value?.trim();
    
    // Validar campos requeridos
    if (!nuevoTipo) {
        alert('⚠️ El tipo de equipo es obligatorio');
        return;
    }
    
    // Guardar datos editados en variables temporales
    window.equipoEditado = {
        cliente_id: document.getElementById('cliente_id').value,
        tipo_equipo: nuevoTipo,
        marca: nuevaMarca || '',
        modelo: nuevoModelo || '',
        numero_serie: nuevaSerie || ''
    };
    
    // Actualizar vista normal con los nuevos datos
    const icono = getIconoEquipo(nuevoTipo);
    document.getElementById('confirmTipoEquipo').innerHTML = `<i class="${icono}" style="margin-right: 6px;"></i>${nuevoTipo}`;
    document.getElementById('confirmMarcaEquipo').textContent = nuevaMarca || '-';
    document.getElementById('confirmModeloEquipo').textContent = nuevoModelo || '-';
    document.getElementById('confirmSerieEquipo').textContent = nuevaSerie || '-';
    
    // Actualizar variables de sesión temporales
    window.equipoSeleccionadoTipo = nuevoTipo;
    window.equipoSeleccionadoMarca = nuevaMarca;
    window.equipoSeleccionadoModelo = nuevoModelo;
    window.equipoSeleccionadoSerie = nuevaSerie;
    window.equipoSeleccionadoNombre = `${nuevoTipo} - ${nuevaMarca || 'N/A'} ${nuevoModelo || 'N/A'}`;
    
    // Volver a vista normal
    cancelarEditarDatosEquipo();
}

// Confirmar selección de equipo
async function confirmarSeleccionEquipo() {
    if (!window.equipoSeleccionadoId) {
        console.warn('No hay equipo seleccionado');
        return;
    }
    
    try {
        let equipoIdFinal = window.equipoSeleccionadoId;
        
        // Si se editó el equipo, crear nuevo equipo en BD
        if (window.equipoEditado) {
            console.log('📤 Enviando equipo editado:', window.equipoEditado);
            console.log('   (Equipo existente será reemplazado)');
            
            if (!window.equipoEditado.cliente_id) {
                throw new Error('cliente_id no está presente');
            }
            
            if (!window.equipoEditado.tipo_equipo) {
                throw new Error('tipo_equipo no está presente');
            }
            
            const response = await fetch(`${API_EQUIPOS}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.equipoEditado)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Error respuesta:', errorData);
                throw new Error(errorData.error || 'Error al crear equipo');
            }
            
            const equipoGuardado = await response.json();
            equipoIdFinal = equipoGuardado._id;
            console.log('✅ Nuevo equipo creado:', equipoGuardado);
        } else {
            console.log('✓ Usando equipo existente (sin ediciones):', window.equipoSeleccionadoId);
        }
        
        // Asignar equipo al formulario
        document.getElementById('equipo_id').value = equipoIdFinal;
        document.getElementById('equipoSeleccionado').value = window.equipoSeleccionadoNombre;
        
        // Actualizar problemas según tipo de equipo guardado
        if (window.equipoSeleccionadoTipo) {
            actualizarProblemasSegunEquipoTipo(window.equipoSeleccionadoTipo);
        }
        
        console.log('✅ Equipo confirmado:', window.equipoSeleccionadoNombre);
        
        // Limpiar datos editados
        window.equipoEditado = null;
        
        // Cerrar ambos modales
        setTimeout(() => {
            cerrarModalConfirmarEquipo();
            cerrarModalSeleccionarEquipo();
        }, 100);
        
    } catch (error) {
        console.error('Error al confirmar equipo:', error);
        alert('Error al confirmar equipo: ' + error.message);
    }
}

// Seleccionar equipo desde la búsqueda (ahora abre confirmación)
function seleccionarEquipoServicio(equipoId, descripcion) {
    abrirModalConfirmarEquipo(equipoId);
}

// Mostrar formulario para crear nuevo equipo
function mostrarFormularioNuevoEquipo() {
    document.getElementById('equiposBusquedaContainer').style.display = 'none';
    document.getElementById('btnCrearNuevoEquipo').style.display = 'none';
    document.getElementById('seccionNuevoEquipoDesdeServicio').style.display = 'block';
    document.getElementById('tipoEquipoNuevo').focus();
}

// Cancelar creación de nuevo equipo
function cancelarNuevoEquipoDesdeServicio() {
    document.getElementById('seccionNuevoEquipoDesdeServicio').style.display = 'none';
    document.getElementById('equiposBusquedaContainer').style.display = 'block';
    document.getElementById('btnCrearNuevoEquipo').style.display = 'block';
}

// Guardar equipo desde servicio


async function guardarEquipo(e) {
    e.preventDefault();
    const formData = new FormData(document.getElementById('formEquipo'));
    const equipo = Object.fromEntries(formData);

    try {
        // ✅ MEJORA: Mostrar modal de carga
        mostrarModalCarga('Guardando...');
        
        const response = await fetch(`${API_EQUIPOS}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(equipo)
        });

        if (!response.ok) {
            cerrarModalCarga();
            throw new Error('Error al guardar equipo');
        }

        const equipoGuardado = await response.json();

        // ✅ MEJORA: Cerrar modal de carga
        cerrarModalCarga();

        // Si venimos desde la selección, auto-seleccionar el equipo
         if (window.viniendonFromSeleccion) {
             document.getElementById('equipo_id').value = equipoGuardado._id;
             document.getElementById('equipoSeleccionado').value = 
                 `${equipoGuardado.tipo_equipo} - ${equipoGuardado.marca || 'N/A'} ${equipoGuardado.modelo || 'N/A'}`;
            
             // Actualizar problemas según el tipo
             actualizarProblemasSegunEquipoTipo(equipoGuardado.tipo_equipo);
             
             window.viniendonFromSeleccion = false;
         }

         document.getElementById('formEquipo').reset();
         cerrarModalNuevoEquipo();
         cargarEquipos();
         
         // ✅ MEJORA: Mostrar modal de éxito centrado
         mostrarNotificacionExito('Equipo guardado');
        actualizarSelectsEquipos();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar equipo');
        window.viniendonFromSeleccion = false;
    }
}

async function cargarEquipos() {
    const container = document.getElementById('equiposContainer');
    container.innerHTML = `
        <div class="loading-spinner-inline">
            <div class="loading-spinner-circle"></div>
            <p class="loading-spinner-text">Cargando equipos...</p>
        </div>`;
    try {
        const clientesRes = await fetch(`${API_URL}/clientes`);
        const clientes = await clientesRes.json();

        const equiposRes = await fetch(`${API_EQUIPOS}`);
        const equipos = await equiposRes.json();

        if (equipos.length === 0) {
            container.innerHTML = '<div class="no-records">No hay equipos registrados</div>';
            return;
        }

        let html = `
            <table class="records-table">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Marca</th>
                        <th>Modelo</th>
                        <th>Serie</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        equipos.forEach(eq => {
            const iconoTipo = getIconoEquipo(eq.tipo_equipo);
            html += `
                <tr>
                    <td><i class="${iconoTipo}" style="margin-right: 8px;"></i>${eq.tipo_equipo}</td>
                    <td>${eq.marca || 'N/A'}</td>
                    <td>${eq.modelo || 'N/A'}</td>
                    <td>${eq.numero_serie || 'N/A'}</td>
                    <td class="actions">
                         <button class="btn-edit" onclick="abrirModalEditarEquipo('${eq._id}')">Editar</button>
                         <button class="btn-danger" onclick="confirmarEliminarEquipo('${eq._id}')">Eliminar</button>
                      </td>
                 </tr>
             `;
         });

        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function filtrarEquipos() {
    const busqueda = document.getElementById('searchEquipos').value.toLowerCase();
    try {
        const equiposRes = await fetch(`${API_EQUIPOS}`);
        const equipos = await equiposRes.json();
        const filtrados = equipos.filter(eq =>
            eq.tipo_equipo.toLowerCase().includes(busqueda) ||
            (eq.marca && eq.marca.toLowerCase().includes(busqueda)) ||
            (eq.modelo && eq.modelo.toLowerCase().includes(busqueda)) ||
            (eq.numero_serie && eq.numero_serie.toLowerCase().includes(busqueda))
        );

        const container = document.getElementById('equiposContainer');

        if (filtrados.length === 0) {
            container.innerHTML = '<div class="no-records">No se encontraron equipos</div>';
            return;
        }

        let html = `
            <table class="records-table">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Marca</th>
                        <th>Modelo</th>
                        <th>Serie</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filtrados.forEach(eq => {
            const iconoTipo = getIconoEquipo(eq.tipo_equipo);
            html += `
                <tr>
                    <td><i class="${iconoTipo}" style="margin-right: 8px;"></i>${eq.tipo_equipo}</td>
                    <td>${eq.marca || 'N/A'}</td>
                    <td>${eq.modelo || 'N/A'}</td>
                    <td>${eq.numero_serie || 'N/A'}</td>
                    <td class="actions">
                         <button class="btn-edit" onclick="abrirModalEditarEquipo('${eq._id}')">Editar</button>
                         <button class="btn-danger" onclick="confirmarEliminarEquipo('${eq._id}')">Eliminar</button>
                     </td>
                    </tr>
                    `;
                    });

                    html += `</tbody></table>`;
                    container.innerHTML = html;
                    } catch (error) {
                    console.error('Error:', error);
                    }
                    }
                    
                    async function abrirModalEditarEquipo(id) {
                    try {
                    const response = await fetch(`${API_EQUIPOS}`);
                    const equipos = await response.json();
                    const equipo = equipos.find(e => String(e._id) === String(id));

                    if (!equipo) {
                    alert('Equipo no encontrado');
                    return;
                    }

                    // ✅ MEJORA: Guardar datos originales para detectar cambios
                    window.equipoEnEdicion = {
                    _id: equipo._id,
                    tipo_equipo: equipo.tipo_equipo,
                    marca: equipo.marca,
                    modelo: equipo.modelo,
                    numero_serie: equipo.numero_serie
                    };

                    // Llenar modal con datos del equipo
                    document.getElementById('editEquipoId').value = equipo._id;
                    document.getElementById('editTipoEquipo').value = equipo.tipo_equipo;
                    document.getElementById('editMarca').value = equipo.marca;
                    document.getElementById('editModelo').value = equipo.modelo;
                    document.getElementById('editSerie').value = equipo.numero_serie;

                    // Actualizar icono
                    actualizarIconoEditar();

                    // Mostrar modal
                    document.getElementById('modalEditarEquipo').classList.add('show');
                    } catch (error) {
                    console.error('Error:', error);
                    alert('Error al abrir modal de edición');
                    }
                    }

function cerrarModalEditarEquipo() {
    document.getElementById('modalEditarEquipo').classList.remove('show');
}

async function guardarCambiosEquipo(e) {
    e.preventDefault();
    
    const id = document.getElementById('editEquipoId').value;
    const tipoEquipoNuevo = document.getElementById('editTipoEquipo').value;
    const marcaNueva = document.getElementById('editMarca').value;
    const modeloNuevo = document.getElementById('editModelo').value;
    const serieNueva = document.getElementById('editSerie').value;
    
    // ✅ MEJORA: Detectar si hubo cambios reales
    const tipoCambio = window.equipoEnEdicion.tipo_equipo !== tipoEquipoNuevo;
    const marcaCambio = (window.equipoEnEdicion.marca || '') !== marcaNueva;
    const modeloCambio = (window.equipoEnEdicion.modelo || '') !== modeloNuevo;
    const serieCambio = (window.equipoEnEdicion.numero_serie || '') !== serieNueva;
    
    const huboCambios = tipoCambio || marcaCambio || modeloCambio || serieCambio;
    
    // Si no hubo cambios, solo cerrar modal
    if (!huboCambios) {
        cerrarModalEditarEquipo();
        return;
    }
    
    const equipoActualizado = {
        tipo_equipo: tipoEquipoNuevo,
        marca: marcaNueva,
        modelo: modeloNuevo,
        serie: serieNueva
    };

    try {
        // ✅ MEJORA: Mostrar modal de carga
        mostrarModalCarga('Guardando...');
        
        const response = await fetch(`${API_EQUIPOS}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(equipoActualizado)
        });

        if (!response.ok) {
            cerrarModalCarga();
            throw new Error('Error al actualizar equipo');
        }

        // ✅ MEJORA: Cerrar modal de carga
        cerrarModalCarga();
        
        cerrarModalEditarEquipo();
        cargarEquipos();
        
        // ✅ MEJORA: Mostrar modal de éxito centrado
        mostrarNotificacionExito('Equipo actualizado');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar cambios: ' + error.message);
    }
}

async function confirmarEliminarEquipo(id) {
    document.getElementById('confirmMsg').textContent = '¿Estás seguro de que deseas eliminar este equipo?';
    document.getElementById('confirmBtn').onclick = () => eliminarEquipo(id);
    document.getElementById('confirmModal').classList.add('show');
}

async function eliminarEquipo(id) {
    try {
        // ✅ MEJORA: Mostrar modal de carga
        mostrarModalCarga('Eliminando...');
        
        const response = await fetch(`${API_EQUIPOS}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            cerrarModalCarga();
            throw new Error('Error al eliminar');
        }

        // ✅ MEJORA: Cerrar modal de carga
        cerrarModalCarga();
        
        cargarEquipos();
        cerrarModal();
        
        // ✅ MEJORA: Mostrar modal de éxito centrado
        mostrarNotificacionExito('Equipo eliminado');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar equipo');
    }
}

// ==================== DECOLECTA ====================



function cerrarModal() {
    document.getElementById('confirmModal').classList.remove('show');
}

// Cerrar modal al hacer clic fuera del contenido
window.onclick = function (event) {
    const modalNuevoCliente = document.getElementById('modalNuevoCliente');
    const modalVerCliente = document.getElementById('modalVerCliente');
    const confirmModal = document.getElementById('confirmModal');

    if (event.target === modalNuevoCliente) {
        cerrarModalNuevoCliente();
    }
    if (event.target === modalVerCliente) {
        cerrarModalVerCliente();
    }
    if (event.target === confirmModal) {
        cerrarModal();
    }
}

// Ver diagnóstico guardado
async function verDiagnostico(servicioId) {
    try {
        const response = await fetch(`${API_SERVICIOS}`);
        const servicios = await response.json();
        const servicio = servicios.find(s => s._id === servicioId);

        if (!servicio || !servicio.diagnostico) {
            alert('No hay diagnóstico registrado');
            return;
        }

        let diagnostico;
        try {
            diagnostico = JSON.parse(servicio.diagnostico);
        } catch (e) {
            diagnostico = [];
        }

        // Llenar el modal con los datos
        document.getElementById('numeroServicioVerDiag').textContent = servicio.numero_servicio;
        
        let html = '';
        let total = 0;

        diagnostico.forEach((p, idx) => {
            html += `
                <div style="padding: 12px; margin-bottom: 10px; background: white; border-radius: 4px; border-left: 3px solid #2192B8;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <strong style="color: #2192B8;">Problema ${idx + 1}:</strong> ${p.descripcion}
                        </div>
                        <div style="color: #4CAF50; font-weight: bold;">$${p.costo.toFixed(2)}</div>
                    </div>
                </div>
            `;
            total += p.costo;
        });

        document.getElementById('diagnosticoVerContainer').innerHTML = html || '<p style="color: #999;">No hay problemas registrados</p>';
        document.getElementById('montoTotalVerDiag').textContent = total.toFixed(2);

        // Mostrar el modal
        document.getElementById('modalVerDiagnostico').classList.add('show');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar diagnóstico');
    }
}

// Cerrar modal Ver Diagnóstico
function cerrarModalVerDiagnostico() {
    document.getElementById('modalVerDiagnostico').classList.remove('show');
}

// Cargar diagnósticos
async function cargarDiagnosticos() {
    try {
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();

        const clientesRes = await fetch(`${API_URL}/clientes`);
        const clientes = await clientesRes.json();

        const equiposRes = await fetch(`${API_EQUIPOS}`);
        const equipos = await equiposRes.json();

        // Filtrar solo diagnósticos
        const diagnosticados = servicios.filter(s => s.estado === 'Diagnosticado');

        const container = document.getElementById('diagnosticosContainer');

        if (diagnosticados.length === 0) {
            container.innerHTML = '<div class="no-records">No hay diagnósticos realizados</div>';
            return;
        }

        let html = `
            <table class="records-table">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Cliente</th>
                        <th>Equipo</th>
                        <th>Técnico</th>
                        <th>Monto</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        diagnosticados.forEach(srv => {
            const cliente = clientes.find(c => c._id == srv.cliente_id);
            const equipo = equipos.find(e => e._id == srv.equipo_id);

            html += `
                <tr>
                    <td><strong>${srv.numero_servicio || 'N/A'}</strong></td>
                    <td>${cliente ? cliente.nombre : 'N/A'}</td>
                    <td>${equipo ? equipo.tipo_equipo : 'N/A'}</td>
                    <td>${srv.tecnico || 'N/A'}</td>
                    <td>$${srv.monto ? srv.monto.toFixed(2) : '0.00'}</td>
                    <td class="actions">
                        <button class="btn-edit" onclick="verDetallesDiagnostico(${srv.id})" style="padding: 6px 12px; font-size: 12px;">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn-primary" onclick="generarWhatsAppDiagnostico(${srv.id})" style="padding: 6px 12px; font-size: 12px;">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Ver detalles del diagnóstico
async function verDetallesDiagnostico(servicioId) {
    try {
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => s._id === servicioId);

        const clientesRes = await fetch(`${API_URL}/clientes`);
        const clientes = await clientesRes.json();
        const cliente = clientes.find(c => String(c._id) === String(servicio.cliente_id));

        const equiposRes = await fetch(`${API_EQUIPOS}`);
        const equipos = await equiposRes.json();
        const equipo = equipos.find(e => String(e._id) === String(servicio.equipo_id));

        if (!servicio || !servicio.diagnostico) {
            alert('No hay diagnóstico registrado');
            return;
        }

        let diagnostico;
        try {
            diagnostico = JSON.parse(servicio.diagnostico);
        } catch (e) {
            diagnostico = [];
        }

        let detalle = `═══════════════════════════════════\n`;
        detalle += `DIAGNÓSTICO DEL EQUIPO\n`;
        detalle += `═══════════════════════════════════\n\n`;

        detalle += `INFORMACIÓN DEL CLIENTE:\n`;
        detalle += `Cliente: ${cliente?.nombre || 'N/A'}\n`;
        detalle += `Teléfono: ${cliente?.telefono || 'N/A'}\n`;
        detalle += `Email: ${cliente?.email || 'N/A'}\n\n`;

        detalle += `INFORMACIÓN DEL SERVICIO:\n`;
        detalle += `Número: ${servicio.numero_servicio}\n`;
        detalle += `Fecha: ${servicio.fecha}\n\n`;

        detalle += `INFORMACIÓN DEL EQUIPO:\n`;
        detalle += `Tipo: ${equipo?.tipo_equipo || 'N/A'}\n`;
        detalle += `Marca: ${equipo?.marca || 'N/A'}\n`;
        detalle += `Modelo: ${equipo?.modelo || 'N/A'}\n`;
        detalle += `Serie: ${equipo?.serie || 'N/A'}\n\n`;

        detalle += `PROBLEMAS ENCONTRADOS:\n`;
        let total = 0;
        diagnostico.forEach((p, idx) => {
            detalle += `${idx + 1}. ${p.descripcion} - $${p.costo.toFixed(2)}\n`;
            total += p.costo;
        });

        detalle += `\n═══════════════════════════════════\n`;
        detalle += `MONTO TOTAL: $${total.toFixed(2)}\n`;
        detalle += `═══════════════════════════════════\n\n`;

        detalle += `Técnico: ${servicio.tecnico || 'N/A'}\n`;
        detalle += `Fecha del Diagnóstico: ${new Date().toLocaleDateString('es-ES')}\n`;

        alert(detalle);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar diagnóstico');
    }
}

// Generar WhatsApp para diagnóstico
async function generarWhatsAppDiagnostico(servicioId) {
    try {
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => s._id === servicioId);

        const clientesRes = await fetch(`${API_URL}/clientes`);
        const clientes = await clientesRes.json();
        const cliente = clientes.find(c => c._id == servicio.cliente_id);

        if (!servicio || !servicio.diagnostico || !cliente) {
            alert('Faltan datos para generar el mensaje');
            return;
        }

        let diagnostico;
        try {
            diagnostico = JSON.parse(servicio.diagnostico);
        } catch (e) {
            diagnostico = [];
        }

        // Crear mensaje para WhatsApp
        let mensaje = `*DIAGNÓSTICO DEL EQUIPO*%0A%0A`;
        mensaje += `Estimado(a) ${cliente.nombre},%0A%0A`;
        mensaje += `*Número de Servicio:* ${servicio.numero_servicio}%0A`;
        mensaje += `*Fecha:* ${servicio.fecha}%0A%0A`;

        mensaje += `*Problemas Encontrados:*%0A`;
        let total = 0;
        diagnostico.forEach((p, idx) => {
            mensaje += `${idx + 1}. ${p.descripcion} - $${p.costo.toFixed(2)}%0A`;
            total += p.costo;
        });

        mensaje += `%0A*Monto Total del Diagnóstico: $${total.toFixed(2)}*%0A%0A`;
        mensaje += `Técnico: ${servicio.tecnico || 'N/A'}%0A`;
        mensaje += `Para más información, contáctenos.`;

        // Crear link de WhatsApp (sin el + al inicio para compatibilidad)
        const telefono = cliente.telefono.replace(/[^\d]/g, '');
        const urlWhatsApp = `https://wa.me/${telefono}?text=${mensaje}`;

        // Abrir WhatsApp
        window.open(urlWhatsApp, '_blank');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al generar mensaje de WhatsApp');
    }
}

// Mostrar modal de reparación completada
function mostrarModalReparacionCompleta() {
    const modal = document.getElementById('modalReparacionCompleta');
    modal.classList.add('show');
    
    // Cerrar automáticamente después de 0.6 segundos
    setTimeout(() => {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.classList.remove('show');
            modal.style.opacity = '1';
            cargarServicios();
        }, 300);
    }, 600);
}

// Cerrar modal de reparación completada
function cerrarModalReparacionCompleta() {
    document.getElementById('modalReparacionCompleta').classList.remove('show');
    cargarServicios();
}

// Cargar datos iniciales
document.addEventListener('DOMContentLoaded', function () {
    cargarClientes();
    actualizarSelectsClientes();
});
