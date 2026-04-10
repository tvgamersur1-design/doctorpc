// ==================== MÓDULO DE GESTIÓN DE PAGOS ====================

import { API_BASE } from '../config.js';
import { mostrarModal, cerrarModal, mostrarNotificacionExito, mostrarModalCarga, cerrarModalCarga } from '../ui.js';
import { formatearFecha, formatearMoneda } from '../utils.js';
import { getJSON, postJSON } from '../api.js';

// ==================== ESTADO DEL MÓDULO ====================

let pagosCache = [];
let historialPagosCache = {}; // Caché de historial de pagos por servicioId
let filtroEstadoPago = 'todos'; // todos, pendiente, parcial, pagado
let busquedaCliente = '';
let busquedaTimer = null; // Timer para debounce

// Exponer caché globalmente para otros módulos
if (typeof window !== 'undefined') {
    window.Pagos = {
        get pagosCache() { return pagosCache; },
        get historialPagosCache() { return historialPagosCache; }
    };
}

// ==================== FUNCIONES PÚBLICAS ====================

/**
 * Cargar panel de pagos
 * OPTIMIZADO: Verifica caché antes de consultar BD
 */
export async function cargarPagos(forzarRecarga = false) {
    const container = document.getElementById('pagosContainer');
    
    // Verificar que el contenedor existe
    if (!container) {
        console.warn('Contenedor de pagos no encontrado');
        return;
    }
    
    // 🚀 OPTIMIZACIÓN: Verificar si hay caché y no se fuerza recarga
    if (!forzarRecarga && pagosCache.length > 0) {
        console.log('✅ Usando caché de pagos (sin consultar BD)');
        renderizarPanelPagos();
        return;
    }
    
    container.innerHTML = `
        <div class="loading-spinner-inline">
            <div class="loading-spinner-circle"></div>
            <p class="loading-spinner-text">Cargando información de pagos...</p>
        </div>`;
    
    try {
        console.log('📡 Consultando BD para cargar pagos...');
        
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
        
        console.log('📊 Procesando todos los servicios para gestión de pagos...');
        
        // Procesar TODOS los servicios entregados (con o sin deuda)
        pagosCache = servicios
            .filter(srv => {
                // Filtrar solo servicios entregados y no cancelados
                const esEntregado = srv.estado === 'Entregado';
                const noCancelado = srv.estado !== 'Cancelado';
                
                console.log(`Servicio ${srv.numero_servicio}: Estado=${srv.estado}, Incluir=${esEntregado && noCancelado}`);
                
                return esEntregado && noCancelado;
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
                    numero_servicio: srv.numero_servicio || srv.nombre_servicio || 'N/A',
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
        
        console.log(`✅ Total de servicios en gestión de pagos: ${pagosCache.length}`);
        
        renderizarPanelPagos();
        
    } catch (error) {
        console.error('Error al cargar pagos:', error);
        container.innerHTML = `<div class="error-message">Error al cargar información de pagos</div>`;
    }
}

/**
 * Renderizar panel principal de pagos
 */
function renderizarPanelPagos() {
    const container = document.getElementById('pagosContainer');
    
    // Filtrar pagos
    let pagosFiltrados = pagosCache;
    
    if (filtroEstadoPago !== 'todos') {
        pagosFiltrados = pagosFiltrados.filter(d => d.estadoPago === filtroEstadoPago);
    }
    
    if (busquedaCliente) {
        const busqueda = busquedaCliente.toLowerCase();
        pagosFiltrados = pagosFiltrados.filter(d => 
            d.cliente?.nombre?.toLowerCase().includes(busqueda) ||
            d.cliente?.dni?.includes(busqueda) ||
            d.numero_servicio?.toLowerCase().includes(busqueda)
        );
    }
    
    // Calcular totales
    const totalGeneral = pagosCache.reduce((sum, d) => sum + d.montoTotal, 0);
    const totalPagado = pagosCache.reduce((sum, d) => sum + d.montoPagado, 0);
    const totalPendiente = pagosCache.reduce((sum, d) => sum + d.saldoPendiente, 0);
    
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
            
            <div style="background: linear-gradient(135deg, ${totalPendiente < 0 ? '#4CAF50' : '#FF9800'} 0%, ${totalPendiente < 0 ? '#388E3C' : '#F57C00'} 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 15px rgba(${totalPendiente < 0 ? '76, 175, 80' : '255, 152, 0'}, 0.3);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <i class="fas ${totalPendiente < 0 ? 'fa-hand-holding-usd' : 'fa-exclamation-triangle'}" style="font-size: 36px; opacity: 0.9;"></i>
                    <div>
                        <p style="margin: 0; font-size: 13px; opacity: 0.9;">${totalPendiente < 0 ? 'Saldo a Devolver' : 'Saldo Pendiente'}</p>
                        <h3 style="margin: 5px 0 0 0; font-size: 28px; font-weight: 700;">${formatearMoneda(Math.abs(totalPendiente))}</h3>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Filtros y búsqueda -->
        <div style="display: flex; gap: 15px; margin-bottom: 20px; align-items: center;">
            <div style="flex: 1; position: relative;">
                <i class="fas fa-search" id="iconoBusquedaPagos" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #2192B8; font-size: 14px; transition: all 0.3s;"></i>
                <input type="text" id="buscarClientePago" placeholder="Buscar por cliente, DNI o número de servicio..." 
                    value="${busquedaCliente}"
                    onkeyup="buscarClientePago(this.value)"
                    style="width: 100%; padding: 12px 15px 12px 40px; font-size: 14px; border: 2px solid #e0e0e0; border-radius: 8px; transition: border-color 0.3s;">
            </div>
            
            <div style="position: relative;">
                <i class="fas fa-filter" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #5f6368; font-size: 14px; pointer-events: none;"></i>
                <select id="filtroEstadoPago" onchange="filtrarPorEstadoPago(this.value)" 
                    style="padding: 12px 15px 12px 40px; font-size: 14px; border: 2px solid #e0e0e0; border-radius: 8px; min-width: 200px; appearance: none; background: white url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27 viewBox=%270 0 12 8%27%3e%3cpath fill=%27%235f6368%27 d=%27M6 8L0 0h12z%27/%3e%3c/svg%3e') no-repeat right 12px center; padding-right: 35px; cursor: pointer;">
                    <option value="todos" ${filtroEstadoPago === 'todos' ? 'selected' : ''}>Todos los estados</option>
                    <option value="pendiente" ${filtroEstadoPago === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="parcial" ${filtroEstadoPago === 'parcial' ? 'selected' : ''}>Pago Parcial</option>
                    <option value="pagado" ${filtroEstadoPago === 'pagado' ? 'selected' : ''}>Pagado</option>
                </select>
            </div>
        </div>
    `;
    
    if (pagosFiltrados.length === 0) {
        html += `<div class="no-records">No se encontraron registros</div>`;
        container.innerHTML = html;
        return;
    }
    
    // Tabla de pagos
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
    
    pagosFiltrados.forEach(pago => {
        const fechaFormateada = formatearFecha(pago.fecha || pago.fecha_inicio || pago.fecha_creacion);
        const clienteNombre = pago.cliente ? `${pago.cliente.nombre} ${pago.cliente.apellido_paterno || ''}`.trim() : 'Sin cliente';
        const equipoInfo = pago.equipo ? `${pago.equipo.tipo_equipo} ${pago.equipo.marca}` : 'Sin equipo';
        
        let estadoHtml = '';
        let rowClass = '';
        
        if (pago.estadoPago === 'pagado') {
            estadoHtml = '<span style="color: #4CAF50; font-weight: 600;"><i class="fas fa-check-circle"></i> Pagado</span>';
            rowClass = 'style="background: #f1f8f4;"';
        } else if (pago.estadoPago === 'parcial') {
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
                    <div style="font-size: 12px; color: #666;">DNI: ${pago.cliente?.dni || 'N/A'}</div>
                </td>
                <td data-label="Servicio">
                    <div style="font-weight: 600; color: #2196F3;">${pago.numero_servicio || 'N/A'}</div>
                    <div style="font-size: 12px; color: #666;">${equipoInfo}</div>
                </td>
                <td data-label="Fecha">${fechaFormateada}</td>
                <td data-label="Monto Total"><strong>${formatearMoneda(pago.montoTotal)}</strong></td>
                <td data-label="Pagado" style="color: #4CAF50; font-weight: 600;">${formatearMoneda(pago.montoPagado)}</td>
                <td data-label="Saldo" style="color: ${pago.saldoPendiente > 0 ? '#f44336' : '#4CAF50'}; font-weight: 700; font-size: 16px;">
                    ${formatearMoneda(pago.saldoPendiente)}
                </td>
                <td data-label="Estado">${estadoHtml}</td>
                <td data-label="Acciones">
                    <div class="actions">
                        ${pago.saldoPendiente > 0 ? `
                            <button class="btn-success" onclick="abrirModalRegistrarPago('${pago._id}')">
                                <i class="fas fa-money-bill-wave"></i> Pagar
                            </button>
                        ` : ''}
                        <button class="btn-info" onclick="verHistorialPagosServicio('${pago._id}')" title="Ver historial de pagos">
                            <i class="fas fa-receipt"></i> Ver Pagos
                        </button>
                        <button class="btn-edit" onclick="verHistorialCliente('${pago.cliente_id}')">
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
    actualizarTablaPagos();
}

/**
 * Buscar cliente con debounce
 */
export function buscarClientePago(busqueda) {
    // Actualizar la variable inmediatamente (sin esperar)
    busquedaCliente = busqueda;
    
    // Mostrar indicador de búsqueda
    const icono = document.getElementById('iconoBusquedaPagos');
    
    if (icono) {
        icono.className = 'fas fa-spinner fa-spin';
    }
    
    // Limpiar el timer anterior
    if (busquedaTimer) {
        clearTimeout(busquedaTimer);
    }
    
    // Establecer nuevo timer para actualizar solo la tabla
    busquedaTimer = setTimeout(() => {
        actualizarTablaPagos();
        
        // Restaurar icono
        if (icono) {
            icono.className = 'fas fa-search';
        }
    }, 300);
}

/**
 * Actualizar solo la tabla de pagos (sin re-renderizar todo)
 */
function actualizarTablaPagos() {
    // Filtrar pagos
    let pagosFiltrados = pagosCache;
    
    if (filtroEstadoPago !== 'todos') {
        pagosFiltrados = pagosFiltrados.filter(d => d.estadoPago === filtroEstadoPago);
    }
    
    if (busquedaCliente) {
        const busqueda = busquedaCliente.toLowerCase();
        pagosFiltrados = pagosFiltrados.filter(d => 
            d.cliente?.nombre?.toLowerCase().includes(busqueda) ||
            d.cliente?.dni?.includes(busqueda) ||
            d.numero_servicio?.toLowerCase().includes(busqueda)
        );
    }
    
    // Buscar el contenedor de la tabla
    const tabla = document.querySelector('#pagosContainer .records-table');
    
    if (!tabla) {
        // Si no existe la tabla, renderizar todo
        renderizarPanelPagos();
        return;
    }
    
    // Generar HTML de la tabla
    let html = `
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
    
    if (pagosFiltrados.length === 0) {
        html += `<tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">No se encontraron registros</td></tr>`;
    } else {
        pagosFiltrados.forEach(pago => {
            const fechaFormateada = formatearFecha(pago.fecha || pago.fecha_inicio || pago.fecha_creacion);
            const clienteNombre = pago.cliente ? `${pago.cliente.nombre} ${pago.cliente.apellido_paterno || ''}`.trim() : 'Sin cliente';
            const equipoInfo = pago.equipo ? `${pago.equipo.tipo_equipo} ${pago.equipo.marca}` : 'Sin equipo';
            
            let estadoHtml = '';
            let rowClass = '';
            
            if (pago.estadoPago === 'pagado') {
                estadoHtml = '<span style="color: #4CAF50; font-weight: 600;"><i class="fas fa-check-circle"></i> Pagado</span>';
                rowClass = 'style="background: #f1f8f4;"';
            } else if (pago.estadoPago === 'parcial') {
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
                        <div style="font-size: 12px; color: #666;">DNI: ${pago.cliente?.dni || 'N/A'}</div>
                    </td>
                    <td data-label="Servicio">
                        <div style="font-weight: 600; color: #2196F3;">${pago.numero_servicio || 'N/A'}</div>
                        <div style="font-size: 12px; color: #666;">${equipoInfo}</div>
                    </td>
                    <td data-label="Fecha">${fechaFormateada}</td>
                    <td data-label="Monto Total"><strong>${formatearMoneda(pago.montoTotal)}</strong></td>
                    <td data-label="Pagado" style="color: #4CAF50; font-weight: 600;">${formatearMoneda(pago.montoPagado)}</td>
                    <td data-label="Saldo" style="color: ${pago.saldoPendiente > 0 ? '#f44336' : '#4CAF50'}; font-weight: 700; font-size: 16px;">
                        ${formatearMoneda(pago.saldoPendiente)}
                    </td>
                    <td data-label="Estado">${estadoHtml}</td>
                    <td data-label="Acciones">
                        <div class="actions">
                            ${pago.saldoPendiente > 0 ? `
                                <button class="btn-success" onclick="abrirModalRegistrarPago('${pago._id}')">
                                    <i class="fas fa-money-bill-wave"></i> Pagar
                                </button>
                            ` : ''}
                            <button class="btn-info" onclick="verHistorialPagosServicio('${pago._id}')" title="Ver historial de pagos">
                                <i class="fas fa-receipt"></i> Ver Pagos
                            </button>
                            <button class="btn-edit" onclick="verHistorialCliente('${pago.cliente_id}')">
                                <i class="fas fa-history"></i> Historial
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    html += `</tbody>`;
    
    // Actualizar solo la tabla
    tabla.innerHTML = html;
}

/**
 * Abrir modal para registrar pago
 */
export async function abrirModalRegistrarPago(servicioId) {
    const pago = pagosCache.find(d => d._id === servicioId);
    if (!pago) return;
    
    const clienteNombre = pago.cliente ? `${pago.cliente.nombre} ${pago.cliente.apellido_paterno || ''}`.trim() : 'Sin cliente';
    
    document.getElementById('pagoServicioId').value = servicioId;
    document.getElementById('pagoNumeroOrden').textContent = pago.numero_servicio || 'N/A';
    document.getElementById('pagoCliente').textContent = clienteNombre;
    document.getElementById('pagoMontoTotal').textContent = formatearMoneda(pago.montoTotal);
    document.getElementById('pagoMontoPagado').textContent = formatearMoneda(pago.montoPagado);
    document.getElementById('pagoSaldoPendiente').textContent = formatearMoneda(pago.saldoPendiente);
    document.getElementById('pagoMonto').value = pago.saldoPendiente.toFixed(2);
    document.getElementById('pagoMonto').max = pago.saldoPendiente.toFixed(2);
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
 * OPTIMIZADO: Actualiza caché en lugar de recargar todo
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
    const pago = pagosCache.find(d => d._id === servicioId);
    if (!pago) {
        alert('Error: Servicio no encontrado');
        return;
    }
    
    // Validar que el monto no exceda el saldo
    if (monto > pago.saldoPendiente) {
        alert(`El monto no puede exceder el saldo pendiente de ${formatearMoneda(pago.saldoPendiente)}`);
        return;
    }
    
    mostrarModalCarga('Registrando pago...');
    
    try {
        // Calcular nuevos valores
        const nuevoAdelanto = pago.montoPagado + monto;
        const nuevoSaldo = pago.montoTotal - nuevoAdelanto;
        
        let estadoPago = 'pendiente';
        if (nuevoSaldo === 0) {
            estadoPago = 'pagado';
        } else if (nuevoAdelanto > 0) {
            estadoPago = 'parcial';
        }
        
        console.log('💰 Registrando pago:', {
            servicioId,
            montoAnterior: pago.montoPagado,
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
        
        // 1. Actualizar el servicio
        const response = await fetch(`${API_BASE}/api/servicios/${servicioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('Error al actualizar el servicio');
        }
        
        // 2. Registrar en el historial de pagos
        const historialPago = {
            servicio_id: servicioId,
            numero_servicio: pago.numero_servicio,
            cliente_id: pago.cliente_id,
            monto: monto,
            metodo_pago: metodo,
            referencia: referencia,
            notas: notas,
            usuario_registro: localStorage.getItem('usuario_nombre') || 'Sistema'
        };
        
        console.log('📝 Guardando en historial:', historialPago);
        
        const historialResponse = await fetch(`${API_BASE}/api/historial-pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(historialPago)
        });
        
        if (!historialResponse.ok) {
            const errorText = await historialResponse.text();
            console.error('❌ Error al guardar historial:', errorText);
            // No detenemos el proceso, solo registramos el error
        } else {
            const historialResult = await historialResponse.json();
            console.log('✅ Historial guardado:', historialResult);
            
            // 🚀 OPTIMIZACIÓN: Actualizar caché de historial
            if (historialPagosCache[servicioId]) {
                historialPagosCache[servicioId].unshift(historialResult);
            }
        }
        
        // 🚀 OPTIMIZACIÓN: Actualizar caché en lugar de recargar todo
        const index = pagosCache.findIndex(p => p._id === servicioId);
        if (index !== -1) {
            pagosCache[index].montoPagado = nuevoAdelanto;
            pagosCache[index].saldoPendiente = nuevoSaldo;
            pagosCache[index].estadoPago = estadoPago;
            console.log('✅ Caché actualizado localmente (sin recargar BD)');
        }
        
        // 🚀 Actualizar caché global de Servicios si existe
        if (window.Servicios && window.Servicios.serviciosCache) {
            const srvIndex = window.Servicios.serviciosCache.findIndex(s => s._id === servicioId);
            if (srvIndex !== -1) {
                window.Servicios.serviciosCache[srvIndex].adelanto = nuevoAdelanto;
                console.log('✅ Caché de Servicios sincronizado');
            }
        }
        
        cerrarModalCarga();
        cerrarModal('modalRegistrarPago');
        
        // Mostrar notificación según resultado
        if (nuevoSaldo === 0) {
            mostrarNotificacionExito('✅ Pago registrado - Deuda saldada completamente');
        } else {
            mostrarNotificacionExito(`✅ Pago registrado - Saldo pendiente: ${formatearMoneda(nuevoSaldo)}`);
        }
        
        // 🚀 OPTIMIZACIÓN: Solo re-renderizar la tabla (no recargar desde BD)
        actualizarTablaPagos();
        
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
        const serviciosCliente = pagosCache.filter(d => d.cliente_id === clienteId);
        
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

/**
 * Ver historial de pagos de un servicio específico
 * OPTIMIZADO: Usa caché de historial de pagos
 */
export async function verHistorialPagosServicio(servicioId) {
    mostrarModalCarga('Cargando historial de pagos...');
    
    try {
        // Obtener el servicio del caché
        const servicio = pagosCache.find(s => s._id === servicioId);
        if (!servicio) {
            throw new Error('Servicio no encontrado');
        }
        
        let historialPagos;
        
        // 🚀 OPTIMIZACIÓN: Verificar si está en caché
        if (historialPagosCache[servicioId]) {
            console.log('✅ Usando caché de historial de pagos');
            historialPagos = historialPagosCache[servicioId];
        } else {
            // Si no está en caché, consultar BD
            console.log('📡 Consultando BD para historial de pagos');
            const response = await fetch(`${API_BASE}/api/historial-pagos/${servicioId}`);
            historialPagos = await response.json();
            
            // Guardar en caché
            historialPagosCache[servicioId] = historialPagos;
        }
        
        const clienteNombre = servicio.cliente ? `${servicio.cliente.nombre} ${servicio.cliente.apellido_paterno || ''}`.trim() : 'Sin cliente';
        
        // Llenar modal
        document.getElementById('historialPagosNumeroServicio').textContent = servicio.numero_servicio || 'N/A';
        document.getElementById('historialPagosCliente').textContent = clienteNombre;
        document.getElementById('historialPagosMontoTotal').textContent = formatearMoneda(servicio.montoTotal);
        document.getElementById('historialPagosMontoPagado').textContent = formatearMoneda(servicio.montoPagado);
        document.getElementById('historialPagosSaldoPendiente').textContent = formatearMoneda(servicio.saldoPendiente);
        
        // Renderizar tabla de pagos
        let tablaHtml = '';
        
        if (historialPagos.length === 0) {
            tablaHtml = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">No hay pagos registrados</td></tr>';
        } else {
            historialPagos.forEach((pago, index) => {
                const fecha = formatearFecha(pago.fecha_pago);
                const numero = historialPagos.length - index; // Numerar del más reciente al más antiguo
                
                tablaHtml += `
                    <tr>
                        <td data-label="N°">${numero}</td>
                        <td data-label="Fecha">${fecha}</td>
                        <td data-label="Monto" style="color: #4CAF50; font-weight: 600;">${formatearMoneda(pago.monto)}</td>
                        <td data-label="Método">
                            <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; background: #e3f2fd; color: #1976D2;">
                                ${pago.metodo_pago}
                            </span>
                        </td>
                        <td data-label="Referencia">${pago.referencia || '-'}</td>
                        <td data-label="Notas">${pago.notas || '-'}</td>
                    </tr>
                `;
            });
        }
        
        document.getElementById('historialPagosTabla').innerHTML = tablaHtml;
        
        cerrarModalCarga();
        mostrarModal('modalHistorialPagosServicio');
        
    } catch (error) {
        cerrarModalCarga();
        console.error('Error al cargar historial de pagos:', error);
        alert('Error al cargar el historial de pagos del servicio');
    }
}

/**
 * Cerrar modal de historial de pagos
 */
export function cerrarModalHistorialPagosServicio() {
    cerrarModal('modalHistorialPagosServicio');
}

// Exportar funciones
export { cargarPagos as default };
