// ==================== MÓDULO DE SERVICIOS ====================

import { API_CLIENTES, API_SERVICIOS, API_EQUIPOS, API_SERVICIO_EQUIPO, API_BASE } from '../config.js';
import { mostrarModalCarga, cerrarModalCarga, mostrarNotificacionExito } from '../ui.js';
import { formatearFecha, formatearMoneda } from '../utils.js';
import { getJSON, postJSON, putJSON } from '../api.js';

// ==================== ESTADO DEL MÓDULO ====================

export let serviciosCache = [];
let clientesCache = [];
let equiposCache = [];
let serviciosEquipoCache = [];
let serviciosPaginaActual = 1;
let serviciosBusquedaActual = '';
let serviciosLimitePorPagina = 10;
let serviciosBusquedaTimer = null;
let servicioParaGuardar = null;

// ==================== FUNCIONES PÚBLICAS ====================

/**
 * Cargar servicios con paginación y búsqueda
 */
export async function cargarServicios(page = 1, busqueda = '', forzarRecarga = false) {
    serviciosPaginaActual = page;
    serviciosBusquedaActual = busqueda;
    const container = document.getElementById('serviciosContainer');
    
    // Solo mostrar spinner si es una recarga forzada
    if (forzarRecarga) {
        container.innerHTML = `
            <div class="loading-spinner-inline">
                <div class="loading-spinner-circle"></div>
                <p class="loading-spinner-text">Cargando servicios...</p>
            </div>`;
    }
    
    try {
        // Cargar datos solo si no están en caché o si se fuerza la recarga
        if (forzarRecarga || serviciosCache.length === 0) {
            const clientesRes = await fetch(`${API_CLIENTES}`);
            clientesCache = await clientesRes.json();

            const equiposRes = await fetch(`${API_EQUIPOS}`);
            equiposCache = await equiposRes.json();

            // Verificar si se deben incluir servicios cancelados
            const checkbox = document.getElementById('mostrarCancelados');
            const mostrarCancelados = checkbox ? checkbox.checked : false;
            
            // Cargar TODOS los servicios sin paginación
            const params = new URLSearchParams();
            if (mostrarCancelados) params.set('incluir_cancelados', 'true');
            
            const serviciosRes = await fetch(`${API_SERVICIOS}?${params.toString()}`);
            const respuesta = await serviciosRes.json();
            
            // Soporte para respuesta paginada o array directo
            serviciosCache = respuesta.data || respuesta;

            const servicioEquipoRes = await fetch(`${API_SERVICIO_EQUIPO}`);
            serviciosEquipoCache = await servicioEquipoRes.json();
        }
        
        // Filtrar servicios localmente
        let serviciosFiltrados = serviciosCache;
        if (busqueda) {
            const busquedaLower = busqueda.toLowerCase();
            serviciosFiltrados = serviciosCache.filter(srv => {
                const cliente = clientesCache.find(c => c._id == srv.cliente_id);
                const clienteNombre = cliente ? cliente.nombre.toLowerCase() : '';
                
                // Buscar equipo
                let equipo = null;
                if (srv.equipo_id) {
                    equipo = equiposCache.find(e => e._id == srv.equipo_id);
                }
                if (!equipo) {
                    const servicioEquipo = serviciosEquipoCache.find(se => se.servicio_id == srv._id);
                    if (servicioEquipo) {
                        equipo = equiposCache.find(e => e._id == servicioEquipo.equipo_id);
                    }
                }
                const equipoStr = equipo ? `${equipo.tipo_equipo} ${equipo.marca || ''}`.toLowerCase() : '';
                
                // Problemas reportados
                const problemasRaw = srv.problemas_reportados || srv.problemas || '';
                const problemasTexto = Array.isArray(problemasRaw) ? problemasRaw.join(' ') : String(problemasRaw);
                const problemasLower = problemasTexto.toLowerCase();
                
                return (
                    (srv.numero_servicio && srv.numero_servicio.toLowerCase().includes(busquedaLower)) ||
                    (srv.descripcion && srv.descripcion.toLowerCase().includes(busquedaLower)) ||
                    (srv.local && srv.local.toLowerCase().includes(busquedaLower)) ||
                    clienteNombre.includes(busquedaLower) ||
                    equipoStr.includes(busquedaLower) ||
                    problemasLower.includes(busquedaLower)
                );
            });
        }
        
        // Calcular paginación local
        const totalServicios = serviciosFiltrados.length;
        const totalPages = Math.ceil(totalServicios / serviciosLimitePorPagina);
        const inicio = (page - 1) * serviciosLimitePorPagina;
        const fin = inicio + serviciosLimitePorPagina;
        const servicios = serviciosFiltrados.slice(inicio, fin);
        
        const pagination = {
            page: page,
            limit: serviciosLimitePorPagina,
            total: totalServicios,
            totalPages: totalPages
        };
        
        const clientes = clientesCache;
        const equipos = equiposCache;
        const serviciosEquipo = serviciosEquipoCache;

        // Verificar si el input de búsqueda ya existe
        const inputBusquedaExiste = document.getElementById('busquedaServicios');
        
        if (servicios.length === 0) {
            let mensajeVacio = busqueda 
                ? `<div class="no-records">No se encontraron servicios para "<strong>${busqueda}</strong>"</div>`
                : '<div class="no-records">No hay servicios registrados</div>';
            
            // Solo renderizar el input si no existe
            if (!inputBusquedaExiste) {
                container.innerHTML = renderBarraBusquedaServicios(busqueda) + mensajeVacio;
            } else {
                // Actualizar solo el contenido después del input
                const barraDiv = container.querySelector('div[style*="margin-bottom: 20px"]');
                if (barraDiv && barraDiv.nextSibling) {
                    barraDiv.nextSibling.remove();
                }
                container.insertAdjacentHTML('beforeend', mensajeVacio);
            }
            
            if (pagination) container.innerHTML += renderPaginacionServicios(pagination);
            return;
        }

        let html = '';
        
        // Solo agregar el input de búsqueda si no existe
        if (!inputBusquedaExiste) {
            html += renderBarraBusquedaServicios(busqueda);
        }

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
        
        // Si el input ya existe, solo actualizar la tabla y paginación
        if (inputBusquedaExiste) {
            // Eliminar tabla y paginación existentes
            const tablaExistente = container.querySelector('#tablaServicios');
            if (tablaExistente) {
                tablaExistente.remove();
            }
            const paginacionExistente = container.querySelector('div[style*="display: flex; justify-content: center"]');
            if (paginacionExistente) {
                paginacionExistente.remove();
            }
            // Agregar nuevo contenido después del input
            container.insertAdjacentHTML('beforeend', html);
        } else {
            // Primera carga, renderizar todo
            container.innerHTML = html;
        }
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

        // Deshabilitar botón de buscar equipo hasta que se seleccione un cliente
        const btnBuscarEquipo = document.getElementById('btnBuscarEquipo');
        if (btnBuscarEquipo) {
            btnBuscarEquipo.disabled = true;
        }

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
                monto: parseFloat(servicio.monto) || 0,
                adelanto: parseFloat(servicio.adelanto) || 0,
                problemas_reportados: servicio.problemas || '',
                observaciones: servicio.observaciones || '',
                local: servicio.local || '',
                fecha: servicio.fecha || '',
                hora: servicio.hora || '',
                numero_servicio: servicio.numero_servicio || '',
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
            
            // ✅ NUEVO: Registrar adelanto inicial en historial de pagos
            const adelantoInicial = parseFloat(servicio.adelanto) || 0;
            if (adelantoInicial > 0) {
                console.log('💰 Registrando adelanto inicial en historial:', adelantoInicial);
                
                const historialPago = {
                    servicio_id: servicioGuardado._id,
                    numero_servicio: servicio.numero_servicio,
                    cliente_id: servicio.cliente_id,
                    monto: adelantoInicial,
                    metodo_pago: 'efectivo',
                    referencia: '',
                    notas: 'Adelanto inicial al registrar el servicio',
                    usuario_registro: localStorage.getItem('usuario_nombre') || 'Sistema'
                };
                
                try {
                    const historialResponse = await fetch(`${API_BASE}/api/historial-pagos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(historialPago)
                    });
                    
                    if (historialResponse.ok) {
                        console.log('✅ Adelanto inicial registrado en historial');
                    } else {
                        console.warn('⚠️ No se pudo registrar el adelanto en historial');
                    }
                } catch (error) {
                    console.warn('⚠️ Error al registrar adelanto en historial:', error);
                }
            }
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

        // Agregar el nuevo servicio al caché (al inicio para que aparezca primero)
        serviciosCache.unshift(servicioGuardado);
        
        // Actualizar la tabla sin recargar desde el servidor
        renderTablaServicios(serviciosCache);
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al guardar servicio: ' + error.message);
    }
}

/**
 * Filtrar servicios por búsqueda (similar a filtrarClientes)
 */
export function filtrarServicios() {
    const busqueda = document.getElementById('busquedaServicios').value.toLowerCase();
    
    try {
        // Si no hay búsqueda, mostrar todos
        if (!busqueda) {
            renderTablaServicios(serviciosCache);
            return;
        }
        
        // Filtrar desde el caché
        const filtrados = serviciosCache.filter(srv => {
            const cliente = clientesCache.find(c => c._id == srv.cliente_id);
            const clienteNombre = cliente ? cliente.nombre.toLowerCase() : '';
            
            // Buscar equipo
            let equipo = null;
            if (srv.equipo_id) {
                equipo = equiposCache.find(e => e._id == srv.equipo_id);
            }
            if (!equipo) {
                const servicioEquipo = serviciosEquipoCache.find(se => se.servicio_id == srv._id);
                if (servicioEquipo) {
                    equipo = equiposCache.find(e => e._id == servicioEquipo.equipo_id);
                }
            }
            const equipoStr = equipo ? `${equipo.tipo_equipo} ${equipo.marca || ''}`.toLowerCase() : '';
            
            // Problemas reportados
            const problemasRaw = srv.problemas_reportados || srv.problemas || '';
            const problemasTexto = Array.isArray(problemasRaw) ? problemasRaw.join(' ') : String(problemasRaw);
            const problemasLower = problemasTexto.toLowerCase();
            
            return (
                (srv.numero_servicio && srv.numero_servicio.toLowerCase().includes(busqueda)) ||
                (srv.descripcion && srv.descripcion.toLowerCase().includes(busqueda)) ||
                (srv.local && srv.local.toLowerCase().includes(busqueda)) ||
                clienteNombre.includes(busqueda) ||
                equipoStr.includes(busqueda) ||
                problemasLower.includes(busqueda)
            );
        });

        if (filtrados.length === 0) {
            document.getElementById('serviciosContainer').innerHTML = '<div class="no-records">No se encontraron servicios</div>';
            return;
        }

        renderTablaServicios(filtrados);
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Renderizar tabla de servicios
 */
export function renderTablaServicios(servicios) {
    const container = document.getElementById('serviciosContainer');
    const clientes = clientesCache;
    const equipos = equiposCache;
    const serviciosEquipo = serviciosEquipoCache;
    
    let html = `
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
            <tr class="row-servicio">
                <td data-label="Número"><strong>${srv.numero_servicio || 'N/A'}</strong></td>
                <td data-label="Fecha">${new Date(srv.fecha).toLocaleDateString('es-PE')}</td>
                <td data-label="Local"><span style="padding: 4px 8px; border-radius: 4px; font-weight: 600; ${srv.local === 'Ferreñafe' ? 'background: #C8E6C9; color: #2E7D32;' : 'background: #BBDEFB; color: #1565C0;'}">${srv.local || 'N/A'}</span></td>
                <td data-label="Cliente">${cliente ? cliente.nombre : 'N/A'}</td>
                <td data-label="Equipo">${equipoStr}</td>
                <td data-label="Descripción" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${problemasTexto}">${descripcionStr}</td>
                <td data-label="Estado">${estadoBadge}</td>
                <td data-label="Costo Total"><strong>${costoTotal > 0 ? 'S/ ' + costoTotal.toFixed(2) : '-'}</strong></td>
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
    container.innerHTML = html;
}

/**
 * Buscar servicios con debounce (DEPRECADO - usar filtrarServicios)
 */
export function buscarServiciosConDebounce() {
    filtrarServicios();
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
                
                <!-- Fotos del Equipo si existen -->
                ${fotosEquipoBase64.length > 0 ? `
                    <div style="background: white; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <h4 style="color: #333; margin-bottom: 10px;">
                            <i class="fas fa-images" style="color: #2192B8;"></i> Fotos del Equipo (${fotosEquipoBase64.length})
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                            ${fotosEquipoBase64.map((foto, index) => `
                                <div style="position: relative;">
                                    <img src="${foto}" alt="Foto ${index + 1}" style="width: 100%; border-radius: 8px; border: 2px solid #e0e0e0; cursor: pointer;" onclick="verFotoCompleta('${foto}', ${index + 1})">
                                    <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                                        Foto ${index + 1}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
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
    guardarServicioRealConFoto(servicioParaGuardar || window.servicioParaGuardar);
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


// ==================== FUNCIONES PARA FOTO DEL EQUIPO ====================

/**
 * Array para almacenar las fotos del equipo en base64 (máximo 2)
 */
let fotosEquipoBase64 = [];
let streamCamara = null;
const MAX_FOTOS = 2;

/**
 * Actualizar contador de fotos y visibilidad de botones
 */
function actualizarContadorFotos() {
    const numeroFotos = document.getElementById('numeroFotos');
    const botonesAgregar = document.getElementById('botonesAgregarFoto');
    
    if (numeroFotos) {
        numeroFotos.textContent = fotosEquipoBase64.length;
    }
    
    // Ocultar botones si ya hay 2 fotos
    if (botonesAgregar) {
        if (fotosEquipoBase64.length >= MAX_FOTOS) {
            botonesAgregar.style.display = 'none';
        } else {
            botonesAgregar.style.display = 'grid';
        }
    }
}

/**
 * Renderizar todas las fotos en el contenedor
 */
function renderizarFotos() {
    const contenedor = document.getElementById('contenedorPreviewFotos');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';
    
    fotosEquipoBase64.forEach((foto, index) => {
        const divFoto = document.createElement('div');
        divFoto.style.cssText = 'position: relative;';
        divFoto.innerHTML = `
            <img src="${foto}" alt="Foto ${index + 1}" style="width: 100%; border-radius: 8px; border: 2px solid #e0e0e0;">
            <button type="button" onclick="eliminarFotoEquipo(${index})" style="position: absolute; top: 10px; right: 10px; background: #d32f2f; color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                <i class="fas fa-times"></i>
            </button>
            <div style="position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                Foto ${index + 1}
            </div>
        `;
        contenedor.appendChild(divFoto);
    });
    
    actualizarContadorFotos();
}

/**
 * Abrir cámara para tomar foto del equipo
 */
export async function abrirCamaraEquipo() {
    // Verificar límite de fotos
    if (fotosEquipoBase64.length >= MAX_FOTOS) {
        alert(`⚠️ Ya has agregado el máximo de ${MAX_FOTOS} fotos`);
        return;
    }
    
    const modal = document.getElementById('modalCamaraEquipo');
    const video = document.getElementById('videoCamaraEquipo');
    
    try {
        // Solicitar acceso a la cámara
        streamCamara = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment', // Usar cámara trasera en móviles
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        video.srcObject = streamCamara;
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('⚠️ No se pudo acceder a la cámara. Por favor, verifica los permisos o usa la opción "Subir Archivo".');
    }
}

/**
 * Cerrar cámara
 */
export function cerrarCamaraEquipo() {
    const modal = document.getElementById('modalCamaraEquipo');
    const video = document.getElementById('videoCamaraEquipo');
    
    // Detener stream de cámara
    if (streamCamara) {
        streamCamara.getTracks().forEach(track => track.stop());
        streamCamara = null;
    }
    
    video.srcObject = null;
    modal.style.display = 'none';
}

/**
 * Capturar foto desde la cámara
 */
export function capturarFotoEquipo() {
    // Verificar límite de fotos
    if (fotosEquipoBase64.length >= MAX_FOTOS) {
        alert(`⚠️ Ya has agregado el máximo de ${MAX_FOTOS} fotos`);
        cerrarCamaraEquipo();
        return;
    }
    
    const video = document.getElementById('videoCamaraEquipo');
    const canvas = document.getElementById('canvasCamaraEquipo');
    const context = canvas.getContext('2d');
    
    // Configurar tamaño del canvas igual al video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dibujar frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convertir a base64
    const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    // Agregar foto al array
    fotosEquipoBase64.push(fotoBase64);
    
    // Renderizar fotos
    renderizarFotos();
    
    // Cerrar modal de cámara
    cerrarCamaraEquipo();
    
    console.log(`✅ Foto ${fotosEquipoBase64.length} capturada desde cámara`);
}

/**
 * Previsualizar foto del equipo desde archivo
 */
export function previsualizarFotoEquipo(event) {
    // Verificar límite de fotos
    if (fotosEquipoBase64.length >= MAX_FOTOS) {
        alert(`⚠️ Ya has agregado el máximo de ${MAX_FOTOS} fotos`);
        event.target.value = '';
        return;
    }
    
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        alert('⚠️ Por favor seleccione un archivo de imagen válido');
        event.target.value = '';
        return;
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('⚠️ La imagen no debe superar los 5MB');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        // Agregar foto al array
        fotosEquipoBase64.push(e.target.result);
        
        // Renderizar fotos
        renderizarFotos();
        
        // Limpiar input para permitir seleccionar la misma imagen de nuevo
        event.target.value = '';
        
        console.log(`✅ Foto ${fotosEquipoBase64.length} cargada desde archivo`);
    };
    reader.readAsDataURL(file);
}

/**
 * Eliminar foto del equipo por índice
 */
export function eliminarFotoEquipo(index) {
    if (index >= 0 && index < fotosEquipoBase64.length) {
        fotosEquipoBase64.splice(index, 1);
        renderizarFotos();
        console.log(`🗑️ Foto ${index + 1} eliminada`);
    }
}

/**
 * Limpiar todas las fotos
 */
export function limpiarTodasLasFotos() {
    fotosEquipoBase64 = [];
    renderizarFotos();
    console.log('🗑️ Todas las fotos eliminadas');
}

/**
 * Subir foto a Cloudinary
 */
async function subirFotoEquipo(fotoBase64) {
    if (!fotoBase64) {
        return null;
    }

    try {
        console.log('📤 Subiendo foto del equipo a Cloudinary...');
        
        // Extraer solo la parte base64 (sin el prefijo data:image/...)
        const base64Data = fotoBase64.split(',')[1] || fotoBase64;
        
        const response = await fetch('/api/upload-imagen', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagen: base64Data,
                carpeta: 'equipos'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al subir imagen');
        }

        const data = await response.json();
        console.log('✅ Foto subida exitosamente:', data.url);
        return data.url;
    } catch (error) {
        console.error('❌ Error al subir foto:', error);
        throw error;
    }
}

/**
 * Subir todas las fotos a Cloudinary
 */
async function subirTodasLasFotos() {
    if (fotosEquipoBase64.length === 0) {
        return [];
    }

    try {
        console.log(`📤 Subiendo ${fotosEquipoBase64.length} foto(s) a Cloudinary...`);
        
        const urlsPromises = fotosEquipoBase64.map((foto, index) => {
            mostrarModalCarga(`Subiendo foto ${index + 1} de ${fotosEquipoBase64.length}...`);
            return subirFotoEquipo(foto);
        });
        
        const urls = await Promise.all(urlsPromises);
        console.log(`✅ ${urls.length} foto(s) subida(s) exitosamente`);
        return urls;
    } catch (error) {
        console.error('❌ Error al subir fotos:', error);
        throw error;
    }
}

// Modificar la función guardarServicioReal para incluir las fotos
export async function guardarServicioRealConFoto(servicio) {
    try {
        mostrarModalCarga('Guardando...');
        
        // Subir fotos si existen
        let fotosUrls = [];
        if (fotosEquipoBase64.length > 0) {
            try {
                mostrarModalCarga(`Subiendo ${fotosEquipoBase64.length} foto(s) del equipo...`);
                fotosUrls = await subirTodasLasFotos();
            } catch (error) {
                console.error('Error al subir fotos:', error);
                const continuar = confirm(`⚠️ No se pudieron subir las fotos del equipo. ¿Desea continuar sin las fotos?`);
                if (!continuar) {
                    cerrarModalCarga();
                    return;
                }
            }
        }
        
        mostrarModalCarga('Guardando servicio...');
        
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
                monto: parseFloat(servicio.monto) || 0,
                adelanto: parseFloat(servicio.adelanto) || 0,
                problemas_reportados: servicio.problemas || '',
                observaciones: servicio.observaciones || '',
                local: servicio.local || '',
                fecha: servicio.fecha || '',
                hora: servicio.hora || '',
                numero_servicio: servicio.numero_servicio || '',
                fotos: fotosUrls // Array con las URLs de las fotos
            };

            console.log(`📤 Enviando servicio-equipo con ${fotosUrls.length} foto(s):`, servicioEquipo);
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
            
            console.log(`✅ Servicio-equipo guardado con ${fotosUrls.length} foto(s)`);
            
            // ✅ Registrar adelanto inicial en historial de pagos
            const adelantoInicial = parseFloat(servicio.adelanto) || 0;
            if (adelantoInicial > 0) {
                console.log('💰 Registrando adelanto inicial en historial:', adelantoInicial);
                
                const historialPago = {
                    servicio_id: servicioGuardado._id,
                    numero_servicio: servicio.numero_servicio,
                    cliente_id: servicio.cliente_id,
                    monto: adelantoInicial,
                    metodo_pago: 'efectivo',
                    referencia: '',
                    notas: 'Adelanto inicial al registrar el servicio',
                    usuario_registro: localStorage.getItem('usuario_nombre') || 'Sistema'
                };
                
                try {
                    const historialResponse = await fetch(`${API_BASE}/api/historial-pagos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(historialPago)
                    });
                    
                    if (historialResponse.ok) {
                        console.log('✅ Adelanto inicial registrado en historial');
                    } else {
                        console.warn('⚠️ No se pudo registrar el adelanto en historial');
                    }
                } catch (error) {
                    console.warn('⚠️ Error al registrar adelanto en historial:', error);
                }
            }
        }

        // Limpiar fotos después de guardar
        limpiarTodasLasFotos();
        
        // Cerrar modal de resumen
        if (typeof cerrarModalResumen === 'function') {
            cerrarModalResumen();
        }
        
        // Cerrar modal de carga
        cerrarModalCarga();
        
        // Limpiar formulario
        document.getElementById('formServicio').reset();
        
        // Cerrar modal de nuevo servicio
        cerrarModalNuevoServicio();
        
        // Mostrar notificación de éxito
        const mensajeExito = fotosUrls.length > 0 
            ? `Servicio guardado con ${fotosUrls.length} foto(s)` 
            : 'Servicio guardado';
        mostrarNotificacionExito(mensajeExito);

        // Agregar el nuevo servicio al caché (al inicio para que aparezca primero)
        serviciosCache.unshift(servicioGuardado);
        
        // Actualizar la tabla sin recargar desde el servidor
        renderTablaServicios(serviciosCache);
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al guardar servicio: ' + error.message);
    }
}

// Exportar las funciones para uso global
window.previsualizarFotoEquipo = previsualizarFotoEquipo;
window.eliminarFotoEquipo = eliminarFotoEquipo;
window.abrirCamaraEquipo = abrirCamaraEquipo;
window.cerrarCamaraEquipo = cerrarCamaraEquipo;
window.capturarFotoEquipo = capturarFotoEquipo;
window.limpiarTodasLasFotos = limpiarTodasLasFotos;
window.verFotoCompleta = verFotoCompleta;
window.cerrarFotoCompleta = cerrarFotoCompleta;


/**
 * Ver foto en tamaño completo
 */
export function verFotoCompleta(fotoSrc, numeroFoto) {
    const modal = document.createElement('div');
    modal.id = 'modalFotoCompleta';
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; justify-content: center; align-items: center;';
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%; display: flex; flex-direction: column; align-items: center;">
            <div style="background: white; padding: 10px 20px; border-radius: 8px 8px 0 0; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #2192B8;">
                    <i class="fas fa-image"></i> Foto ${numeroFoto} del Equipo
                </h3>
            </div>
            <img src="${fotoSrc}" alt="Foto ${numeroFoto}" style="max-width: 100%; max-height: 80vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <button onclick="cerrarFotoCompleta()" style="position: absolute; top: -10px; right: -10px; background: #d32f2f; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Cerrar al hacer clic fuera de la imagen
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarFotoCompleta();
        }
    });
    
    document.body.appendChild(modal);
}

/**
 * Cerrar modal de foto completa
 */
export function cerrarFotoCompleta() {
    const modal = document.getElementById('modalFotoCompleta');
    if (modal) {
        modal.remove();
    }
}
