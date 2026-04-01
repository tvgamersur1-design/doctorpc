// ==================== MÓDULO DE SERVICIOS ====================

import { API_CLIENTES, API_SERVICIOS, API_EQUIPOS, API_SERVICIO_EQUIPO } from '../config.js';
import { mostrarModalCarga, cerrarModalCarga, mostrarNotificacionExito } from '../ui.js';
import { formatearFecha, formatearMoneda } from '../utils.js';
import { getJSON, postJSON, putJSON } from '../api.js';

// ==================== ESTADO DEL MÓDULO ====================

let serviciosCache = [];
let serviciosPaginaActual = 1;
let serviciosBusquedaActual = '';
let serviciosLimitePorPagina = 10;
let serviciosBusquedaTimer = null;
let servicioParaGuardar = null;

// ==================== FUNCIONES PÚBLICAS ====================

/**
 * Cargar servicios con paginación y búsqueda
 */
export async function cargarServicios(page = 1, busqueda = '') {
    serviciosPaginaActual = page;
    serviciosBusquedaActual = busqueda;
    const container = document.getElementById('serviciosContainer');
    container.innerHTML = `
        <div class="loading-spinner-inline">
            <div class="loading-spinner-circle"></div>
            <p class="loading-spinner-text">Cargando servicios...</p>
        </div>`;
    try {
        const clientesRes = await fetch(`${API_CLIENTES}`);
        const clientes = await clientesRes.json();

        const equiposRes = await fetch(`${API_EQUIPOS}`);
        const equipos = await equiposRes.json();

        // Verificar si se deben incluir servicios cancelados
        const checkbox = document.getElementById('mostrarCancelados');
        const mostrarCancelados = checkbox ? checkbox.checked : false;
        
        // Construir URL con paginación y búsqueda
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', serviciosLimitePorPagina);
        if (mostrarCancelados) params.set('incluir_cancelados', 'true');
        if (busqueda) params.set('q', busqueda);
        
        const serviciosRes = await fetch(`${API_SERVICIOS}?${params.toString()}`);
        const respuesta = await serviciosRes.json();
        
        // Soporte para respuesta paginada o array directo
        const servicios = respuesta.data || respuesta;
        const pagination = respuesta.pagination || null;

        const servicioEquipoRes = await fetch(`${API_SERVICIO_EQUIPO}`);
        const serviciosEquipo = await servicioEquipoRes.json();

        if (servicios.length === 0) {
            let mensajeVacio = busqueda 
                ? `<div class="no-records">No se encontraron servicios para "<strong>${busqueda}</strong>"</div>`
                : '<div class="no-records">No hay servicios registrados</div>';
            container.innerHTML = renderBarraBusquedaServicios(busqueda) + mensajeVacio;
            if (pagination) container.innerHTML += renderPaginacionServicios(pagination);
            return;
        }

        let html = renderBarraBusquedaServicios(busqueda);

        html += `
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
                case 'Cancelado':
                    estadoBadge += '<i class="fas fa-ban" style="color: #721C24;"></i> Cancelado</span>';
                    estadoBadge = '<span style="background: #F8D7DA; color: #721C24;' + estadoBadge.slice(6);
                    break;
                case 'Diagnosticado':
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
            const problemasRaw = srv.problemas_reportados || srv.problemas || '';
            const problemasTexto = Array.isArray(problemasRaw) ? problemasRaw.join(', ') : String(problemasRaw);
            const descripcionStr = problemasTexto ? problemasTexto.substring(0, 40) + (problemasTexto.length > 40 ? '...' : '') : 'N/A';
            
            const estadoNormalizado = (srv.estado || '').trim();

            html += `
                <tr class="row-servicio" data-numero="${srv.numero_servicio}" data-cliente="${cliente ? cliente.nombre.toLowerCase() : ''}" 
                    data-estado="${srv.estado.toLowerCase()}" data-equipo="${equipoStr.toLowerCase()}" data-problemas="${problemasTexto.toLowerCase()}" data-local="${(srv.local || '').toLowerCase()}">
                    <td data-label="Número"><strong>${srv.numero_servicio || 'N/A'}</strong></td>
                    <td data-label="Fecha">${new Date(srv.fecha).toLocaleDateString('es-PE')}</td>
                    <td data-label="Local"><span style="padding: 4px 8px; border-radius: 4px; font-weight: 600; ${srv.local === 'Ferreñafe' ? 'background: #C8E6C9; color: #2E7D32;' : 'background: #BBDEFB; color: #1565C0;'}">${srv.local || 'N/A'}</span></td>
                    <td data-label="Cliente">${cliente ? cliente.nombre : 'N/A'}</td>
                    <td data-label="Equipo">${equipoStr}</td>
                    <td data-label="Descripción" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${problemasTexto}">${descripcionStr}</td>
                    <td data-label="Estado">${estadoBadge}</td>
                    <td data-label="Costo Total"><strong>${costoTotal > 0 ? '$' + costoTotal.toFixed(2) : '-'}</strong></td>
                    <td data-label="Acciones" class="actions">
                        <button class="btn-edit" onclick="abrirModalDetallesServicio('${srv._id}')" style="padding: 6px 12px; font-size: 12px;" title="Ver todos los detalles">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        ${estadoNormalizado === 'Pendiente' || estadoNormalizado === 'Pendiente de evaluación' ?
                    `<button class="btn-primary" onclick="abrirModalDiagnostico('${srv._id}', '${cliente ? cliente.nombre : 'N/A'}')" style="padding: 6px 12px; font-size: 12px;" title="Diagnosticar">
                                <i class="fas fa-stethoscope"></i>
                            </button>` :
                    estadoNormalizado === 'En diagnóstico' ?
                    `<button class="btn-success" onclick="abrirModalDiagnostico('${srv._id}', '${cliente ? cliente.nombre : 'N/A'}')" style="padding: 6px 12px; font-size: 12px; background: #4CAF50; border-color: #4CAF50;" title="Continuar diagnóstico">
                                <i class="fas fa-stethoscope"></i>
                            </button>` :
                    estadoNormalizado === 'Diagnosticado' ?
                    `<button class="btn-info" onclick="verDiagnostico('${srv._id}')" style="padding: 6px 12px; font-size: 12px; background: #2196F3; border-color: #2196F3;" title="Ver diagnóstico">
                                <i class="fas fa-eye"></i>
                            </button>` :
                    estadoNormalizado !== 'Cancelado' && estadoNormalizado !== 'Entregado' ?
                    `<button class="btn-warning" onclick="abrirModalCambiarEstado('${srv._id}')" style="padding: 6px 12px; font-size: 12px; background: #FF9800; border-color: #FF9800; color: white;" title="Cambiar estado">
                                <i class="fas fa-arrow-right"></i>
                            </button>` : ''
                    }
                        ${estadoNormalizado !== 'Cancelado' && estadoNormalizado !== 'Entregado' ?
                    `<button class="btn-danger" onclick="abrirModalCancelarServicio('${srv._id}')" style="padding: 6px 12px; font-size: 12px;" title="Cancelar servicio">
                                <i class="fas fa-ban"></i>
                            </button>` : ''
                    }
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        
        // Agregar controles de paginación
        if (pagination) {
            html += renderPaginacionServicios(pagination);
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="error-message">Error al cargar servicios</div>';
    }
}

/**
 * Abrir modal para nuevo servicio
 */
export async function abrirModalNuevoServicio() {
    try {
        document.getElementById('modalNuevoServicio').classList.add('show');
        document.getElementById('formServicio').reset();

        // Generar número de servicio secuencial
        const numeroServicio = await generarNumeroSecuencial();
        document.getElementById('numeroServicio').value = numeroServicio;

        // Establecer fecha actual
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('fechaServicio').value = hoy;

        // Establecer hora actual y actualizar automáticamente
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

        // Limpiar selección de cliente
        document.getElementById('cliente_id').value = '';
        document.getElementById('clienteSeleccionado').value = '';

        document.getElementById('btnBuscarEquipo').disabled = false;

        // Limpiar selección de equipo
        document.getElementById('equipo_id').value = '';
        document.getElementById('equipoSeleccionado').value = '';
        window.clienteIdActual = null;

        // Agregar listeners para prevenir valores negativos en tiempo real
        const adelantoInput = document.querySelector('input[name="adelanto"]');
        const montoInput = document.querySelector('input[name="monto"]');
        
        if (adelantoInput) {
            adelantoInput.addEventListener('input', function() {
                if (this.value && parseFloat(this.value) < 0) {
                    this.value = 0;
                }
            });
        }
        
        if (montoInput) {
            montoInput.addEventListener('input', function() {
                if (this.value && parseFloat(this.value) < 0) {
                    this.value = 0;
                }
            });
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al abrir modal de nuevo servicio');
    }
}

/**
 * Cerrar modal nuevo servicio
 */
export function cerrarModalNuevoServicio() {
    // Detener la actualización automática de hora
    if (window.actualizadorHora) {
        clearInterval(window.actualizadorHora);
        window.actualizadorHora = null;
    }
    
    document.getElementById('modalNuevoServicio').classList.remove('show');
    document.getElementById('formServicio').reset();
}

/**
 * Guardar servicio (validar y mostrar resumen)
 */
export async function guardarServicio(e) {
    e.preventDefault();
    const formData = new FormData(document.getElementById('formServicio'));
    const servicio = Object.fromEntries(formData);

    // Validación: Evitar valores negativos en Adelanto y Monto Total
    const adelanto = parseFloat(servicio.adelanto) || 0;
    const monto = parseFloat(servicio.monto) || 0;
    
    if (adelanto < 0) {
        alert('⚠️ El adelanto no puede ser negativo');
        return;
    }
    
    if (monto < 0) {
        alert('⚠️ El monto total no puede ser negativo');
        return;
    }

    // Asegurar que equipo_id se incluye aunque esté vacío
    if (!servicio.equipo_id) {
        servicio.equipo_id = document.getElementById('equipo_id').value || null;
    }

    console.log('Servicio a guardar:', servicio);

    // Validar equipo antes de guardar
    const equipoId = document.getElementById('equipo_id').value;
    if (equipoId && !(await validarEquipo(equipoId))) {
        return;
    }

    // Validar hora de servicio antes de guardar
    if (!validarHoraServicio()) {
        return;
    }

    // Agregar estado inicial
    servicio.estado = 'Pendiente de evaluación';

    // Mostrar resumen antes de guardar
    await mostrarResumenServicio(servicio);
}

/**
 * Guardar servicio real (después de confirmación)
 */
export async function guardarServicioReal(servicio) {
    try {
        mostrarModalCarga('Guardando...');
        
        // Guardar servicio
        const servicioRes = await fetch(`${API_SERVICIOS}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(servicio)
        });

        if (!servicioRes.ok) {
            const errorData = await servicioRes.json();
            cerrarModalCarga();
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
                cerrarModalCarga();
                throw new Error(`Error al guardar servicio-equipo: ${errorData.error}`);
            }
            
            console.log('✅ Servicio-equipo guardado');
        }

        // Cerrar modal de resumen
        cerrarModalResumen();
        
        // Cerrar modal de carga
        cerrarModalCarga();
        
        // Limpiar formulario
        document.getElementById('formServicio').reset();
        
        // Cerrar modal de nuevo servicio
        cerrarModalNuevoServicio();
        
        // Mostrar notificación de éxito
        mostrarNotificacionExito('Servicio guardado');

        // Recargar servicios
        cargarServicios();
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al guardar servicio: ' + error.message);
    }
}

/**
 * Buscar servicios con debounce
 */
export function buscarServiciosConDebounce() {
    clearTimeout(serviciosBusquedaTimer);
    serviciosBusquedaTimer = setTimeout(() => {
        const texto = document.getElementById('busquedaServicios').value.trim();
        cargarServicios(1, texto);
    }, 400);
}

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Generar número de servicio secuencial
 */
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

/**
 * Validar equipo antes de guardar
 */
async function validarEquipo(equipoId) {
    try {
        const response = await fetch(`${API_EQUIPOS}/${equipoId}`);
        if (!response.ok) {
            alert('⚠️ El equipo seleccionado no existe o fue eliminado');
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error al validar equipo:', error);
        return false;
    }
}

/**
 * Validar hora de servicio
 */
function validarHoraServicio() {
    const horaInput = document.getElementById('horaServicio');
    if (!horaInput || !horaInput.value) {
        return true; // Si no hay campo de hora, continuar
    }
    
    // Validar formato HH:MM
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!regex.test(horaInput.value)) {
        alert('⚠️ Formato de hora inválido. Use HH:MM (ejemplo: 14:30)');
        return false;
    }
    
    return true;
}

/**
 * Mostrar resumen del servicio antes de guardar
 */
async function mostrarResumenServicio(servicio) {
    try {
        // Inicializar objetos por defecto
        let cliente = { nombre: 'N/A', dni: 'N/A', telefono: 'N/A', email: 'N/A' };
        let equipo = { tipo_equipo: 'N/A', marca: 'N/A', modelo: 'N/A', serie: 'N/A' };
        
        // Usar IDs como strings (son ObjectId de MongoDB, no números)
        const clienteId = servicio.cliente_id ? servicio.cliente_id : null;
        const equipoId = servicio.equipo_id ? servicio.equipo_id : null;
        
        // Intentar usar datos del cliente en memoria primero
        if (clienteId && window.clienteSeleccionadoTemp && window.clienteSeleccionadoTemp._id === clienteId) {
            cliente = window.clienteSeleccionadoTemp;
        } else if (clienteId) {
            // Obtener datos del cliente si existe
            try {
                const clienteRes = await fetch(`${API_CLIENTES}/${clienteId}`);
                if (clienteRes.ok) {
                    cliente = await clienteRes.json();
                } else {
                    console.warn('Cliente no encontrado:', clienteId);
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

        // Intentar usar datos del equipo en memoria primero
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
                            <p><strong>Adelanto:</strong> ${parseFloat(servicio.adelanto || 0).toFixed(2)}</p>
                            <p><strong>Monto Total:</strong> <span style="color: #2192B8; font-weight: bold; font-size: 16px;">${parseFloat(servicio.monto || 0).toFixed(2)}</span></p>
                            <p><strong>Saldo:</strong> ${(parseFloat(servicio.monto || 0) - parseFloat(servicio.adelanto || 0)).toFixed(2)}</p>
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
        servicioParaGuardar = servicio;
        window.servicioParaGuardar = servicio;
    } catch (error) {
        console.error('Error:', error);
        alert('Error al mostrar resumen: ' + error.message);
    }
}

/**
 * Confirmar guardar servicio
 */
export function confirmarGuardarServicio() {
    guardarServicioReal(servicioParaGuardar || window.servicioParaGuardar);
}

/**
 * Cerrar modal de resumen
 */
export function cerrarModalResumen() {
    const modal = document.getElementById('modalResumen');
    if (modal) modal.remove();
}

/**
 * Renderizar barra de búsqueda
 */
function renderBarraBusquedaServicios(busquedaActual) {
    return `
        <div style="margin-bottom: 20px; position: relative;">
            <i class="fas fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #2192B8; font-size: 14px; pointer-events: none;"></i>
            <input type="text" id="busquedaServicios" placeholder="Buscar por número, descripción, local..." 
                   value="${busquedaActual || ''}"
                   onkeyup="buscarServiciosConDebounce()" style="max-width: 100%; padding: 12px 15px 12px 40px; font-size: 14px; border: 2px solid #e0e0e0; border-radius: 8px; width: 100%;">
        </div>`;
}

/**
 * Renderizar paginación
 */
function renderPaginacionServicios(pagination) {
    if (!pagination || pagination.totalPages <= 1) return '';
    
    let html = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;">
            <button onclick="cargarServicios(1, serviciosBusquedaActual)" 
                    ${pagination.page <= 1 ? 'disabled' : ''} 
                    style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; background: ${pagination.page <= 1 ? '#f5f5f5' : 'white'}; cursor: ${pagination.page <= 1 ? 'default' : 'pointer'}; font-size: 13px;">
                <i class="fas fa-angle-double-left"></i>
            </button>
            <button onclick="cargarServicios(${pagination.page - 1}, serviciosBusquedaActual)" 
                    ${pagination.page <= 1 ? 'disabled' : ''} 
                    style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; background: ${pagination.page <= 1 ? '#f5f5f5' : 'white'}; cursor: ${pagination.page <= 1 ? 'default' : 'pointer'}; font-size: 13px;">
                <i class="fas fa-angle-left"></i> Anterior
            </button>`;
    
    // Mostrar números de página
    const inicio = Math.max(1, pagination.page - 2);
    const fin = Math.min(pagination.totalPages, pagination.page + 2);
    
    for (let i = inicio; i <= fin; i++) {
        const esActual = i === pagination.page;
        html += `
            <button onclick="cargarServicios(${i}, serviciosBusquedaActual)" 
                    style="padding: 8px 14px; border: 1px solid ${esActual ? '#2192B8' : '#ddd'}; border-radius: 6px; background: ${esActual ? '#2192B8' : 'white'}; color: ${esActual ? 'white' : '#333'}; cursor: pointer; font-weight: ${esActual ? '700' : '400'}; font-size: 13px;">
                ${i}
            </button>`;
    }
    
    html += `
            <button onclick="cargarServicios(${pagination.page + 1}, serviciosBusquedaActual)" 
                    ${pagination.page >= pagination.totalPages ? 'disabled' : ''} 
                    style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; background: ${pagination.page >= pagination.totalPages ? '#f5f5f5' : 'white'}; cursor: ${pagination.page >= pagination.totalPages ? 'default' : 'pointer'}; font-size: 13px;">
                Siguiente <i class="fas fa-angle-right"></i>
            </button>
            <button onclick="cargarServicios(${pagination.totalPages}, serviciosBusquedaActual)" 
                    ${pagination.page >= pagination.totalPages ? 'disabled' : ''} 
                    style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; background: ${pagination.page >= pagination.totalPages ? '#f5f5f5' : 'white'}; cursor: ${pagination.page >= pagination.totalPages ? 'default' : 'pointer'}; font-size: 13px;">
                <i class="fas fa-angle-double-right"></i>
            </button>
            <span style="margin-left: 12px; color: #666; font-size: 13px;">
                Página ${pagination.page} de ${pagination.totalPages} (${pagination.total} registros)
            </span>
        </div>`;
    return html;
}
