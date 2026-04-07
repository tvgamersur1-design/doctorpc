// ==================== MÓDULO DE GESTIÓN DE DEUDAS Y PAGOS ====================

import { API_BASE } from '../config.js';
import { mostrarModal, cerrarModal, mostrarNotificacionExito, mostrarModalCarga, cerrarModalCarga } from '../ui.js';
import { formatearFecha, formatearMoneda } from '../utils.js';
import { getJSON, postJSON } from '../api.js';

// ==================== ESTADO DEL MÓDULO ====================

let deudasCache = [];
let filtroEstadoPago = 'todos'; // todos, pendiente, parcial, pagado
let busquedaCliente = '';

// ==================== FUNCIONES PÚBLICAS ====================

/**
 * Cargar panel de deudas
 */
export async function cargarDeudas() {
    const container = document.getElementById('deudasContainer');
    
    // Verificar que el contenedor existe
    if (!container) {
        console.warn('Contenedor de deudas no encontrado');
        return;
    }
    
    container.innerHTML = `
        <div class="loading-spinner-inline">
            <div class="loading-spinner-circle"></div>
            <p class="loading-spinner-text">Cargando información de deudas...</p>
        </div>`;
    
    try {
        // Cargar servicios (colección principal con numero_servicio)
        const serviciosRes = await fetch(`${API_BASE}/api/servicios`);
        const serviciosRaw = await serviciosRes.json();
        const servicios = serviciosRaw.data || serviciosRaw;
        
        // Cargar clientes
        const clientesRes = await fetch(`${API_BASE}/api/clientes`);
        const clientes = await clientesRes.json();
        
        // Cargar equipos
        const equiposRes = await fetch(`${API_BASE}/api/equipos`);
        const equipos = await equiposRes.json();
        
        console.log('📊 Procesando servicios para deudas...');
        
        // Procesar servicios con deudas
        deudasCache = servicios
            .filter(srv => {
                // Filtrar solo servicios entregados y no cancelados
                const esEntregado = srv.estado === 'Entregado';
                const noCancelado = srv.estado !== 'Cancelado';
                
                // Calcular saldo
                const montoTotal = parseFloat(srv.monto || 0);
                const montoPagado = parseFloat(srv.adelanto || 0);
                const saldoPendiente = montoTotal - montoPagado;
                
                // Solo incluir si tiene saldo pendiente > 0
                const tieneDeuda = saldoPendiente > 0;
                
                console.log(`Servicio ${srv.numero_servicio}: Estado=${srv.estado}, Monto=${montoTotal}, Pagado=${montoPagado}, Saldo=${saldoPendiente}, Incluir=${esEntregado && noCancelado && tieneDeuda}`);
                
                return esEntregado && noCancelado && tieneDeuda;
            })
            .map(srv => {
                const cliente = clientes.find(c => c._id === srv.cliente_id);
                const equipo = equipos.find(e => e._id === srv.equipo_id);
                
                // Obtener datos financieros
                const montoTotal = parseFloat(srv.monto || 0);
                const montoPagado = parseFloat(srv.adelanto || 0);
                const saldoPendiente = Math.max(0, montoTotal - montoPagado);
                
                // Determinar estado de pago
                let estadoPago = 'pendiente';
                if (montoTotal > 0 && montoPagado >= montoTotal) {
                    estadoPago = 'pagado';
                } else if (montoPagado > 0) {
                    estadoPago = 'parcial';
                }
                
                return {
                    _id: srv._id,
                    numero_servicio: srv.numero_servicio,  // ✅ USAR numero_servicio
                    fecha: srv.fecha,
                    estado: srv.estado,
                    cliente_id: srv.cliente_id,
                    equipo_id: srv.equipo_id,
                    cliente,
                    equipo,
                    montoTotal,
                    montoPagado,
                    saldoPendiente,
                    estadoPago
                };
            });
        
        console.log(`✅ Total de servicios con deuda: ${deudasCache.length}`);
        
        renderizarPanelDeudas();
        
    } catch (error) {
        console.error('Error al cargar deudas:', error);
        container.innerHTML = `<div class="error-message">Error al cargar información de deudas</div>`;
    }
}

