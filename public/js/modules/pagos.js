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
        console.log('📡 Cargando datos para pagos...');
        
        // 🚀 OPTIMIZACIÓN: Reutilizar cachés de otros módulos si están disponibles
        let servicios, clientes, equipos;
        
        if (window.Servicios && window.Servicios.serviciosCache && window.Servicios.serviciosCache.length > 0) {
            console.log('✅ Reutilizando caché de Servicios');
            servicios = window.Servicios.serviciosCache;
            clientes = window.Servicios.clientesCache || [];
            equipos = window.Servicios.equiposCache || [];
        } else {
            console.log('📡 Consultando BD (sin caché disponible)...');
            const serviciosRes = await fetch(`${API_BASE}/api/servicios`);
            const serviciosRaw = await serviciosRes.json();
            servicios = serviciosRaw.data || serviciosRaw;
            
            const clientesRes = await fetch(`${API_BASE}/api/clientes`);
            clientes = await clientesRes.json();
            
            const equiposRes = await fetch(`${API_BASE}/api/equipos`);
            equipos = await equiposRes.json();
        }
        
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
                
                // Obtener datos financieros directamente de la BD
                const montoTotal = parseFloat(srv.monto || 0);
                const montoPagado = parseFloat(srv.adelanto || 0);
                
                // Usar saldo_pendiente de la BD si existe, sino calcularlo
                let saldoPendiente;
                if (srv.saldo_pendiente !== undefined && srv.saldo_pendiente !== null) {
                    saldoPendiente = parseFloat(srv.saldo_pendiente);
                } else {
                    saldoPendiente = Math.max(0, montoTotal - montoPagado);
                }
                
                // Usar estado_pago de la BD si existe, sino determinarlo
                let estadoPago;
                if (srv.estado_pago) {
                    estadoPago = srv.estado_pago;
                } else {
                    estadoPago = 'pendiente';
                    if (montoTotal > 0 && montoPagado >= montoTotal) {
                        estadoPago = 'pagado';
                    } else if (montoPagado > 0) {
                        estadoPago = 'parcial';
                    }
                }
                
                console.log(`Servicio ${srv.numero_servicio}: Total=${montoTotal}, Pagado=${montoPagado}, Saldo=${saldoPendiente}, Estado=${estadoPago}`);
                
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
    
    console.log('🎨 Renderizando panel de pagos...');
    console.log('📦 Total de servicios en caché:', pagosCache.length);
    
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
    
    console.log('💰 Totales calculados:', {
        totalGeneral,
        totalPagado,
        totalPendiente
    });
    
    let html = `
        <!-- Tarjetas de resumen estilo empresarial -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <!-- Total Facturado -->
            <div style="position: relative; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #3498db; border-radius: 2px 0 0 2px;"></div>
                <div style="padding: 20px 20px 20px 24px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: #f0f4f8; border: 2px solid #3498db; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas fa-dollar-sign" style="font-size: 20px; color: #3498db;"></i>
                        </div>
                        <div style="flex: 1;">
                            <p style="margin: 0; font-size: 13px; color: #6c757d; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Total Facturado</p>
                            <h3 style="margin: 5px 0 0 0; font-size: 28px; font-weight: 700; color: #2c3e50;">${formatearMoneda(totalGeneral)}</h3>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Total Cobrado -->
            <div style="position: relative; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #27ae60; border-radius: 2px 0 0 2px;"></div>
                <div style="padding: 20px 20px 20px 24px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: #f0f8f4; border: 2px solid #27ae60; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas fa-check-circle" style="font-size: 20px; color: #27ae60;"></i>
                        </div>
                        <div style="flex: 1;">
                            <p style="margin: 0; font-size: 13px; color: #6c757d; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Total Cobrado</p>
                            <h3 style="margin: 5px 0 0 0; font-size: 28px; font-weight: 700; color: #2c3e50;">${formatearMoneda(totalPagado)}</h3>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Saldo Pendiente -->
            <div style="position: relative; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${totalPendiente < 0 ? '#27ae60' : '#e67e22'}; border-radius: 2px 0 0 2px;"></div>
                <div style="padding: 20px 20px 20px 24px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: ${totalPendiente < 0 ? '#f0f8f4' : '#fef5f0'}; border: 2px solid ${totalPendiente < 0 ? '#27ae60' : '#e67e22'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas ${totalPendiente < 0 ? 'fa-hand-holding-usd' : 'fa-exclamation-triangle'}" style="font-size: 20px; color: ${totalPendiente < 0 ? '#27ae60' : '#e67e22'};"></i>
                        </div>
                        <div style="flex: 1;">
                            <p style="margin: 0; font-size: 13px; color: #6c757d; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${totalPendiente < 0 ? 'Saldo a Devolver' : 'Saldo Pendiente'}</p>
                            <h3 style="margin: 5px 0 0 0; font-size: 28px; font-weight: 700; color: #2c3e50;">${formatearMoneda(Math.abs(totalPendiente))}</h3>
                        </div>
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
    // Re-renderizar todo el panel para actualizar también las tarjetas de resumen
    renderizarPanelPagos();
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
    
    // Ocultar mensaje de error
    const errorElement = document.getElementById('pagoMontoError');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
    
    mostrarModal('modalRegistrarPago');
};

/**
 * Validar monto de pago en tiempo real
 */
export function validarMontoPago(input) {
    const servicioId = document.getElementById('pagoServicioId').value;
    const pago = pagosCache.find(d => d._id === servicioId);
    
    if (!pago) return;
    
    const montoIngresado = parseFloat(input.value);
    const errorElement = document.getElementById('pagoMontoError');
    
    if (isNaN(montoIngresado) || montoIngresado <= 0) {
        input.style.borderColor = '#d32f2f';
        if (errorElement) {
            errorElement.textContent = 'El monto debe ser mayor a 0';
            errorElement.style.display = 'block';
        }
        return false;
    }
    
    if (montoIngresado > pago.saldoPendiente) {
        input.style.borderColor = '#d32f2f';
        if (errorElement) {
            errorElement.textContent = `El monto no puede exceder el saldo pendiente de ${formatearMoneda(pago.saldoPendiente)}`;
            errorElement.style.display = 'block';
        }
        return false;
    }
    
    // Monto válido
    input.style.borderColor = '#4CAF50';
    if (errorElement) {
        errorElement.style.display = 'none';
    }
    return true;
}

/**
 * Cerrar modal de pago
 */
export function cerrarModalRegistrarPago() {
    cerrarModal('modalRegistrarPago');
}

/**
 * Guardar pago
 * OPTIMIZADO: Actualiza caché y registra en colección pagos
 */
export async function guardarPago(e) {
    e.preventDefault();
    
    const servicioId = document.getElementById('pagoServicioId').value;
    const monto = parseFloat(document.getElementById('pagoMonto').value);
    const metodo = document.getElementById('pagoMetodo').value;
    const referencia = document.getElementById('pagoReferencia').value;
    const notas = document.getElementById('pagoNotas').value;
    
    // Validación 1: Monto debe ser mayor a 0
    if (isNaN(monto) || monto <= 0) {
        alert('El monto debe ser mayor a 0');
        return;
    }
    
    const pago = pagosCache.find(d => d._id === servicioId);
    if (!pago) {
        alert('Error: Servicio no encontrado');
        return;
    }
    
    // Validación 2: El monto no puede exceder el saldo pendiente
    if (monto > pago.saldoPendiente) {
        alert(`❌ El monto ingresado (${formatearMoneda(monto)}) excede el saldo pendiente de ${formatearMoneda(pago.saldoPendiente)}`);
        return;
    }
    
    mostrarModalCarga('Registrando pago...');
    
    try {
        // Calcular nuevos valores
        const montoTotalServicio = parseFloat(pago.montoTotal);
        const montoPagadoActual = parseFloat(pago.montoPagado);
        const nuevoMontoPagado = montoPagadoActual + monto;
        const nuevoSaldoPendiente = montoTotalServicio - nuevoMontoPagado;
        
        let nuevoEstadoPago = 'pendiente';
        if (nuevoSaldoPendiente <= 0) {
            nuevoEstadoPago = 'pagado';
        } else if (nuevoMontoPagado > 0) {
            nuevoEstadoPago = 'parcial';
        }
        
        console.log('💰 Cálculos de pago:', {
            montoTotalServicio,
            montoPagadoActual,
            montoPago: monto,
            nuevoMontoPagado,
            nuevoSaldoPendiente,
            nuevoEstadoPago
        });
        
        // 1. Registrar en colección pagos (esto actualiza automáticamente el servicio en BD)
        const pagoData = {
            servicio_equipo_id: servicioId,
            monto_pagado: monto,
            metodo_pago: metodo,
            numero_referencia: referencia,
            notas: notas,
            registrado_por: localStorage.getItem('usuario_nombre') || 'Sistema'
        };
        
        const pagoResponse = await fetch(`${API_BASE}/api/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pagoData)
        });
        
        if (!pagoResponse.ok) {
            const errorData = await pagoResponse.json();
            throw new Error(errorData.error || 'Error al registrar el pago');
        }
        
        const pagoResult = await pagoResponse.json();
        console.log('✅ Pago registrado exitosamente en BD:', pagoResult);
        
        // 2. Registrar en historial de pagos
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
        
        const historialResponse = await fetch(`${API_BASE}/api/historial-pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(historialPago)
        });
        
        if (historialResponse.ok) {
            const historialResult = await historialResponse.json();
            console.log('✅ Historial de pago registrado:', historialResult);
            
            // Limpiar caché de historial para que se recargue cuando se consulte
            delete historialPagosCache[servicioId];
        }
        
        // 3. ✅ ACTUALIZAR CACHÉ LOCAL DE PAGOS (sin consultar BD)
        console.log('💾 Actualizando caché local de pagos...');
        const index = pagosCache.findIndex(p => p._id === servicioId);
        if (index !== -1) {
            console.log('📊 Valores ANTES de actualizar caché:', {
                montoPagado: pagosCache[index].montoPagado,
                saldoPendiente: pagosCache[index].saldoPendiente,
                estadoPago: pagosCache[index].estadoPago
            });
            
            // Actualizar valores en el caché
            pagosCache[index].montoPagado = nuevoMontoPagado;
            pagosCache[index].saldoPendiente = nuevoSaldoPendiente;
            pagosCache[index].estadoPago = nuevoEstadoPago;
            
            console.log('📊 Valores DESPUÉS de actualizar caché:', {
                montoPagado: pagosCache[index].montoPagado,
                saldoPendiente: pagosCache[index].saldoPendiente,
                estadoPago: pagosCache[index].estadoPago
            });
            console.log('✅ Caché de pagos actualizado correctamente');
        } else {
            console.error('❌ No se encontró el servicio en el caché de pagos');
        }
        
        // 4. ✅ SINCRONIZAR CACHÉ DE SERVICIOS (sin consultar BD)
        if (window.Servicios && window.Servicios.serviciosCache) {
            const srvIndex = window.Servicios.serviciosCache.findIndex(s => s._id === servicioId);
            if (srvIndex !== -1) {
                console.log('📊 Actualizando caché de servicios...');
                window.Servicios.serviciosCache[srvIndex].adelanto = nuevoMontoPagado;
                window.Servicios.serviciosCache[srvIndex].saldo_pendiente = nuevoSaldoPendiente;
                window.Servicios.serviciosCache[srvIndex].estado_pago = nuevoEstadoPago;
                console.log('✅ Caché de servicios actualizado');
            }
        }
        
        cerrarModalCarga();
        cerrarModal('modalRegistrarPago');
        
        // 5. Actualizar la tabla visualmente DESPUÉS de cerrar modales
        console.log('🔄 Re-renderizando panel de pagos...');
        renderizarPanelPagos();
        
        if (nuevoSaldoPendiente <= 0) {
            mostrarNotificacionExito('✅ Pago registrado - Deuda saldada completamente');
        } else {
            mostrarNotificacionExito(`✅ Pago registrado - Saldo pendiente: ${formatearMoneda(nuevoSaldoPendiente)}`);
        }
        
    } catch (error) {
        cerrarModalCarga();
        console.error('❌ Error al registrar pago:', error);
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
            tablaHtml = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No hay pagos registrados</td></tr>';
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

/**
 * Eliminar un pago registrado (solo admin)
 */
export async function eliminarPago(pagoId, servicioId) {
    if (!confirm('¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer.')) {
        return;
    }
    
    mostrarModalCarga('Eliminando pago...');
    
    try {
        // Eliminar el pago
        const response = await fetch(`${API_BASE}/api/pagos/${pagoId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar el pago');
        }
        
        // Limpiar caché de historial para forzar recarga
        delete historialPagosCache[servicioId];
        
        // Forzar recarga de pagos para actualizar saldos
        await cargarPagos(true);
        
        cerrarModalCarga();
        mostrarNotificacionExito('Pago eliminado exitosamente');
        
        // Si el modal de historial está abierto, recargarlo
        const modalHistorial = document.getElementById('modalHistorialPagosServicio');
        if (modalHistorial && modalHistorial.classList.contains('show')) {
            await verHistorialPagosServicio(servicioId);
        }
        
    } catch (error) {
        cerrarModalCarga();
        console.error('Error al eliminar pago:', error);
        alert('Error al eliminar el pago: ' + error.message);
    }
}

// Exportar funciones
export { cargarPagos as default };
