// ==================== MÓDULO DE CAMBIO DE ESTADO ====================

import { API_CLIENTES, API_SERVICIOS, API_EQUIPOS, API_SERVICIO_EQUIPO, API_URL } from '../config.js';
import { mostrarModalCarga, cerrarModalCarga, mostrarNotificacionExito, mostrarNotificacionAdvertencia, mostrarModalNotificacion } from '../ui.js';
import { getJSON } from '../api.js';

// ==================== FUNCIONES PÚBLICAS ====================

/**
 * Obtener estados permitidos según estado actual
 */
export function obtenerEstadosPermitidos(estadoActual) {
    const transiciones = {
        'Pendiente': ['En diagnóstico'],
        'Pendiente de evaluación': ['En diagnóstico'],
        'En diagnóstico': ['En reparación'],
        'En reparación': ['Completado'],
        'Completado': ['Entregado'],
        'Entregado': [],
        'Diagnosticado': ['En reparación']
    };
    
    return transiciones[estadoActual] || [];
}

/**
 * Abrir modal para cambiar estado
 */
export async function abrirModalCambiarEstado(servicioId) {
    try {
        // Obtener el servicio específico por ID
        const servicioRes = await fetch(`${API_SERVICIOS}/${servicioId}`);
        if (!servicioRes.ok) {
            alert('Servicio no encontrado');
            return;
        }
        const servicio = await servicioRes.json();
        
        // Si está en "En reparación", mostrar modal de confirmación de reparación
        if (servicio.estado === 'En reparación') {
            abrirModalConfirmarReparacion(servicioId, servicio);
            return;
        }
        
        // Si está en "Completado", mostrar modal de entrega
        if (servicio.estado === 'Completado') {
            if (window.abrirModalEntrega) {
                window.abrirModalEntrega(servicioId, servicio);
            } else {
                alert('Modal de entrega no disponible');
            }
            return;
        }
        
        const estadosPermitidos = obtenerEstadosPermitidos(servicio.estado);
        
        if (estadosPermitidos.length === 0) {
            alert('Este servicio ya está en estado final');
            return;
        }
        
        // Guardar servicio en memoria
        window.servicioEnCambioEstado = {
            id: servicioId,
            estadoActual: servicio.estado
        };
        
        // Mostrar estado actual
        document.getElementById('estadoActualTexto').textContent = servicio.estado;
        
        // Llenar selector con estados permitidos
        const select = document.getElementById('nuevoEstadoSelect');
        select.innerHTML = '<option value="">Seleccionar...</option>';
        estadosPermitidos.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
            select.appendChild(option);
        });
        
        // Guardar ID del servicio
        document.getElementById('servicioIdCambioEstado').value = servicioId;
        
        // Mostrar modal
        document.getElementById('modalCambiarEstado').classList.add('show');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar estado: ' + error.message);
    }
}

/**
 * Cerrar modal de cambiar estado
 */
export function cerrarModalCambiarEstado() {
    const modal = document.getElementById('modalCambiarEstado');
    if (modal) {
        modal.classList.remove('show');
    }
    window.servicioEnCambioEstado = null;
}

/**
 * Confirmar cambio de estado
 */
export async function confirmarCambioEstado() {
    if (!window.servicioEnCambioEstado) {
        alert('Error: No hay servicio seleccionado');
        return;
    }
    
    const nuevoEstado = document.getElementById('nuevoEstadoSelect').value;
    
    if (!nuevoEstado) {
        const select = document.getElementById('nuevoEstadoSelect');
        select.style.borderColor = '#d32f2f';
        select.style.borderWidth = '2px';
        alert('Por favor selecciona un estado');
        return;
    }
    
    try {
        await cambiarEstadoServicio(window.servicioEnCambioEstado.id, nuevoEstado);
        cerrarModalCambiarEstado();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar estado: ' + error.message);
    }
}

/**
 * Cambiar estado del servicio
 */