/**
 * Renderizar panel principal de deudas
 */
function renderizarPanelDeudas() {
    const container = document.getElementById('deudasContainer');
    
    // Filtrar deudas
    let deudasFiltradas = deudasCache;
    
    if (filtroEstadoPago !== 'todos') {
        deudasFiltradas = deudasFiltradas.filter(d => d.estadoPago === filtroEstadoPago);
    }
    
    if (busquedaCliente) {
        const busqueda = busquedaCliente.toLowerCase();
        deudasFiltradas = deudasFiltradas.filter(d => 
            d.cliente?.nombre?.toLowerCase().includes(busqueda) ||
            d.cliente?.dni?.includes(busqueda) ||
            d.numero_servicio?.toLowerCase().includes(busqueda)  // ✅ Buscar por numero_servicio
        );
    }
    
    // Calcular totales
    const totalGeneral = deudasCache.reduce((sum, d) => sum + d.montoTotal, 0);
    const totalPagado = deudasCache.reduce((sum, d) => sum + d.montoPagado, 0);
    const totalPendiente = deudasCache.reduce((sum, d) => sum + d.saldoPendiente, 0);
    
    let html = `
        <!-- Tarjetas de resumen -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #2192B8 0%, #1976a2 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 15px rgba(33, 146, 184, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <i class="fas fa-dollar-sign" style="font-size: 36px; opacity: 0.9;"></i>
                    <div>
                        <p style="margin: 0; font-size: 13px; opacity: 0.9;">Total Facturado</p>
                        <h3 style="margin: 5px 0 0 0; font-size: 28px; font-weight: 700;">${formatearMoneda(totalGeneral)}</h3>
                    </div>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <i class="fas fa-check-circle" style="font-size: 36px; opacity: 0.9;"></i>
                    <div>
                        <p style="margin: 0; font-size: 13px; opacity: 0.9;">Total Cobrado</p>
                        <h3 style="margin: 5px 0 0 0; font-size: 28px; font-weight: 700;">${formatearMoneda(totalPagado)}</h3>
                    </div>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 36px; opacity: 0.9;"></i>
                    <div>
                        <p style="margin: 0; font-size: 13px; opacity: 0.9;">Saldo Pendiente</p>
                        <h3 style="margin: 5px 0 0 0; font-size: 28px; font-weight: 700;">${formatearMoneda(totalPendiente)}</h3>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Filtros y búsqueda -->
        <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 250px; position: relative;">
                <i class="fas fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #2192B8; font-size: 14px;"></i>
                <input type="text" id="buscarClienteDeuda" placeholder="Buscar por cliente, DNI o número de servicio..." 
                    value="${busquedaCliente}"
                    onkeyup="buscarClienteDeuda(this.value)"
                    style="width: 100%; padding: 12px 15px 12px 40px; font-size: 14px; border: 2px solid #e0e0e0; border-radius: 8px;">
            </div>
            
            <select id="filtroEstadoPago" onchange="filtrarPorEstadoPago(this.value)" 
                style="padding: 12px 15px; font-size: 14px; border: 2px solid #e0e0e0; border-radius: 8px; min-width: 180px;">
                <option value="todos" ${filtroEstadoPago === 'todos' ? 'selected' : ''}>Todos los estados</option>
                <option value="pendiente" ${filtroEstadoPago === 'pendiente' ? 'selected' : ''}>⏱️ Pendiente</option>
                <option value="parcial" ${filtroEstadoPago === 'parcial' ? 'selected' : ''}>⏳ Pago Parcial</option>
                <option value="pagado" ${filtroEstadoPago === 'pagado' ? 'selected' : ''}>✅ Pagado</option>
            </select>
        </div>
    `;
    
    if (deudasFiltradas.length === 0) {
        html += `<div class="no-records">No se encontraron registros</div>`;
        container.innerHTML = html;
        return;
    }
    
    // Tabla de deudas
    html += `
        <table class="records-table">
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Fecha</th>
                    <th>Monto Total</th>
                    <th>Pagado</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    deudasFiltradas.forEach(deuda => {
        const fechaFormateada = formatearFecha(deuda.fecha || deuda.fecha_inicio || deuda.fecha_creacion);
        const clienteNombre = deuda.cliente ? `${deuda.cliente.nombre} ${deuda.cliente.apellido_paterno || ''}`.trim() : 'Sin cliente';
        const equipoInfo = deuda.equipo ? `${deuda.equipo.tipo_equipo} ${deuda.equipo.marca}` : 'Sin equipo';
        
        let estadoHtml = '';
        let rowClass = '';
        
        if (deuda.estadoPago === 'pagado') {
            estadoHtml = '<span style="color: #4CAF50; font-weight: 600;"><i class="fas fa-check-circle"></i> Pagado</span>';
            rowClass = 'style="background: #f1f8f4;"';
        } else if (deuda.estadoPago === 'parcial') {
            estadoHtml = '<span style="color: #FF9800; font-weight: 600;"><i class="fas fa-clock"></i> Parcial</span>';
            rowClass = 'style="background: #fff8f0;"';
        } else {
            estadoHtml = '<span style="color: #f44336; font-weight: 600;"><i class="fas fa-exclamation-circle"></i> Pendiente</span>';
            rowClass = 'style="background: #ffebee;"';
        }
        
        html += `
            <tr ${rowClass}>
                <td data-label="Cliente">
                    <div style="font-weight: 600;">${clienteNombre}</div>
                    <div style="font-size: 12px; color: #666;">DNI: ${deuda.cliente?.dni || 'N/A'}</div>
                </td>
                <td data-label="Servicio">
                    <div style="font-weight: 600; color: #2196F3;">${deuda.numero_servicio || 'N/A'}</div>
                    <div style="font-size: 12px; color: #666;">${equipoInfo}</div>
                </td>
                <td data-label="Fecha">${fechaFormateada}</td>
                <td data-label="Monto Total"><strong>${formatearMoneda(deuda.montoTotal)}</strong></td>
                <td data-label="Pagado" style="color: #4CAF50; font-weight: 600;">${formatearMoneda(deuda.montoPagado)}</td>
                <td data-label="Saldo" style="color: ${deuda.saldoPendiente > 0 ? '#f44336' : '#4CAF50'}; font-weight: 700; font-size: 16px;">
                    ${formatearMoneda(deuda.saldoPendiente)}
                </td>
                <td data-label="Estado">${estadoHtml}</td>
                <td data-label="Acciones">
                    <div class="actions">
                        ${deuda.saldoPendiente > 0 ? `
                            <button class="btn-success" onclick="abrirModalRegistrarPago('${deuda._id}')">
                                <i class="fas fa-money-bill-wave"></i> Pagar
                            </button>
                        ` : ''}
                        <button class="btn-edit" onclick="verHistorialCliente('${deuda.cliente_id}')">
                            <i class="fas fa-history"></i> Historial
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

/**
 * Filtrar por estado de pago
 */
export function filtrarPorEstadoPago(estado) {
    filtroEstadoPago = estado;
    renderizarPanelDeudas();
}

/**
 * Buscar cliente
 */
export function buscarClienteDeuda(busqueda) {
    busquedaCliente = busqueda;
    renderizarPanelDeudas();
}

/**
 * Abrir modal para registrar pago
 */
export async function abrirModalRegistrarPago(servicioId) {
    const deuda = deudasCache.find(d => d._id === servicioId);
    if (!deuda) return;
    
    const clienteNombre = deuda.cliente ? `${deuda.cliente.nombre} ${deuda.cliente.apellido_paterno || ''}`.trim() : 'Sin cliente';
    
    document.getElementById('pagoServicioId').value = servicioId;
    document.getElementById('pagoNumeroOrden').textContent = deuda.numero_servicio || 'N/A';  // ✅ Usar numero_servicio
    document.getElementById('pagoCliente').textContent = clienteNombre;
    document.getElementById('pagoMontoTotal').textContent = formatearMoneda(deuda.montoTotal);
    document.getElementById('pagoMontoPagado').textContent = formatearMoneda(deuda.montoPagado);
    document.getElementById('pagoSaldoPendiente').textContent = formatearMoneda(deuda.saldoPendiente);
    document.getElementById('pagoMonto').value = deuda.saldoPendiente.toFixed(2);
    document.getElementById('pagoMonto').max = deuda.saldoPendiente.toFixed(2);
    document.getElementById('pagoMetodo').value = 'efectivo';
    document.getElementById('pagoReferencia').value = '';
    document.getElementById('pagoNotas').value = '';
    
    mostrarModal('modalRegistrarPago');
};

/**
 * Cerrar modal de pago
 */
export function cerrarModalRegistrarPago() {
    cerrarModal('modalRegistrarPago');
}

/**
 * Guardar pago
 */
export async function guardarPago(e) {
    e.preventDefault();
    
    const servicioId = document.getElementById('pagoServicioId').value;
    const monto = parseFloat(document.getElementById('pagoMonto').value);
    const metodo = document.getElementById('pagoMetodo').value;
    const referencia = document.getElementById('pagoReferencia').value;
    const notas = document.getElementById('pagoNotas').value;
    
    if (monto <= 0) {
        alert('El monto debe ser mayor a 0');
        return;
    }
    
    // Obtener el servicio actual
    const deuda = deudasCache.find(d => d._id === servicioId);
    if (!deuda) {
        alert('Error: Servicio no encontrado');
        return;
    }
    
    // Validar que el monto no exceda el saldo
    if (monto > deuda.saldoPendiente) {
        alert(`El monto no puede exceder el saldo pendiente de ${formatearMoneda(deuda.saldoPendiente)}`);
        return;
    }
    
    mostrarModalCarga('Registrando pago...');
    
    try {
        // Calcular nuevos valores
        const nuevoAdelanto = deuda.montoPagado + monto;
        const nuevoSaldo = deuda.montoTotal - nuevoAdelanto;
        
        let estadoPago = 'pendiente';
        if (nuevoSaldo === 0) {
            estadoPago = 'pagado';
        } else if (nuevoAdelanto > 0) {
            estadoPago = 'parcial';
        }
        
        console.log('💰 Registrando pago:', {
            servicioId,
            montoAnterior: deuda.montoPagado,
            montoPago: monto,
            nuevoAdelanto,
            nuevoSaldo,
            estadoPago
        });
        
        // Actualizar el servicio en la colección servicios
        const updateData = {
            adelanto: nuevoAdelanto,
            saldo_pendiente: nuevoSaldo,
            estado_pago: estadoPago,
            ultimo_pago: {
                fecha: new Date().toISOString(),
                monto: monto,
                metodo: metodo,
                referencia: referencia,
                notas: notas
            },
            fecha_actualizacion: new Date().toISOString()
        };
        
        const response = await fetch(`${API_BASE}/api/servicios/${servicioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('Error al actualizar el servicio');
        }
        
        cerrarModalCarga();
        cerrarModal('modalRegistrarPago');
        
        // Mostrar notificación según resultado
        if (nuevoSaldo === 0) {
            mostrarNotificacionExito('✅ Pago registrado - Deuda saldada completamente');
        } else {
            mostrarNotificacionExito(`✅ Pago registrado - Saldo pendiente: ${formatearMoneda(nuevoSaldo)}`);
        }
        
        // Recargar deudas
        await cargarDeudas();
        
    } catch (error) {
        cerrarModalCarga();
        console.error('Error al registrar pago:', error);
        alert('Error al registrar el pago: ' + error.message);
    }
};

/**
 * Ver historial del cliente
 */
export async function verHistorialCliente(clienteId) {
    mostrarModalCarga('Cargando historial...');
    
    try {
        // Obtener todos los servicios del cliente
        const serviciosCliente = deudasCache.filter(d => d.cliente_id === clienteId);
        
        if (serviciosCliente.length === 0) {
            cerrarModalCarga();
            alert('No se encontraron servicios para este cliente');
            return;
        }
        
        const cliente = serviciosCliente[0].cliente;
        const clienteNombre = cliente ? `${cliente.nombre} ${cliente.apellido_paterno || ''}`.trim() : 'Sin cliente';
        
        // Calcular totales
        const totalServicios = serviciosCliente.length;
        const totalFacturado = serviciosCliente.reduce((sum, s) => sum + s.montoTotal, 0);
        const totalPagado = serviciosCliente.reduce((sum, s) => sum + s.montoPagado, 0);
        const totalPendiente = serviciosCliente.reduce((sum, s) => sum + s.saldoPendiente, 0);
        
        // Llenar modal
        document.getElementById('historialClienteNombre').textContent = clienteNombre;
        document.getElementById('historialClienteEmail').textContent = cliente?.email || 'N/A';
        document.getElementById('historialClienteTelefono').textContent = cliente?.telefono || 'N/A';
        document.getElementById('historialClienteDireccion').textContent = cliente?.direccion || 'N/A';
        document.getElementById('historialTotalServicios').textContent = totalServicios;
        document.getElementById('historialTotalFacturado').textContent = formatearMoneda(totalFacturado);
        document.getElementById('historialTotalPagado').textContent = formatearMoneda(totalPagado);
        document.getElementById('historialTotalPendiente').textContent = formatearMoneda(totalPendiente);
        
        // Renderizar tabla de servicios
        let tablaHtml = '';
        serviciosCliente.forEach(srv => {
            const fecha = formatearFecha(srv.fecha || srv.fecha_inicio || srv.fecha_creacion);
            const equipo = srv.equipo ? `${srv.equipo.tipo_equipo} ${srv.equipo.marca}` : 'N/A';
            
            let estadoClass = '';
            let estadoTexto = '';
            
            if (srv.estadoPago === 'pagado') {
                estadoClass = 'style="background: #e8f5e9;"';
                estadoTexto = '<span style="color: #4CAF50; font-weight: 600;"><i class="fas fa-check-circle"></i> Pagado</span>';
            } else if (srv.estadoPago === 'parcial') {
                estadoClass = 'style="background: #fff3e0;"';
                estadoTexto = '<span style="color: #FF9800; font-weight: 600;"><i class="fas fa-clock"></i> Debe ' + formatearMoneda(srv.saldoPendiente) + '</span>';
            } else {
                estadoClass = 'style="background: #ffebee;"';
                estadoTexto = '<span style="color: #f44336; font-weight: 600;"><i class="fas fa-exclamation-circle"></i> Debe ' + formatearMoneda(srv.saldoPendiente) + '</span>';
            }
            
            tablaHtml += `
                <tr ${estadoClass}>
                    <td data-label="Fecha">${fecha}</td>
                    <td data-label="Servicio">${srv.numero_servicio || 'N/A'}</td>
                    <td data-label="Equipo">${equipo}</td>
                    <td data-label="Monto">${formatearMoneda(srv.montoTotal)}</td>
                    <td data-label="Pagado">${formatearMoneda(srv.montoPagado)}</td>
                    <td data-label="Estado">${estadoTexto}</td>
                </tr>
            `;
        });
        
        document.getElementById('historialServiciosTabla').innerHTML = tablaHtml;
        
        cerrarModalCarga();
        mostrarModal('modalHistorialCliente');
        
    } catch (error) {
        cerrarModalCarga();
        console.error('Error al cargar historial:', error);
        alert('Error al cargar el historial del cliente');
    }
};

/**
 * Cerrar modal de historial
 */
export function cerrarModalHistorialCliente() {
    cerrarModal('modalHistorialCliente');
}

// Exportar funciones
export { cargarDeudas as default };
