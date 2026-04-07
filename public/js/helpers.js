// ==================== FUNCIONES AUXILIARES GLOBALES ====================

import { API_CLIENTES, API_SERVICIOS, API_EQUIPOS, API_DECOLECTA } from './config.js';
import { getJSON } from './api.js';

// Función para agregar problema por atajo
export function agregarProblemaAtajo(texto) {
    const textarea = document.getElementById('problemasTexto');
    if (!textarea) {
        console.warn('Textarea problemasTexto no encontrado');
        return;
    }
    
    let textoActual = textarea.value.trim();
    
    // Si ya existe el problema, no lo agregamos de nuevo
    if (textoActual.toLowerCase().includes(texto.toLowerCase())) {
        console.log('Problema ya existe:', texto);
        return;
    }
    
    // Si el textarea está vacío, solo agregar el problema
    if (!textoActual) {
        textarea.value = texto;
    } else {
        // Agregar separado por coma
        textarea.value = textoActual + ', ' + texto;
    }
    
    // Enfocar textarea
    textarea.focus();
    console.log('✅ Problema agregado:', texto);
}

// Función para abrir modal seleccionar cliente
export function abrirModalSeleccionarCliente() {
    document.getElementById('modalSeleccionarCliente').classList.add('show');
    document.getElementById('dniClienteBusqueda').value = '';
    document.getElementById('dniClienteBusqueda').focus();
    document.getElementById('clientesBusquedaContainer').innerHTML = '<div id="mensajeBusqueda" style="text-align: center; color: #999; padding: 20px;">Ingrese un DNI para buscar</div>';
    document.getElementById('btnConsultarReniecServicio').style.display = 'none';
    document.getElementById('resultadoReniec').style.display = 'none';
    document.getElementById('errorReniec').style.display = 'none';
}

// Función para cerrar modal seleccionar cliente
export function cerrarModalSeleccionarCliente() {
    document.getElementById('modalSeleccionarCliente').classList.remove('show');
}