export async function cambiarEstadoServicio(servicioId, nuevoEstado, datosAdicionales = '') {
    try {
        mostrarModalCarga('Cambiando estado...');
        
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => s._id === servicioId);
        
        if (!servicio) throw new Error('Servicio no encontrado');
        
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
                if (datosAdicionales) {
                    actualizacion.datos_inicio_reparacion = datosAdicionales;
                }
                break;
            case 'Completado':
                actualizacion.fecha_completado = ahora;
                if (datosAdicionales) {
                    actualizacion.datos_reparacion_completa = datosAdicionales;
                }
                break;
            case 'Entregado':
                actualizacion.fecha_entrega = ahora;
                if (datosAdicionales) {
                    // Parsear datos adicionales si es JSON
                    let datosEntrega = datosAdicionales;
                    if (typeof datosAdicionales === 'string') {
                        try {
                            datosEntrega = JSON.parse(datosAdicionales);
                        } catch (e) {
                            datosEntrega = datosAdicionales;
                        }
                    }
                    
                    actualizacion.datos_entrega = datosAdicionales;
                    
                    // Actualizar datos financieros si están presentes
                    if (datosEntrega.nuevoAdelanto !== undefined) {
                        actualizacion.adelanto = datosEntrega.nuevoAdelanto;
                    }
                    if (datosEntrega.nuevoSaldo !== undefined) {
                        actualizacion.saldo_pendiente = datosEntrega.nuevoSaldo;
                    }
                    if (datosEntrega.estadoPago) {
                        actualizacion.estado_pago = datosEntrega.estadoPago;
                    }
                }
                break;
        }
        
        const response = await fetch(`${API_SERVICIOS}/${servicioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actualizacion)
        });
        
        if (!response.ok) {
            throw new Error('Error al cambiar estado');
        }
        
        cerrarModalCarga();
        
        // Recargar servicios
        if (window.cargarServicios) {
            window.cargarServicios();
        }
        
        mostrarNotificacionExito(`Estado cambiado a: ${nuevoEstado}`);
        
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al cambiar estado: ' + error.message);
    }
}

/**
 * Ver diagnóstico guardado
 */
export async function verDiagnostico(servicioId) {
    try {
        const response = await fetch(`${API_SERVICIOS}`);
        const servicios = await response.json();
        const servicio = servicios.find(s => s._id === servicioId);
        
        if (!servicio || !servicio.diagnostico) {
            alert('No hay diagnóstico disponible');
            return;
        }
        
        const diagnostico = JSON.parse(servicio.diagnostico);
        let mensaje = `Diagnóstico del servicio ${servicio.numero_servicio}\n\nTécnico: ${servicio.tecnico || 'N/A'}\n\n`;
        diagnostico.forEach((p, idx) => {
            mensaje += `${idx + 1}. ${p.descripcion}\n`;
            if (p.solucion) mensaje += `   Solución: ${p.solucion}\n`;
            mensaje += `   Costo: $${p.costo}\n\n`;
        });
        
        const total = diagnostico.reduce((sum, p) => sum + (p.costo || 0), 0);
        mensaje += `Total: $${total.toFixed(2)}`;
        
        alert(mensaje);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar diagnóstico: ' + error.message);
    }
}

/**
 * Abrir modal con detalles completos del servicio
 */
export async function abrirModalDetallesServicio(servicioId) {
    try {
        mostrarModalCarga('Cargando detalles...');

        const servicios = await getJSON(`${API_SERVICIOS}?incluir_cancelados=true`);
        const servicio = servicios.find(s => s._id === servicioId);

        if (!servicio) {
            cerrarModalCarga();
            alert('Servicio no encontrado');
            return;
        }

        const clientes = await getJSON(API_CLIENTES);
        const cliente = clientes.find(c => c._id == servicio.cliente_id);

        const equipos = await getJSON(API_EQUIPOS);

        let equipo = null;
        let servicioEquipo = null;
        let fotosEquipo = [];
        
        if (servicio.equipo_id) {
            equipo = equipos.find(e => e._id == servicio.equipo_id);
        }

        if (!equipo) {
            const serviciosEquipo = await getJSON(API_SERVICIO_EQUIPO);
            servicioEquipo = serviciosEquipo.find(se => se.servicio_id == servicioId);
            if (servicioEquipo) {
                equipo = equipos.find(e => String(e._id) === String(servicioEquipo.equipo_id));
                if (servicioEquipo.fotos && Array.isArray(servicioEquipo.fotos)) {
                    fotosEquipo = servicioEquipo.fotos;
                }
            }
        } else {
            const serviciosEquipo = await getJSON(API_SERVICIO_EQUIPO);
            servicioEquipo = serviciosEquipo.find(se => se.servicio_id == servicioId);
            if (servicioEquipo && servicioEquipo.fotos && Array.isArray(servicioEquipo.fotos)) {
                fotosEquipo = servicioEquipo.fotos;
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

        // --- Helper: badge de estado ---
        const getEstadoBadge = (estado) => {
            const estilos = {
                'Pendiente': { bg: '#FFF3CD', color: '#856404', dot: '#856404' },
                'Pendiente de evaluación': { bg: '#FFF3CD', color: '#856404', dot: '#856404' },
                'En diagnóstico': { bg: '#cfe2ff', color: '#084298', dot: '#084298' },
                'Diagnosticado': { bg: '#cfe2ff', color: '#084298', dot: '#084298' },
                'En reparación': { bg: '#fff3cd', color: '#664d03', dot: '#FF6F00' },
                'Completado': { bg: '#d1e7dd', color: '#0f5132', dot: '#198754' },
                'Entregado': { bg: '#d1e7dd', color: '#0f5132', dot: '#0f5132' },
                'Cancelado': { bg: '#f8d7da', color: '#842029', dot: '#dc3545' }
            };
            const s = estilos[estado] || { bg: '#e2e3e5', color: '#41464b', dot: '#41464b' };
            return `<span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 18px; background: ${s.bg}; font-size: 12px; font-weight: 600; color: ${s.color}; letter-spacing: 0.5px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${s.dot};"></span>${(estado || 'N/A').toUpperCase()}
            </span>`;
        };

        // --- Helper: saldo ---
        const saldo = parseFloat(servicio.monto || 0) - parseFloat(servicio.adelanto || 0);
        const saldoColor = saldo > 0 ? '#dc3545' : '#198754';

        // --- COLUMNA 1: Info General ---
        const col1HTML = `
            <div class="emp-col emp-col-info">
                <!-- Cliente -->
                <div class="emp-section">
                    <div class="emp-section-label">INFORMACIÓN DEL CLIENTE</div>
                    <div class="emp-section-divider"></div>
                    <div class="emp-client-name">${cliente ? cliente.nombre : 'N/A'}</div>
                    <div class="emp-field-group">
                        <div class="emp-field"><span class="emp-field-label">DNI</span><span class="emp-field-value">${cliente ? cliente.dni : 'N/A'}</span></div>
                        <div class="emp-field"><span class="emp-field-label">Teléfono</span><span class="emp-field-value">${cliente ? (cliente.telefono || 'No registrado') : 'N/A'}</span></div>
                        ${cliente && cliente.email ? `<div class="emp-field"><span class="emp-field-label">Email</span><span class="emp-field-value">${cliente.email}</span></div>` : ''}
                        ${cliente && cliente.direccion ? `<div class="emp-field"><span class="emp-field-label">Dirección</span><span class="emp-field-value">${cliente.direccion}</span></div>` : ''}
                    </div>
                </div>

                <!-- Equipo -->
                <div class="emp-section">
                    <div class="emp-section-label">EQUIPO</div>
                    <div class="emp-section-divider"></div>
                    ${equipo ? `
                        <div class="emp-equipo-name">${equipo.tipo_equipo || 'N/A'} ${equipo.marca || ''} ${equipo.modelo || ''}</div>
                        <div class="emp-card-row">
                            <div class="emp-mini-card"><span class="emp-field-label">Marca</span><span class="emp-field-value">${equipo.marca || 'N/A'}</span></div>
                            <div class="emp-mini-card"><span class="emp-field-label">Modelo</span><span class="emp-field-value">${equipo.modelo || 'N/A'}</span></div>
                        </div>
                        ${equipo.serie ? `<div class="emp-mini-card" style="margin-top: 8px;"><span class="emp-field-label">Serie</span><span class="emp-field-value" style="font-family: monospace;">${equipo.serie}</span></div>` : ''}
                    ` : '<p style="color: #6c757d; font-size: 13px;">No hay equipo registrado</p>'}
                </div>

                <!-- Ubicación y Fechas -->
                <div class="emp-section">
                    <div class="emp-section-label">UBICACIÓN Y FECHAS</div>
                    <div class="emp-section-divider"></div>
                    <div class="emp-mini-card-full">
                        <div class="emp-field"><span class="emp-field-label">Sucursal</span><span class="emp-field-value" style="font-weight: 600;">${servicio.local || 'N/A'}</span></div>
                        <div class="emp-field"><span class="emp-field-label">Fecha de Ingreso</span><span class="emp-field-value">${servicio.fecha || 'N/A'} - ${servicio.hora || 'N/A'}</span></div>
                    </div>
                </div>

                <!-- Resumen Financiero -->
                <div class="emp-section">
                    <div class="emp-section-label">RESUMEN FINANCIERO</div>
                    <div class="emp-section-divider"></div>
                    <div class="emp-finance-card">
                        <div class="emp-finance-row"><span class="emp-field-label">MONTO TOTAL</span><span class="emp-finance-amount" style="color: #2192B8;">${parseFloat(servicio.monto || 0).toFixed(2)}</span></div>
                        <div class="emp-finance-row"><span class="emp-field-label">ADELANTO</span><span class="emp-finance-amount" style="color: #198754;">${parseFloat(servicio.adelanto || 0).toFixed(2)}</span></div>
                        <div class="emp-finance-row emp-finance-saldo" style="background: ${saldo > 0 ? '#fff3cd' : '#d1e7dd'};">
                            <span class="emp-field-label" style="color: ${saldo > 0 ? '#856404' : '#0f5132'};">SALDO PENDIENTE</span>
                            <span class="emp-finance-amount" style="color: ${saldoColor};">${saldo.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Info Adicional -->
                <div class="emp-section">
                    <div class="emp-section-label">INFORMACIÓN ADICIONAL</div>
                    <div class="emp-section-divider"></div>
                    <div class="emp-mini-card-full">
                        <div class="emp-field"><span class="emp-field-label">Técnico Asignado</span><span class="emp-field-value">${servicio.tecnico || 'N/A'}</span></div>
                    </div>
                </div>
            </div>
        `;

        // --- COLUMNA 2: Proceso del Servicio ---
        const buildDiagnosticoItems = () => {
            if (!diagnostico || diagnostico.length === 0) return '';
            return diagnostico.map(p => `
                <div class="emp-diag-item">
                    <div style="flex: 1;">
                        <p style="margin: 0 0 4px 0; font-weight: 600; color: #1e3c72; font-size: 13px;">${p.descripcion}</p>
                        ${p.solucion ? `<p style="margin: 0; font-size: 12px; color: #6c757d;"><i class="fas fa-tools" style="margin-right: 4px; color: #198754;"></i>Solución: ${p.solucion}</p>` : ''}
                    </div>
                    <span style="font-weight: 700; color: #2192B8; font-size: 16px; white-space: nowrap;">${parseFloat(p.costo).toFixed(2)}</span>
                </div>
            `).join('');
        };

        let datosReparacion = null;
        if (servicio.datos_inicio_reparacion) { try { datosReparacion = JSON.parse(servicio.datos_inicio_reparacion); } catch(e) {} }
        let datosCompleta = null;
        if (servicio.datos_reparacion_completa) { try { datosCompleta = JSON.parse(servicio.datos_reparacion_completa); } catch(e) {} }
        let datosEntrega = null;
        if (servicio.datos_entrega) { try { datosEntrega = JSON.parse(servicio.datos_entrega); } catch(e) {} }

        const col2HTML = `
            <div class="emp-col emp-col-proceso">
                <!-- Problema Reportado -->
                <div class="emp-card">
                    <div class="emp-card-header" style="background: #fff3cd;"><span style="color: #856404; font-weight: 600; font-size: 12px; letter-spacing: 0.5px;"><i class="fas fa-exclamation-triangle" style="margin-right: 4px;"></i> PROBLEMA REPORTADO</span></div>
                    <div class="emp-card-body">
                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #212529;">"${servicio.problemas_reportados || servicio.descripcion_problema || servicio.problemas || 'No especificado'}"</p>
                        ${servicio.observaciones ? `
                            <div class="emp-mini-card-full" style="margin-top: 8px;">
                                <span class="emp-field-label">Observaciones</span>
                                <span class="emp-field-value" style="white-space: pre-wrap;">${servicio.observaciones}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Diagnóstico -->
                ${diagnostico && diagnostico.length > 0 ? `
                <div class="emp-card">
                    <div class="emp-card-header" style="background: #d4eaf5;"><span style="color: #0c5a7a; font-weight: 600; font-size: 12px; letter-spacing: 0.5px;"><i class="fas fa-search" style="margin-right: 4px;"></i> DIAGNÓSTICO REALIZADO</span></div>
                    <div class="emp-card-body">
                        <div class="emp-field" style="margin-bottom: 10px;"><span class="emp-field-label">Técnico Diagnosticador</span><span class="emp-field-value" style="font-weight: 500;">${servicio.tecnico || 'N/A'}</span></div>
                        <div class="emp-diag-list">${buildDiagnosticoItems()}</div>
                        <div style="margin-top: 10px; padding: 8px 12px; text-align: right; border-top: 1px solid #dee2e6;">
                            <span style="font-size: 12px; color: #6c757d;">Costo Total del Diagnóstico</span>
                            <span style="display: block; font-size: 18px; font-weight: 700; color: #2192B8;">${parseFloat(servicio.monto || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Reparación -->
                ${datosReparacion || datosCompleta ? `
                <div class="emp-card">
                    <div class="emp-card-header" style="background: ${datosCompleta ? '#d1e7dd' : '#fff3e0'};"><span style="color: ${datosCompleta ? '#0f5132' : '#E65100'}; font-weight: 600; font-size: 12px; letter-spacing: 0.5px;">${datosCompleta ? '<i class="fas fa-check-circle" style="margin-right: 4px;"></i> REPARACIÓN COMPLETADA' : '<i class="fas fa-wrench" style="margin-right: 4px;"></i> EN REPARACIÓN'}</span></div>
                    <div class="emp-card-body">
                        ${datosReparacion ? `
                            <div class="emp-card-row">
                                <div class="emp-mini-card"><span class="emp-field-label">Técnico Asignado</span><span class="emp-field-value">${datosReparacion.tecnicoReparacion || 'N/A'}</span></div>
                                <div class="emp-mini-card"><span class="emp-field-label">Tiempo Estimado</span><span class="emp-field-value">${datosReparacion.tiempoEstimado || 'N/A'}</span></div>
                            </div>
                            ${datosReparacion.observacionesInicio ? `<div class="emp-mini-card-full" style="margin-top: 8px;"><span class="emp-field-label">Observaciones Iniciales</span><span class="emp-field-value">${datosReparacion.observacionesInicio}</span></div>` : ''}
                        ` : ''}
                        ${datosCompleta ? `
                            ${datosCompleta.fechaCompletado ? `
                                <div class="emp-card-row" style="margin-top: 8px;">
                                    <div class="emp-mini-card"><span class="emp-field-label">Fecha de Completación</span><span class="emp-field-value">${datosCompleta.fechaCompletado}</span></div>
                                </div>
                            ` : ''}
                            ${datosCompleta.comentariosReparacion ? `<div class="emp-mini-card-full" style="margin-top: 8px;"><span class="emp-field-label">Comentarios</span><span class="emp-field-value">${datosCompleta.comentariosReparacion}</span></div>` : ''}
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Cancelación -->
                ${servicio.estado === 'Cancelado' ? `
                <div class="emp-card">
                    <div class="emp-card-header" style="background: #f8d7da;"><span style="color: #842029; font-weight: 600; font-size: 12px; letter-spacing: 0.5px;"><i class="fas fa-ban" style="margin-right: 4px;"></i> SERVICIO CANCELADO</span></div>
                    <div class="emp-card-body">
                        <div class="emp-mini-card-full" style="background: #fff5f5;">
                            <span class="emp-field-label" style="color: #842029;">Motivo de Cancelación</span>
                            <span class="emp-field-value" style="font-style: italic;">${servicio.motivo_cancelacion || 'No especificado'}</span>
                        </div>
                        ${servicio.cancelado_por ? `<div class="emp-field" style="margin-top: 8px;"><span class="emp-field-label">Cancelado por</span><span class="emp-field-value">${servicio.cancelado_por}</span></div>` : ''}
                        ${servicio.fecha_cancelacion ? `<div class="emp-field" style="margin-top: 4px;"><span class="emp-field-label">Fecha</span><span class="emp-field-value">${new Date(servicio.fecha_cancelacion).toLocaleString('es-PE')}</span></div>` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Timeline -->
                <div class="emp-card">
                    <div class="emp-card-body" style="padding: 16px;">
                        <div class="emp-section-label" style="margin-bottom: 12px;">LÍNEA DE TIEMPO</div>
                        <div class="emp-timeline">
                            <div class="emp-timeline-item">
                                <div class="emp-timeline-dot" style="background: #2192B8;"></div>
                                <div class="emp-timeline-content"><span class="emp-timeline-title">Ingreso del Equipo</span><span class="emp-timeline-date">${servicio.fecha || ''} ${servicio.hora || ''}</span></div>
                            </div>
                            ${diagnostico && diagnostico.length > 0 ? `
                            <div class="emp-timeline-item">
                                <div class="emp-timeline-dot" style="background: #0dcaf0;"></div>
                                <div class="emp-timeline-content"><span class="emp-timeline-title">Diagnóstico Realizado</span><span class="emp-timeline-date">${servicio.tecnico || ''}</span></div>
                            </div>` : ''}
                            ${datosReparacion ? `
                            <div class="emp-timeline-item">
                                <div class="emp-timeline-dot" style="background: #6f42c1;"></div>
                                <div class="emp-timeline-content"><span class="emp-timeline-title">Reparación ${datosCompleta ? 'Completada' : 'En Proceso'}</span><span class="emp-timeline-date">${datosCompleta && datosCompleta.fechaCompletado ? datosCompleta.fechaCompletado : (datosReparacion.tecnicoReparacion || '')}</span></div>
                            </div>` : ''}
                            ${datosEntrega ? `
                            <div class="emp-timeline-item">
                                <div class="emp-timeline-dot" style="background: #198754;"></div>
                                <div class="emp-timeline-content emp-timeline-entregado"><span class="emp-timeline-title" style="font-weight: 600;">Entregado al Cliente</span><span class="emp-timeline-date">${datosEntrega.fechaEntrega || ''} ${datosEntrega.horaEntrega || ''}</span></div>
                            </div>` : ''}
                            ${servicio.estado === 'Cancelado' ? `
                            <div class="emp-timeline-item">
                                <div class="emp-timeline-dot" style="background: #dc3545;"></div>
                                <div class="emp-timeline-content" style="background: #f8d7da;"><span class="emp-timeline-title" style="color: #842029;">Cancelado</span><span class="emp-timeline-date">${servicio.fecha_cancelacion ? new Date(servicio.fecha_cancelacion).toLocaleString('es-PE') : ''}</span></div>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // --- COLUMNA 3: Evidencia y Entrega ---
        const buildFotosIngresoHTML = () => {
            if (!fotosEquipo || fotosEquipo.length === 0) return '';
            return `
                <div style="margin-bottom: 12px;">
                    <span class="emp-field-label">Fotos al Ingresar (${fotosEquipo.length})</span>
                    <div class="emp-fotos-grid">
                        ${fotosEquipo.map((foto, idx) => `
                            <div class="emp-foto-thumb" onclick="verFotoCompletaModal('${foto}', ${idx + 1})">
                                <img src="${foto}" alt="Foto ${idx + 1}">
                                <span class="emp-foto-label">Foto ${idx + 1}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        const buildFotosEntregaHTML = () => {
            if (!datosEntrega || !datosEntrega.fotos || datosEntrega.fotos.length === 0) return '';
            return `
                <div style="border-top: 1px solid #dee2e6; padding-top: 12px;">
                    <span class="emp-field-label">Fotos de Entrega (${datosEntrega.fotos.length})</span>
                    <div class="emp-fotos-grid">
                        ${datosEntrega.fotos.map((foto, idx) => `
                            <div class="emp-foto-thumb emp-foto-entrega" onclick="verFotoEntregaModal('${(foto.url || '').replace(/'/g, "\\'")}', ${idx + 1})">
                                <img src="${foto.url}" alt="Entrega ${idx + 1}">
                                <span class="emp-foto-label" style="background: rgba(25,135,84,0.85);">Entrega ${idx + 1}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        const col3HTML = `
            <div class="emp-col emp-col-evidencia">
                <!-- Evidencia Fotográfica -->
                ${(fotosEquipo.length > 0 || (datosEntrega && datosEntrega.fotos && datosEntrega.fotos.length > 0)) ? `
                <div class="emp-card">
                    <div class="emp-card-body" style="padding: 16px;">
                        <div class="emp-section-label" style="margin-bottom: 12px;">EVIDENCIA FOTOGRÁFICA</div>
                        <div class="emp-section-divider" style="margin-bottom: 12px;"></div>
                        ${buildFotosIngresoHTML()}
                        ${buildFotosEntregaHTML()}
                        <p style="margin: 8px 0 0 0; font-size: 11px; color: #6c757d;"><i class="fas fa-search-plus" style="margin-right: 4px;"></i>Click para ampliar</p>
                    </div>
                </div>
                ` : ''}

                <!-- Datos de Entrega -->
                ${datosEntrega ? `
                <div class="emp-card">
                    <div class="emp-card-header" style="background: #d1e7dd;"><span style="color: #0f5132; font-weight: 600; font-size: 12px; letter-spacing: 0.5px;"><i class="fas fa-box-open" style="margin-right: 4px;"></i> DATOS DE ENTREGA</span></div>
                    <div class="emp-card-body">
                        <div class="emp-mini-card-full"><span class="emp-field-label">Recibido por</span><span class="emp-field-value" style="font-weight: 500;">${cliente ? cliente.nombre : 'N/A'}</span></div>
                        <div class="emp-card-row" style="margin-top: 8px;">
                            <div class="emp-mini-card"><span class="emp-field-label">Fecha</span><span class="emp-field-value">${datosEntrega.fechaEntrega || 'N/A'}</span></div>
                            <div class="emp-mini-card"><span class="emp-field-label">Hora</span><span class="emp-field-value">${datosEntrega.horaEntrega || 'N/A'}</span></div>
                        </div>
                        <div class="emp-mini-card-full" style="margin-top: 8px;"><span class="emp-field-label">Encargado de Entrega</span><span class="emp-field-value">${datosEntrega.encargadoEntrega || 'N/A'}</span></div>
                        <div class="emp-mini-card-full" style="margin-top: 8px;"><span class="emp-field-label">Estado del Equipo</span><span class="emp-field-value"><span style="padding: 2px 8px; border-radius: 3px; font-size: 12px; ${datosEntrega.estadoEquipo === 'Funcionando correctamente' ? 'background: #d1e7dd; color: #0f5132;' : 'background: #fff3cd; color: #856404;'}">${datosEntrega.estadoEquipo || 'N/A'}</span></span></div>
                        ${datosEntrega.montoCobraHoy ? `
                            <div class="emp-mini-card-full" style="margin-top: 8px; background: #fff3cd;"><span class="emp-field-label" style="color: #856404;">Monto Cobrado</span><span class="emp-finance-amount" style="color: #dc3545; font-size: 18px;">${parseFloat(datosEntrega.montoCobraHoy).toFixed(2)}</span></div>
                        ` : ''}
                        <div class="emp-card-row" style="margin-top: 8px;">
                            ${datosEntrega.metodoPago ? `<div class="emp-mini-card"><span class="emp-field-label">Método</span><span class="emp-field-value">${datosEntrega.metodoPago}</span></div>` : ''}
                            ${datosEntrega.comprobanteEntrega ? `<div class="emp-mini-card"><span class="emp-field-label">Comprobante</span><span class="emp-field-value">${datosEntrega.comprobanteEntrega}</span></div>` : ''}
                        </div>
                        ${datosEntrega.garantiaHasta ? `<div class="emp-mini-card-full" style="margin-top: 8px;"><span class="emp-field-label">Garantía Hasta</span><span class="emp-field-value" style="font-weight: 500;">${datosEntrega.garantiaHasta}</span></div>` : ''}
                        ${datosEntrega.recomendaciones ? `<div class="emp-mini-card-full" style="margin-top: 8px;"><span class="emp-field-label">Recomendaciones</span><span class="emp-field-value">${datosEntrega.recomendaciones}</span></div>` : ''}
                        ${datosEntrega.observacionesEntrega ? `<div class="emp-mini-card-full" style="margin-top: 8px;"><span class="emp-field-label">Observaciones de Entrega</span><span class="emp-field-value">${datosEntrega.observacionesEntrega}</span></div>` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // --- Estilos empresariales ---
        if (!document.getElementById('modalDetallesStyle')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'modalDetallesStyle';
            styleSheet.textContent = `
                #modalDetallesServicio { display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center; }
                #modalDetallesServicio .emp-modal-container { width: 94vw; max-width: 1400px; max-height: 92vh; background: white; border-radius: 6px; box-shadow: 0 8px 40px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; }
                
                /* Header */
                #modalDetallesServicio .emp-header { display: flex; align-items: center; padding: 16px 24px; border-bottom: 1px solid #e9ecef; background: #fff; flex-shrink: 0; gap: 16px; flex-wrap: wrap; }
                #modalDetallesServicio .emp-logo { width: 46px; height: 46px; background: #2192B8; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 20px; font-family: 'Segoe UI', Arial, sans-serif; flex-shrink: 0; }
                #modalDetallesServicio .emp-header-info { flex: 1; min-width: 180px; }
                #modalDetallesServicio .emp-header-label { font-size: 11px; color: #6c757d; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
                #modalDetallesServicio .emp-header-id { font-size: 24px; font-weight: 600; color: #212529; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.2; }
                #modalDetallesServicio .emp-header-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
                #modalDetallesServicio .emp-btn { padding: 8px 14px; border: 1px solid #dee2e6; background: white; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: 500; color: #495057; transition: all 0.2s; display: flex; align-items: center; gap: 5px; white-space: nowrap; }
                #modalDetallesServicio .emp-btn:hover { background: #f8f9fa; border-color: #adb5bd; }
                #modalDetallesServicio .emp-btn-primary { background: #2192B8; border-color: #2192B8; color: white; }
                #modalDetallesServicio .emp-btn-primary:hover { background: #1a7a9e; }
                #modalDetallesServicio .emp-btn-close { width: 36px; height: 36px; border-radius: 50%; border: 1px solid #dee2e6; background: white; color: #6c757d; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; padding: 0; line-height: 1; }
                #modalDetallesServicio .emp-btn-close:hover { background: #f8d7da; color: #dc3545; border-color: #dc3545; }
                
                /* Body - 3 columnas */
                #modalDetallesServicio .emp-body { display: grid; grid-template-columns: 320px 1fr 300px; gap: 0; overflow-y: auto; flex: 1; }
                #modalDetallesServicio .emp-col { padding: 20px; overflow-y: auto; }
                #modalDetallesServicio .emp-col-info { background: #f8f9fa; border-right: 1px solid #e9ecef; }
                #modalDetallesServicio .emp-col-proceso { background: #fff; }
                #modalDetallesServicio .emp-col-evidencia { background: #fff; border-left: 1px solid #e9ecef; }

                /* Secciones */
                #modalDetallesServicio .emp-section { margin-bottom: 20px; }
                #modalDetallesServicio .emp-section-label { font-size: 11px; color: #6c757d; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; font-family: 'Segoe UI', Arial, sans-serif; }
                #modalDetallesServicio .emp-section-divider { height: 1px; background: #dee2e6; margin-bottom: 12px; }
                #modalDetallesServicio .emp-client-name { font-size: 17px; font-weight: 600; color: #212529; margin-bottom: 10px; }
                #modalDetallesServicio .emp-equipo-name { font-size: 15px; font-weight: 600; color: #212529; margin-bottom: 10px; }

                /* Fields */
                #modalDetallesServicio .emp-field { margin-bottom: 6px; }
                #modalDetallesServicio .emp-field-label { display: block; font-size: 11px; color: #6c757d; margin-bottom: 2px; }
                #modalDetallesServicio .emp-field-value { display: block; font-size: 13px; color: #212529; font-weight: 400; }
                #modalDetallesServicio .emp-field-group { display: flex; flex-direction: column; gap: 6px; }

                /* Mini cards */
                #modalDetallesServicio .emp-card-row { display: flex; gap: 8px; }
                #modalDetallesServicio .emp-mini-card { flex: 1; background: #fff; border-radius: 5px; padding: 8px 12px; }
                #modalDetallesServicio .emp-mini-card-full { background: #fff; border-radius: 5px; padding: 8px 12px; }
                #modalDetallesServicio .emp-col-proceso .emp-mini-card, #modalDetallesServicio .emp-col-proceso .emp-mini-card-full,
                #modalDetallesServicio .emp-col-evidencia .emp-mini-card, #modalDetallesServicio .emp-col-evidencia .emp-mini-card-full { background: #f8f9fa; }

                /* Cards de proceso */
                #modalDetallesServicio .emp-card { background: white; border: 1px solid #dee2e6; border-radius: 6px; margin-bottom: 16px; overflow: hidden; }
                #modalDetallesServicio .emp-card-header { padding: 10px 16px; }
                #modalDetallesServicio .emp-card-body { padding: 14px 16px; }

                /* Diagnóstico */
                #modalDetallesServicio .emp-diag-list { display: flex; flex-direction: column; gap: 6px; }
                #modalDetallesServicio .emp-diag-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 12px; background: #f8f9fa; border-radius: 5px; }

                /* Financiero */
                #modalDetallesServicio .emp-finance-card { background: white; border-radius: 5px; overflow: hidden; }
                #modalDetallesServicio .emp-finance-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8f9fa; margin-bottom: 4px; border-radius: 4px; }
                #modalDetallesServicio .emp-finance-amount { font-size: 18px; font-weight: 700; font-family: 'Segoe UI', Arial, sans-serif; }
                #modalDetallesServicio .emp-finance-saldo { border-radius: 4px; }

                /* Timeline */
                #modalDetallesServicio .emp-timeline { position: relative; padding-left: 24px; }
                #modalDetallesServicio .emp-timeline::before { content: ''; position: absolute; left: 7px; top: 8px; bottom: 8px; width: 2px; background: #dee2e6; }
                #modalDetallesServicio .emp-timeline-item { position: relative; margin-bottom: 12px; }
                #modalDetallesServicio .emp-timeline-item:last-child { margin-bottom: 0; }
                #modalDetallesServicio .emp-timeline-dot { position: absolute; left: -20px; top: 8px; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px #dee2e6; z-index: 1; }
                #modalDetallesServicio .emp-timeline-content { background: #f8f9fa; border-radius: 5px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
                #modalDetallesServicio .emp-timeline-entregado { background: #d1e7dd; }
                #modalDetallesServicio .emp-timeline-title { font-size: 12px; color: #212529; font-weight: 500; }
                #modalDetallesServicio .emp-timeline-date { font-size: 11px; color: #6c757d; white-space: nowrap; }

                /* Fotos */
                #modalDetallesServicio .emp-fotos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 8px; }
                #modalDetallesServicio .emp-foto-thumb { position: relative; border-radius: 6px; overflow: hidden; cursor: pointer; border: 2px solid #dee2e6; aspect-ratio: 1; transition: transform 0.2s; }
                #modalDetallesServicio .emp-foto-thumb:hover { transform: scale(1.03); }
                #modalDetallesServicio .emp-foto-thumb img { width: 100%; height: 100%; object-fit: cover; }
                #modalDetallesServicio .emp-foto-thumb.emp-foto-entrega { border-color: #198754; }
                #modalDetallesServicio .emp-foto-label { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 10px; text-align: center; padding: 3px; font-weight: 600; }

                /* ===== RESPONSIVE ===== */
                @media (max-width: 1100px) {
                    #modalDetallesServicio .emp-modal-container { max-width: 98vw; }
                    #modalDetallesServicio .emp-body { grid-template-columns: 280px 1fr; }
                    #modalDetallesServicio .emp-col-evidencia { border-left: none; border-top: 1px solid #e9ecef; grid-column: 1 / -1; }
                    #modalDetallesServicio .emp-col-evidencia .emp-card { display: inline-block; vertical-align: top; width: calc(50% - 8px); margin-right: 8px; }
                }
                @media (max-width: 768px) {
                    #modalDetallesServicio .emp-modal-container { width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; }
                    #modalDetallesServicio .emp-body { grid-template-columns: 1fr; }
                    #modalDetallesServicio .emp-col-info { border-right: none; border-bottom: 1px solid #e9ecef; }
                    #modalDetallesServicio .emp-col-evidencia { grid-column: 1; }
                    #modalDetallesServicio .emp-col-evidencia .emp-card { display: block; width: 100%; margin-right: 0; }
                    #modalDetallesServicio .emp-header { padding: 12px 16px; }
                    #modalDetallesServicio .emp-header-id { font-size: 18px; }
                    #modalDetallesServicio .emp-logo { width: 38px; height: 38px; font-size: 16px; }
                    #modalDetallesServicio .emp-header-actions { width: 100%; justify-content: flex-end; }
                    #modalDetallesServicio .emp-btn span.emp-btn-text { display: none; }
                    #modalDetallesServicio .emp-col { padding: 14px; }
                    #modalDetallesServicio .emp-timeline-content { flex-direction: column; align-items: flex-start; gap: 2px; }
                }
                @media (max-width: 480px) {
                    #modalDetallesServicio .emp-header { gap: 8px; }
                    #modalDetallesServicio .emp-header-id { font-size: 16px; }
                    #modalDetallesServicio .emp-finance-amount { font-size: 15px; }
                    #modalDetallesServicio .emp-card-row { flex-direction: column; }
                    #modalDetallesServicio .emp-fotos-grid { grid-template-columns: 1fr 1fr; gap: 6px; }
                }
            `;
            document.head.appendChild(styleSheet);
        }

        // --- Crear Modal ---
        const modal = document.createElement('div');
        modal.id = 'modalDetallesServicio';
        modal.innerHTML = `
            <div class="emp-modal-container">
                <div class="emp-header">
                    <div class="emp-logo">DP</div>
                    <div class="emp-header-info">
                        <div class="emp-header-label">ORDEN DE SERVICIO</div>
                        <div class="emp-header-id">${servicio.numero_servicio || 'N/A'}</div>
                    </div>
                    ${getEstadoBadge(servicio.estado)}
                    <div class="emp-header-actions">
                        <button class="emp-btn" onclick="reporteServicio.descargarPDF('${servicio._id}')" title="Generar PDF"><i class="fas fa-file-pdf"></i><span class="emp-btn-text">PDF</span></button>
                        <button class="emp-btn" onclick="reporteServicio.imprimirReporte('${servicio._id}')" title="Imprimir"><i class="fas fa-print"></i><span class="emp-btn-text">Imprimir</span></button>
                        <button class="emp-btn emp-btn-primary" onclick="reporteServicio.enviarWhatsAppDesdeMotal('${servicio._id}', '${cliente && cliente.telefono ? cliente.telefono : ''}')" title="WhatsApp"><i class="fab fa-whatsapp"></i><span class="emp-btn-text">WhatsApp</span></button>
                        <button class="emp-btn-close" id="btnCerrarModalDetalles" title="Cerrar">×</button>
                    </div>
                </div>
                <div class="emp-body">
                    ${col1HTML}
                    ${col2HTML}
                    ${col3HTML}
                </div>
            </div>
        `;

        cerrarModalCarga();
        document.body.appendChild(modal);

        document.getElementById('btnCerrarModalDetalles').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            cerrarModalDetallesServicio();
        });

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                cerrarModalDetallesServicio();
            }
        });

        console.log('✅ Modal empresarial de detalles abierto:', servicio);
    } catch (error) {
        cerrarModalCarga();
        console.error('❌ Error:', error);
        alert('Error al cargar detalles del servicio: ' + error.message);
    }
}



/**
 * Ver foto en tamaño completo desde el modal de detalles
 */
export function verFotoCompletaModal(fotoSrc, numeroFoto) {
    const modal = document.createElement('div');
    modal.id = 'modalFotoCompletaDetalles';
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 10001; justify-content: center; align-items: center;';
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%; display: flex; flex-direction: column; align-items: center;">
            <div style="background: white; padding: 10px 20px; border-radius: 8px 8px 0 0; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #2192B8;">
                    <i class="fas fa-image"></i> Foto ${numeroFoto} del Equipo al Ingresar
                </h3>
            </div>
            <img src="${fotoSrc}" alt="Foto ${numeroFoto}" style="max-width: 100%; max-height: 80vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <button onclick="cerrarFotoCompletaModal()" style="position: absolute; top: -10px; right: -10px; background: #d32f2f; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Cerrar al hacer clic fuera de la imagen
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarFotoCompletaModal();
        }
    });
    
    document.body.appendChild(modal);
}

