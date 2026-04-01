// ==================== FUNCIONES AUXILIARES GLOBALES ====================

import { API_CLIENTES, API_SERVICIOS, API_EQUIPOS } from './config.js';

// Función para agregar problema por atajo
export function agregarProblemaAtajo(texto) {
    const textarea = document.getElementById('problemasReportados');
    if (textarea) {
        const valorActual = textarea.value.trim();
        textarea.value = valorActual ? `${valorActual}, ${texto}` : texto;
    }
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
        
        const response = await fetch(`${API_CLIENTES}?dni=${dni}`);
        const clientes = await response.json();
        
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
}

// Función para abrir modal seleccionar equipo
export function abrirModalSeleccionarEquipo() {
    const clienteId = document.getElementById('cliente_id').value;
    
    if (!clienteId) {
        alert('Por favor selecciona un cliente primero');
        return;
    }
    
    document.getElementById('modalSeleccionarEquipo').classList.add('show');
    buscarEquiposPorCliente(clienteId);
}

// Función para cerrar modal seleccionar equipo
export function cerrarModalSeleccionarEquipo() {
    document.getElementById('modalSeleccionarEquipo').classList.remove('show');
}

// Función para buscar equipos por cliente
export async function buscarEquiposPorCliente(clienteId) {
    const container = document.getElementById('equiposClienteContainer');
    
    try {
        container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Cargando equipos...</div>';
        
        const response = await fetch(`${API_EQUIPOS}?cliente_id=${clienteId}`);
        const equipos = await response.json();
        
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