// Función para buscar cliente por DNI
export async function buscarClientePorDNI() {
    const dni = document.getElementById('dniClienteBusqueda').value.trim();
    const container = document.getElementById('clientesBusquedaContainer');
    
    if (!dni) {
        container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Ingrese un DNI para buscar</div>';
        return;
    }
    
    if (dni.length !== 8) {
        container.innerHTML = '<div style="text-align: center; color: #d32f2f; padding: 20px;">El DNI debe tener 8 dígitos</div>';
        return;
    }
    
    try {
        container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';
        
        const clientes = await getJSON(`${API_CLIENTES}?dni=${dni}`);
        
        const clienteEncontrado = clientes.find(c => c.dni === dni);
        
        if (clienteEncontrado) {
            // Cliente encontrado
            container.innerHTML = `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 4px; border-left: 3px solid #4CAF50;">
                    <p style="margin: 0 0 10px 0; font-weight: 600; color: #2E7D32;"><i class="fas fa-check-circle"></i> Cliente encontrado</p>
                    <p style="margin: 5px 0;"><strong>Nombre:</strong> ${clienteEncontrado.nombre}</p>
                    <p style="margin: 5px 0;"><strong>Teléfono:</strong> ${clienteEncontrado.telefono || 'No registrado'}</p>
                    <button type="button" class="btn-primary" onclick="seleccionarClienteExistente('${clienteEncontrado._id}', '${clienteEncontrado.nombre}')" style="margin-top: 10px; width: 100%;">
                        <i class="fas fa-check"></i> Seleccionar este cliente
                    </button>
                </div>
            `;
            document.getElementById('btnConsultarReniecServicio').style.display = 'none';
        } else {
            // Cliente no encontrado - mostrar botón para consultar RENIEC
            container.innerHTML = `
                <div style="background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 3px solid #FF9800;">
                    <p style="margin: 0; color: #856404;"><i class="fas fa-info-circle"></i> No se encontró un cliente con este DNI</p>
                </div>
            `;
            document.getElementById('btnConsultarReniecServicio').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div style="text-align: center; color: #d32f2f; padding: 20px;">Error al buscar cliente</div>';
    }
}

// Función para seleccionar cliente existente
export function seleccionarClienteExistente(id, nombre) {
    document.getElementById('cliente_id').value = id;
    document.getElementById('clienteSeleccionado').value = nombre;
    cerrarModalSeleccionarCliente();
    
    // Habilitar botón de buscar equipo
    const btnBuscarEquipo = document.getElementById('btnBuscarEquipo');
    if (btnBuscarEquipo) {
        btnBuscarEquipo.disabled = false;
    }
    
    console.log('✅ Cliente seleccionado, botón de equipo habilitado');
}

// Función para abrir modal seleccionar equipo
export function abrirModalSeleccionarEquipo() {
    console.log('🔍 abrirModalSeleccionarEquipo llamada');
    
    try {
        const clienteIdInput = document.getElementById('cliente_id');
        console.log('clienteIdInput:', clienteIdInput);
        
        if (!clienteIdInput) {
            console.error('No se encontró el campo cliente_id');
            return;
        }
        
        const clienteId = clienteIdInput.value;
        console.log('clienteId:', clienteId);
        
        if (!clienteId) {
            console.warn('No hay cliente seleccionado');
            // No hacer nada, el botón debería estar deshabilitado
            return;
        }
        
        const modal = document.getElementById('modalSeleccionarEquipo');
        console.log('modal:', modal);
        
        if (!modal) {
            console.error('No se encontró el modal modalSeleccionarEquipo');
            return;
        }
        
        console.log('✅ Abriendo modal...');
        modal.classList.add('show');
        buscarEquiposPorCliente(clienteId);
    } catch (error) {
        console.error('❌ Error al abrir modal de equipos:', error);
    }
}

// Función para cerrar modal seleccionar equipo
export function cerrarModalSeleccionarEquipo() {
    document.getElementById('modalSeleccionarEquipo').classList.remove('show');
}

// Función para buscar equipos por cliente
export async function buscarEquiposPorCliente(clienteId) {
    const container = document.getElementById('equiposDisponiblesContainer');
    
    // Verificar que el contenedor existe
    if (!container) {
        console.error('Contenedor equiposDisponiblesContainer no encontrado');
        return;
    }
    
    try {
        container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Cargando equipos...</div>';
        
        const equipos = await getJSON(`${API_EQUIPOS}?cliente_id=${clienteId}`);
        
        const equiposCliente = equipos.filter(e => e.cliente_id === clienteId && !e.eliminado);
        
        if (equiposCliente.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #999;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 10px;"></i>
                    <p>Este cliente no tiene equipos registrados</p>
                </div>
            `;
            return;
        }
        
        let html = '<div style="display: grid; gap: 10px;">';
        equiposCliente.forEach(equipo => {
            html += `
                <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s;" 
                     onclick="seleccionarEquipo('${equipo._id}', '${equipo.tipo_equipo} ${equipo.marca || ''}')"
                     onmouseover="this.style.borderColor='#2192B8'; this.style.background='#e3f2fd';"
                     onmouseout="this.style.borderColor='transparent'; this.style.background='#f5f5f5';">
                    <p style="margin: 0 0 5px 0; font-weight: 600; color: #1e3c72;">
                        <i class="fas fa-laptop"></i> ${equipo.tipo_equipo}
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #666;">
                        <strong>Marca:</strong> ${equipo.marca || 'N/A'} | 
                        <strong>Modelo:</strong> ${equipo.modelo || 'N/A'}
                    </p>
                    ${equipo.serie ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">Serie: ${equipo.serie}</p>` : ''}
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div style="text-align: center; color: #d32f2f; padding: 20px;">Error al cargar equipos</div>';
    }
}

// Función para seleccionar equipo
export function seleccionarEquipo(id, descripcion) {
    document.getElementById('equipo_id').value = id;
    document.getElementById('equipoSeleccionado').value = descripcion;
    cerrarModalSeleccionarEquipo();
}


// ==================== FUNCIONES PARA SELECCIONAR CLIENTE EN EQUIPOS ====================

/**
 * Abrir modal para seleccionar cliente en formulario de equipos
 */
export function abrirModalSeleccionarClienteEquipo() {
    console.log('🔍 Abriendo modal de selección de cliente para equipo');
    document.getElementById('modalSeleccionarClienteEquipo').classList.add('show');
    document.getElementById('dniClienteBusquedaEquipo').value = '';
    document.getElementById('clientesBusquedaEquipoContainer').innerHTML = `
        <div style="text-align: center; color: #999; padding: 20px;">
            Ingrese un DNI para buscar
        </div>
    `;
}

/**
 * Cerrar modal de selección de cliente para equipos
 */
export function cerrarModalSeleccionarClienteEquipo() {
    document.getElementById('modalSeleccionarClienteEquipo').classList.remove('show');
}

/**
 * Buscar clientes por DNI para equipos
 */
export async function buscarClientesPorDNIEquipo() {
    const dni = document.getElementById('dniClienteBusquedaEquipo').value.trim();
    const container = document.getElementById('clientesBusquedaEquipoContainer');
    
    if (dni.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #999; padding: 20px;">
                Ingrese un DNI para buscar
            </div>
        `;
        return;
    }
    
    if (dni.length < 8) {
        container.innerHTML = `
            <div style="text-align: center; color: #999; padding: 20px;">
                Ingrese al menos 8 dígitos
            </div>
        `;
        return;
    }
    
    try {
        container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';
        
        const clientes = await getJSON(`${API_CLIENTES}?dni=${dni}`);
        
        const clientesEncontrados = clientes.filter(c => c.dni.includes(dni) && !c.eliminado);
        
        if (clientesEncontrados.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #999;">
                    <i class="fas fa-user-slash" style="font-size: 48px; margin-bottom: 10px;"></i>
                    <p>No se encontraron clientes con ese DNI</p>
                </div>
            `;
            return;
        }
        
        let html = '<div style="display: grid; gap: 10px;">';
        clientesEncontrados.forEach(cliente => {
            const nombreCompleto = `${cliente.nombre} ${cliente.apellido_paterno || ''} ${cliente.apellido_materno || ''}`.trim();
            html += `
                <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s;" 
                     onclick="seleccionarClienteEquipo('${cliente._id}', '${nombreCompleto.replace(/'/g, "\\'")}', '${cliente.dni}')"
                     onmouseover="this.style.borderColor='#2192B8'; this.style.background='#e3f2fd';"
                     onmouseout="this.style.borderColor='transparent'; this.style.background='#f5f5f5';">
                    <p style="margin: 0 0 5px 0; font-weight: 600; color: #1e3c72;">
                        <i class="fas fa-user"></i> ${nombreCompleto}
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #666;">
                        <strong>DNI:</strong> ${cliente.dni}
                    </p>
                    ${cliente.telefono ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #999;"><i class="fas fa-phone"></i> ${cliente.telefono}</p>` : ''}
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div style="text-align: center; color: #d32f2f; padding: 20px;">Error al buscar clientes</div>';
    }
}

/**
/**
 * Seleccionar cliente para el equipo (nuevo o editar)
 */
export function seleccionarClienteEquipo(clienteId, nombreCompleto, dni) {
    if (window.modoEdicionEquipo) {
        document.getElementById('editClienteEquipo').value = clienteId;
        document.getElementById('editClienteEquipoSeleccionado').value = `${nombreCompleto} (DNI: ${dni})`;
        window.modoEdicionEquipo = false;
    } else {
        document.getElementById('cliente_id_equipo').value = clienteId;
        document.getElementById('clienteEquipoSeleccionado').value = `${nombreCompleto} (DNI: ${dni})`;
    }
    cerrarModalSeleccionarClienteEquipo();
    console.log('✅ Cliente seleccionado para equipo:', clienteId);
}


/**
 * Abrir modal para cambiar cliente en edición de equipo
 */
export function abrirModalSeleccionarClienteEquipoEditar() {
    console.log('🔍 Abriendo modal de selección de cliente para editar equipo');
    // Reutilizar el mismo modal pero con un flag para saber que es edición
    window.modoEdicionEquipo = true;
    abrirModalSeleccionarClienteEquipo();
}

/**
 * Abrir formulario de nuevo equipo desde modal de selección
 * Pre-selecciona el cliente del formulario de servicio
 */
export function abrirFormularioNuevoEquipoModal() {
    console.log('🔧 Abriendo formulario de nuevo equipo desde selección');
    
    // Obtener el cliente seleccionado en el formulario de servicio
    const clienteId = document.getElementById('cliente_id')?.value;
    const clienteNombre = document.getElementById('clienteSeleccionado')?.value;
    
    if (!clienteId || !clienteNombre) {
        console.warn('No hay cliente seleccionado en el formulario de servicio');
        // No hacer nada, el botón debería estar deshabilitado
        return;
    }
    
    // Marcar que venimos desde selección para auto-seleccionar después
    window.viniendonFromSeleccion = true;
    window.clientePreseleccionado = {
        id: clienteId,
        nombre: clienteNombre
    };
    
    // Cerrar modal de selección de equipos
    cerrarModalSeleccionarEquipo();
    
    // Abrir modal de nuevo equipo
    // La función abrirModalNuevoEquipo está en el módulo equipos
    if (window.abrirModalNuevoEquipo) {
        window.abrirModalNuevoEquipo();
        
        // Pre-llenar el cliente y ocultar botón de búsqueda después de un pequeño delay
        setTimeout(() => {
            const clienteEquipoInput = document.getElementById('cliente_id_equipo');
            const clienteEquipoSeleccionado = document.getElementById('clienteEquipoSeleccionado');
            const btnBuscarCliente = document.querySelector('#modalNuevoEquipo button[onclick="abrirModalSeleccionarClienteEquipo()"]');
            
            if (clienteEquipoInput && clienteEquipoSeleccionado) {
                // Pre-llenar cliente
                clienteEquipoInput.value = clienteId;
                clienteEquipoSeleccionado.value = clienteNombre;
                
                // Ocultar botón de búsqueda y hacer el campo no editable
                if (btnBuscarCliente) {
                    btnBuscarCliente.style.display = 'none';
                }
                
                // Agregar indicador visual de que el cliente está bloqueado
                clienteEquipoSeleccionado.style.backgroundColor = '#e8f5e9';
                clienteEquipoSeleccionado.style.borderColor = '#4CAF50';
                clienteEquipoSeleccionado.style.cursor = 'not-allowed';
                
                // Agregar un pequeño texto informativo
                const labelCliente = clienteEquipoSeleccionado.parentElement.previousElementSibling;
                if (labelCliente && !labelCliente.querySelector('.info-cliente-bloqueado')) {
                    const infoSpan = document.createElement('span');
                    infoSpan.className = 'info-cliente-bloqueado';
                    infoSpan.style.cssText = 'color: #4CAF50; font-size: 12px; margin-left: 8px; font-weight: normal;';
                    infoSpan.innerHTML = '<i class="fas fa-lock"></i> Cliente del servicio';
                    labelCliente.appendChild(infoSpan);
                }
                
                console.log('✅ Cliente pre-seleccionado y bloqueado en formulario de equipo:', clienteNombre);
            } else {
                console.warn('No se encontraron los campos de cliente en el formulario de equipo');
            }
        }, 100);
    } else {
        console.error('Función abrirModalNuevoEquipo no encontrada');
    }
}


// ==================== FUNCIONES PARA CONSULTAR RENIEC EN SERVICIOS ====================

/**
 * Consultar RENIEC desde el modal de servicio
 */
export async function consultarReniecServicio() {
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

/**
 * Agregar cliente desde RENIEC en servicio
 */
export async function agregarClienteDesdeReniecServicio() {
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

        // Seleccionar el cliente creado
        document.getElementById('cliente_id').value = clienteGuardado._id;
        document.getElementById('clienteSeleccionado').value = clienteGuardado.nombre;
        window.clienteIdActual = clienteGuardado._id;
        
        // Habilitar botón de equipo
        const btnBuscarEquipo = document.getElementById('btnBuscarEquipo');
        if (btnBuscarEquipo) {
            btnBuscarEquipo.disabled = false;
        }

        cerrarModalSeleccionarCliente();
        
        // Actualizar lista de clientes si la función existe
        if (window.cargarClientes) {
            window.cargarClientes();
        }
        if (window.actualizarSelectsClientes) {
            window.actualizarSelectsClientes();
        }
        
        console.log('✅ Cliente importado desde RENIEC:', clienteGuardado);
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error al guardar cliente: ' + error.message);
    }
}