/**
 * Ver foto de entrega en tamaño completo
 */
export function verFotoEntregaModal(fotoSrc, numeroFoto) {
    const modal = document.createElement('div');
    modal.id = 'modalFotoCompletaDetalles';
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 10001; justify-content: center; align-items: center;';
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%; display: flex; flex-direction: column; align-items: center;">
            <div style="background: white; padding: 10px 20px; border-radius: 8px 8px 0 0; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #4CAF50;">
                    <i class="fas fa-image"></i> Foto ${numeroFoto} de Entrega
                </h3>
            </div>
            <img src="${fotoSrc}" alt="Foto ${numeroFoto} de entrega" style="max-width: 100%; max-height: 80vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <button onclick="cerrarFotoCompletaModal()" style="position: absolute; top: -10px; right: -10px; background: #d32f2f; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Cerrar al hacer clic fuera de la imagen
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarFotoCompletaModal();
        }
    });
    
    document.body.appendChild(modal);
}

/**
 * Cerrar modal de foto completa desde detalles
 */
export function cerrarFotoCompletaModal() {
    const modal = document.getElementById('modalFotoCompletaDetalles');
    if (modal) {
        modal.remove();
    }
}


/**
 * Cerrar modal de detalles del servicio
 */
export function cerrarModalDetallesServicio() {
    console.log('🔴 Cerrando modal de detalles del servicio');
    const modal = document.getElementById('modalDetallesServicio');
    if (modal) {
        modal.remove();
        console.log('✅ Modal de detalles cerrado');
    } else {
        console.warn('⚠️ No se encontró el modal de detalles');
    }
}


/**
 * Abrir modal para confirmar reparación completada
 */
export async function abrirModalConfirmarReparacion(servicioId, servicio) {
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
                const clienteRes = await fetch(`${API_CLIENTES}/${servicio.cliente_id}`);
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
        let montoTotal = 0;
        problemas.forEach((problema, index) => {
            const costo = parseFloat(problema.costo) || 0;
            montoTotal += costo;
            htmlProblemas += `
                <div class="reparacion-problema-card" id="problemaCard-${index}">
                    <input type="checkbox" id="problema-${index}" class="checkboxProblema" onchange="verificarTodosReparados()">
                    <label for="problema-${index}" class="reparacion-problema-label">
                        <div class="reparacion-problema-header">
                            <span class="reparacion-problema-num">${index + 1}</span>
                            <strong>Problema ${index + 1}</strong>
                        </div>
                        <p class="reparacion-problema-desc">${problema.descripcion}</p>
                        ${problema.solucion ? `<p class="reparacion-problema-solucion"><i class="fas fa-wrench"></i> ${problema.solucion}</p>` : ''}
                        <p class="reparacion-problema-costo">$${costo.toFixed(2)}</p>
                    </label>
                </div>
            `;
        });

        document.getElementById('problemasReparacionContainer').innerHTML = htmlProblemas;
        document.getElementById('montoTotalReparacion').textContent = `S/ ${montoTotal.toFixed(2)}`;
        
        // Limpiar comentario
        document.getElementById('comentarioReparacion').value = '';
        
        // Mostrar modal
        document.getElementById('modalConfirmarReparacion').classList.add('show');
        
        console.log('✅ Modal de confirmar reparación abierto');
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error al abrir confirmación de reparación');
    }
}

/**
 * Cerrar modal de confirmación de reparación
 */
export function cerrarModalConfirmarReparacion() {
    const modal = document.getElementById('modalConfirmarReparacion');
    if (modal) {
        modal.classList.remove('show');
    }
    window.servicioEnReparacion = null;
    console.log('✅ Modal de confirmar reparación cerrado');
}

/**
 * Verificar si todos los problemas están marcados
 */
export function verificarTodosReparados() {
    const checkboxes = document.querySelectorAll('.checkboxProblema');
    checkboxes.forEach((cb, i) => {
        const card = document.getElementById(`problemaCard-${i}`);
        if (card) {
            card.classList.toggle('reparacion-problema-checked', cb.checked);
        }
    });
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    const btnConfirmar = document.getElementById('btnConfirmarReparacion');
    if (btnConfirmar) {
        btnConfirmar.disabled = !todosChecked;
    }
}

/**
 * Confirmar que la reparación está completa
 */
export async function confirmarReparacionCompleta() {
    if (!window.servicioEnReparacion) {
        alert('Error: No hay servicio en reparación');
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
        
        console.log('💾 Completando reparación:', datosReparacionCompleta);
        
        // Pasar datos completos al cambiar estado
        await cambiarEstadoServicio(window.servicioEnReparacion.id, 'Completado', datosJSON);
        cerrarModalConfirmarReparacion();
        
        // Mostrar notificación de éxito (sin alert)
        mostrarNotificacionExito('Reparación completada');
        
        // Recargar servicios
        if (window.cargarServicios) {
            window.cargarServicios();
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error al completar reparación: ' + error.message);
    }
}


/**
 * Abrir modal de entrega cuando estado es "Completado"
 */
export async function abrirModalEntrega(servicioId, servicio) {
    try {
        console.log('📦 Abriendo modal de entrega para servicio:', servicioId);
        console.log('📦 Datos del servicio recibidos:', servicio);
        
        // Guardar ID en memoria
        window.servicioEnEntrega = {
            id: servicioId,
            monto: servicio.monto || 0,
            adelanto: servicio.adelanto || 0
        };

        // Obtener datos del cliente
        let cliente = { nombre: 'N/A', telefono: 'N/A' };
        if (servicio.cliente_id) {
            console.log('🔍 Obteniendo cliente con ID:', servicio.cliente_id);
            try {
                const clienteRes = await fetch(`${API_CLIENTES}/${servicio.cliente_id}`);
                if (clienteRes.ok) {
                    cliente = await clienteRes.json();
                    console.log('✅ Cliente obtenido:', cliente);
                } else {
                    console.error('❌ Cliente no encontrado (404). El cliente puede haber sido eliminado.');
                    console.warn('⚠️ Intentando buscar cliente en la lista completa...');
                    
                    // Intentar buscar en la lista completa de clientes por si el ID cambió
                    try {
                        const clientesRes = await fetch(`${API_CLIENTES}`);
                        if (clientesRes.ok) {
                            const clientes = await clientesRes.json();
                            // Buscar por coincidencia parcial de ID o nombre
                            const clienteEncontrado = clientes.find(c => 
                                c._id === servicio.cliente_id || 
                                c.id === servicio.cliente_id
                            );
                            if (clienteEncontrado) {
                                cliente = clienteEncontrado;
                                console.log('✅ Cliente encontrado en lista:', cliente);
                            } else {
                                console.warn('⚠️ Cliente no encontrado en la base de datos');
                            }
                        }
                    } catch (err) {
                        console.error('Error al buscar en lista de clientes:', err);
                    }
                }
            } catch (error) {
                console.error('❌ Error al obtener cliente:', error);
            }
        } else {
            console.warn('⚠️ El servicio no tiene cliente_id');
        }

        // Obtener datos del equipo
        let equipo = { tipo_equipo: 'N/A', marca: 'N/A', modelo: 'N/A' };
        if (servicio.equipo_id) {
            try {
                const equipoRes = await fetch(`${API_EQUIPOS}/${servicio.equipo_id}`);
                if (equipoRes.ok) {
                    equipo = await equipoRes.json();
                    console.log('✅ Equipo obtenido:', equipo);
                    
                    // Si no se encontró cliente pero el equipo tiene cliente_id, intentar obtenerlo
                    if (cliente.nombre === 'N/A' && equipo.cliente_id) {
                        console.log('🔍 Intentando obtener cliente desde equipo:', equipo.cliente_id);
                        try {
                            const clienteDesdeEquipoRes = await fetch(`${API_CLIENTES}/${equipo.cliente_id}`);
                            if (clienteDesdeEquipoRes.ok) {
                                cliente = await clienteDesdeEquipoRes.json();
                                console.log('✅ Cliente obtenido desde equipo:', cliente);
                            }
                        } catch (err) {
                            console.error('Error al obtener cliente desde equipo:', err);
                        }
                    }
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
        
        // Establecer el monto a cobrar hoy como el saldo pendiente por defecto
        document.getElementById('entMontoCobraHoy').value = saldoPendiente.toFixed(2);
        document.getElementById('entMontoCobraHoy').max = saldoPendiente.toFixed(2);
        
        // Actualizar indicador de deuda inicial
        actualizarIndicadorDeuda();

        // Limpiar otros campos
        document.getElementById('entEncargado').value = '';
        document.getElementById('entEstadoEquipo').value = '';
        document.getElementById('entObservaciones').value = '';
        document.getElementById('entMetodoPago').value = '';
        document.getElementById('entComprobante').value = '';
        document.getElementById('entRecomendaciones').value = '';

        // Limpiar fotos previas si la función existe
        limpiarFotosEntrega();
        
        // Inicializar contador de fotos
        actualizarContadorFotosEntrega();

        document.getElementById('modalEntregaServicio').classList.add('show');
        console.log('✅ Modal de entrega abierto');
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error al abrir modal de entrega: ' + error.message);
    }
}

/**
 * Cerrar modal de entrega
 */
export function cerrarModalEntrega() {
    const modal = document.getElementById('modalEntregaServicio');
    if (modal) {
        modal.classList.remove('show');
    }
    window.servicioEnEntrega = null;
    console.log('✅ Modal de entrega cerrado');
}

/**
 * Recalcular saldo en entrega
 */
export function recalcularSaldoEntrega() {
    const montoTotal = parseFloat(document.getElementById('entMontoTotal').textContent || 0);
    const pagadoHasta = parseFloat(document.getElementById('entPagadoHasta').textContent || 0);
    const montoCobraHoy = parseFloat(document.getElementById('entMontoCobraHoy').value || 0);
    
    const totalPagado = pagadoHasta + montoCobraHoy;
    const saldoFinal = montoTotal - totalPagado;
    
    document.getElementById('entSaldoPendiente').textContent = Math.max(0, saldoFinal).toFixed(2);
}

/**
 * Actualizar indicador visual de deuda
 */
export function actualizarIndicadorDeuda() {
    if (!window.servicioEnEntrega) return;
    
    const montoTotal = parseFloat(window.servicioEnEntrega.monto || 0);
    const adelantoPrevio = parseFloat(window.servicioEnEntrega.adelanto || 0);
    const saldoPendiente = montoTotal - adelantoPrevio;
    const montoCobraHoy = parseFloat(document.getElementById('entMontoCobraHoy').value || 0);
    
    const nuevoSaldo = saldoPendiente - montoCobraHoy;
    const indicador = document.getElementById('indicadorDeuda');
    const sugerencia = document.getElementById('sugerenciaPago');
    const inputMonto = document.getElementById('entMontoCobraHoy');
    
    if (!indicador || !sugerencia || !inputMonto) return;
    
    if (montoCobraHoy > saldoPendiente) {
        // Monto excede el saldo
        indicador.style.display = 'block';
        indicador.style.background = '#FFEBEE';
        indicador.style.color = '#C62828';
        indicador.style.border = '2px solid #F44336';
        indicador.innerHTML = '<i class="fas fa-exclamation-triangle"></i> El monto excede el saldo pendiente';
        inputMonto.style.borderColor = '#F44336';
        inputMonto.style.borderWidth = '2px';
    } else if (nuevoSaldo === 0 && montoCobraHoy > 0) {
        // Deuda saldada
        indicador.style.display = 'block';
        indicador.style.background = '#E8F5E9';
        indicador.style.color = '#2E7D32';
        indicador.style.border = '2px solid #4CAF50';
        indicador.innerHTML = '<i class="fas fa-check-circle"></i> DEUDA SALDADA - Cliente no deberá nada';
        inputMonto.style.borderColor = '#4CAF50';
        inputMonto.style.borderWidth = '2px';
        sugerencia.innerHTML = '<i class="fas fa-check"></i> Pagando el saldo completo';
        sugerencia.style.color = '#2E7D32';
    } else if (nuevoSaldo > 0 && montoCobraHoy > 0) {
        // Pago parcial
        indicador.style.display = 'block';
        indicador.style.background = '#FFF3E0';
        indicador.style.color = '#E65100';
        indicador.style.border = '2px solid #FF9800';
        indicador.innerHTML = `<i class="fas fa-exclamation-circle"></i> QUEDARÁ DEUDA PENDIENTE: S/ ${nuevoSaldo.toFixed(2)}`;
        inputMonto.style.borderColor = '#FF9800';
        inputMonto.style.borderWidth = '2px';
        sugerencia.innerHTML = `<i class="fas fa-info-circle"></i> Falta por cobrar: S/ ${nuevoSaldo.toFixed(2)}`;
        sugerencia.style.color = '#E65100';
    } else if (montoCobraHoy === 0) {
        // No paga nada
        indicador.style.display = 'block';
        indicador.style.background = '#FFEBEE';
        indicador.style.color = '#C62828';
        indicador.style.border = '2px solid #F44336';
        indicador.innerHTML = `<i class="fas fa-times-circle"></i> NO SE COBRA HOY - Deuda total: S/ ${saldoPendiente.toFixed(2)}`;
        inputMonto.style.borderColor = '#ddd';
        inputMonto.style.borderWidth = '1px';
        sugerencia.innerHTML = `<i class="fas fa-wallet"></i> Saldo pendiente: S/ ${saldoPendiente.toFixed(2)}`;
        sugerencia.style.color = '#F57C00';
    }
}

/**
 * Confirmar entrega del servicio
 */
export async function confirmarEntregaServicio() {
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
        if (window.mostrarModalErrorValidacion) {
            window.mostrarModalErrorValidacion();
        }
        return;
    }

    try {
        // Subir fotos a Cloudinary si hay
        let fotosUrls = [];
        const fotos = obtenerFotosEntrega();
        if (fotos && fotos.length > 0) {
            try {
                fotosUrls = await subirFotosEntregaACloudinary();
            } catch (error) {
                console.error('Error al subir fotos:', error);
                alert('Error al subir fotos: ' + error.message);
                return;
            }
        }

        // Validar monto a cobrar
        const montoCobraHoy = parseFloat(document.getElementById('entMontoCobraHoy').value || 0);
        const montoTotal = parseFloat(window.servicioEnEntrega.monto || 0);
        const adelantoPrevio = parseFloat(window.servicioEnEntrega.adelanto || 0);
        const saldoPendiente = montoTotal - adelantoPrevio;
        
        // Validar que no exceda el saldo
        if (montoCobraHoy > saldoPendiente) {
            alert(`❌ El monto no puede exceder el saldo pendiente de S/ ${saldoPendiente.toFixed(2)}`);
            document.getElementById('entMontoCobraHoy').focus();
            return;
        }
        
        // Calcular nuevo adelanto y saldo
        const nuevoAdelanto = adelantoPrevio + montoCobraHoy;
        const nuevoSaldo = montoTotal - nuevoAdelanto;
        
        // Determinar estado de pago
        let estadoPago = 'pendiente';
        if (nuevoSaldo === 0) {
            estadoPago = 'pagado';
        } else if (nuevoAdelanto > 0) {
            estadoPago = 'parcial';
        }

        // Recopilar todos los datos de entrega
        const datosEntrega = {
            fechaEntrega: fechaEntrega,
            horaEntrega: horaEntrega,
            encargadoEntrega: encargadoEntrega,
            estadoEquipo: estadoEquipo,
            observacionesEntrega: document.getElementById('entObservaciones').value.trim(),
            fotos: fotosUrls,
            
            // DATOS FINANCIEROS
            montoCobraHoy: montoCobraHoy,
            metodoPago: document.getElementById('entMetodoPago').value,
            nuevoAdelanto: nuevoAdelanto,
            nuevoSaldo: nuevoSaldo,
            estadoPago: estadoPago,
            
            comprobanteEntrega: document.getElementById('entComprobante').value.trim(),
            garantiaHasta: document.getElementById('entGarantia').value,
            recomendaciones: document.getElementById('entRecomendaciones').value.trim()
        };

        // Convertir a JSON para almacenar
        const datosEntregaJSON = JSON.stringify(datosEntrega);

        console.log('💾 Confirmando entrega:', datosEntrega);

        // Cambiar estado a 'Entregado' pasando datos de entrega
        await cambiarEstadoServicio(window.servicioEnEntrega.id, 'Entregado', datosEntregaJSON);
        
        // Limpiar fotos
        limpiarFotosEntrega();
        
        cerrarModalEntrega();
        
        // Mostrar notificación según resultado financiero
        if (nuevoSaldo === 0) {
            mostrarNotificacionExito('✅ Servicio entregado - Deuda saldada completamente');
        } else if (montoCobraHoy > 0) {
            mostrarNotificacionAdvertencia(`⚠️ Servicio entregado - Deuda pendiente: S/ ${nuevoSaldo.toFixed(2)}`);
        } else {
            mostrarNotificacionAdvertencia(`⚠️ Servicio entregado - Deuda total: S/ ${nuevoSaldo.toFixed(2)}`);
        }
        
        // Recargar servicios
        if (window.cargarServicios) {
            window.cargarServicios();
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error al confirmar entrega: ' + error.message);
    }
}

// ==================== FUNCIONES DE FOTOS DE ENTREGA ====================

let fotosEntregaArray = [];
const MAX_FOTOS_ENTREGA = 3;
let streamCamaraEntrega = null;

/**
 * Comprimir imagen
 */
function comprimirImagen(file, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Agregar foto de entrega desde archivo
 */
export async function agregarFotoEntrega(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';

    if (!file.type.startsWith('image/')) {
        mostrarModalNotificacion('Selecciona una imagen válida', 'warning');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        mostrarModalNotificacion('La imagen es muy grande (máx. 10MB)', 'warning');
        return;
    }
    if (fotosEntregaArray.length >= MAX_FOTOS_ENTREGA) {
        mostrarModalNotificacion(`Máximo ${MAX_FOTOS_ENTREGA} fotos permitidas`, 'warning');
        return;
    }

    try {
        const base64 = await comprimirImagen(file, 1200, 0.7);
        fotosEntregaArray.push({ base64, url: null, public_id: null });
        renderFotosEntregaPreview();
        actualizarContadorFotosEntrega();
    } catch (error) {
        console.error('Error al procesar imagen:', error);
        mostrarModalNotificacion('Error al procesar la imagen', 'error');
    }
}

/**
 * Abrir cámara para capturar foto de entrega
 */
export async function abrirCamaraEntrega() {
    if (fotosEntregaArray.length >= MAX_FOTOS_ENTREGA) {
        mostrarModalNotificacion(`Máximo ${MAX_FOTOS_ENTREGA} fotos permitidas`, 'warning');
        return;
    }

    const modal = document.getElementById('modalCamaraEntrega');
    const video = document.getElementById('videoCamaraEntrega');

    try {
        streamCamaraEntrega = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = streamCamaraEntrega;
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        mostrarModalNotificacion('No se pudo acceder a la cámara', 'error');
    }
}

/**
 * Cerrar cámara de entrega
 */
export function cerrarCamaraEntrega() {
    const modal = document.getElementById('modalCamaraEntrega');
    const video = document.getElementById('videoCamaraEntrega');

    if (streamCamaraEntrega) {
        streamCamaraEntrega.getTracks().forEach(track => track.stop());
        streamCamaraEntrega = null;
    }
    video.srcObject = null;
    modal.style.display = 'none';
}

/**
 * Capturar foto desde la cámara de entrega
 */
export async function capturarFotoEntrega() {
    const video = document.getElementById('videoCamaraEntrega');
    const canvas = document.getElementById('canvasCamaraEntrega');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    
    fotosEntregaArray.push({ base64, url: null, public_id: null });
    renderFotosEntregaPreview();
    actualizarContadorFotosEntrega();
    cerrarCamaraEntrega();
}

/**
 * Actualizar contador de fotos de entrega
 */
export function actualizarContadorFotosEntrega() {
    const numeroFotos = document.getElementById('numeroFotosEntrega');
    if (numeroFotos) {
        numeroFotos.textContent = fotosEntregaArray.length;
    }
}

/**
 * Renderizar preview de fotos de entrega
 */
function renderFotosEntregaPreview() {
    const container = document.getElementById('fotosEntregaContainer');
    if (!container) return;
    
    container.innerHTML = '';

    fotosEntregaArray.forEach((foto, i) => {
        const div = document.createElement('div');
        div.style.cssText = 'position: relative; width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 2px solid #ddd;';
        div.innerHTML = `
            <img src="${foto.base64}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="abrirImagenCompletaEntrega('${foto.base64.replace(/'/g, "\\'")}')">
            <button type="button" onclick="eliminarFotoEntrega(${i})" style="position: absolute; top: 4px; right: 4px; background: #d32f2f; color: white; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                <i class="fas fa-times"></i>
            </button>
            ${foto.url ? '<i class="fas fa-cloud" style="position: absolute; bottom: 4px; right: 4px; color: #4CAF50; font-size: 12px; background: white; padding: 4px; border-radius: 50%;"></i>' : ''}
        `;
        container.appendChild(div);
    });
}

/**
 * Eliminar foto de entrega
 */
export function eliminarFotoEntrega(index) {
    fotosEntregaArray.splice(index, 1);
    renderFotosEntregaPreview();
    actualizarContadorFotosEntrega();
}

/**
 * Limpiar todas las fotos de entrega
 */
export function limpiarFotosEntrega() {
    fotosEntregaArray = [];
    renderFotosEntregaPreview();
    actualizarContadorFotosEntrega();
}

/**
 * Abrir imagen completa de entrega
 */
export function abrirImagenCompletaEntrega(src) {
    const modal = document.createElement('div');
    modal.id = 'modalImagenCompletaEntrega';
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; justify-content: center; align-items: center;';
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <img src="${src}" style="max-width: 100%; max-height: 90vh; border-radius: 8px;">
            <button onclick="cerrarImagenCompletaEntrega()" style="position: absolute; top: -40px; right: 0; background: white; color: #333; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center;">
                ×
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarImagenCompletaEntrega();
        }
    });
}

/**
 * Cerrar imagen completa de entrega
 */
export function cerrarImagenCompletaEntrega() {
    const modal = document.getElementById('modalImagenCompletaEntrega');
    if (modal) {
        modal.remove();
    }
}

/**
 * Subir fotos de entrega a Cloudinary
 */
export async function subirFotosEntregaACloudinary() {
    const fotasSinSubir = fotosEntregaArray.filter(f => !f.url);
    if (fotasSinSubir.length === 0) {
        return fotosEntregaArray.map(f => ({ url: f.url, public_id: f.public_id }));
    }

    const resultados = [];
    for (let i = 0; i < fotosEntregaArray.length; i++) {
        const foto = fotosEntregaArray[i];
        if (foto.url) {
            resultados.push({ url: foto.url, public_id: foto.public_id });
            continue;
        }
        try {
            const res = await fetch(`${API_URL}/api/upload-imagen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imagen: foto.base64, carpeta: 'entregas' })
            });
            if (!res.ok) throw new Error('Error al subir imagen');
            const data = await res.json();
            foto.url = data.url;
            foto.public_id = data.public_id;
            resultados.push({ url: data.url, public_id: data.public_id });
        } catch (error) {
            console.error(`Error subiendo foto ${i + 1}:`, error);
            throw new Error(`Error al subir foto ${i + 1}`);
        }
    }
    return resultados;
}

/**
 * Obtener fotos de entrega
 */
export function obtenerFotosEntrega() {
    return fotosEntregaArray;
}
