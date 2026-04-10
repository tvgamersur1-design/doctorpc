// ==================== MÓDULO DE EQUIPOS ====================

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
import { getIconoEquipo } from '../utils.js';

// ==================== ESTADO DEL MÓDULO ====================
let equiposCache = [];
let equipoEnEdicion = null;

// ==================== FUNCIONES PÚBLICAS ====================

/**
 * Abrir modal para nuevo equipo
 */
export function abrirModalNuevoEquipo() {
    mostrarModal('modalNuevoEquipo');
    document.getElementById('formEquipo').reset();
    actualizarIconoNuevo();
    
    // Si NO venimos desde selección, asegurar que el botón de búsqueda esté visible
    if (!window.viniendonFromSeleccion) {
        const clienteEquipoSeleccionado = document.getElementById('clienteEquipoSeleccionado');
        const btnBuscarCliente = document.querySelector('#modalNuevoEquipo button[onclick="abrirModalSeleccionarClienteEquipo()"]');
        
        if (clienteEquipoSeleccionado) {
            clienteEquipoSeleccionado.style.backgroundColor = '#f5f5f5';
            clienteEquipoSeleccionado.style.borderColor = '#e0e0e0';
            clienteEquipoSeleccionado.style.cursor = 'pointer';
        }
        
        if (btnBuscarCliente) {
            btnBuscarCliente.style.display = '';
        }
        
        // Eliminar el texto informativo si existe
        const infoClienteBloqueado = document.querySelector('.info-cliente-bloqueado');
        if (infoClienteBloqueado) {
            infoClienteBloqueado.remove();
        }
    }
}

/**
 * Cerrar modal de nuevo equipo
 */
export function cerrarModalNuevoEquipo() {
    cerrarModal('modalNuevoEquipo');
    document.getElementById('formEquipo').reset();
    
    // Limpiar el modo de cliente bloqueado
    const clienteEquipoSeleccionado = document.getElementById('clienteEquipoSeleccionado');
    const btnBuscarCliente = document.querySelector('#modalNuevoEquipo button[onclick="abrirModalSeleccionarClienteEquipo()"]');
    
    if (clienteEquipoSeleccionado) {
        // Restaurar estilos normales
        clienteEquipoSeleccionado.style.backgroundColor = '#f5f5f5';
        clienteEquipoSeleccionado.style.borderColor = '#e0e0e0';
        clienteEquipoSeleccionado.style.cursor = 'pointer';
    }
    
    if (btnBuscarCliente) {
        // Mostrar botón de búsqueda
        btnBuscarCliente.style.display = '';
    }
    
    // Eliminar el texto informativo si existe
    const infoClienteBloqueado = document.querySelector('.info-cliente-bloqueado');
    if (infoClienteBloqueado) {
        infoClienteBloqueado.remove();
    }
    
    // Limpiar flags
    window.viniendonFromSeleccion = false;
    window.clientePreseleccionado = null;
}

/**
 * Guardar equipo
 * OPTIMIZADO: Actualiza caché de servicios
 */
export async function guardarEquipo(e) {
    e.preventDefault();
    const formData = new FormData(document.getElementById('formEquipo'));
    const equipo = Object.fromEntries(formData);

    try {
        mostrarModalCarga('Guardando...');
        
        const equipoGuardado = await postJSON(API.EQUIPOS, equipo);

        cerrarModalCarga();

        // Si venimos desde la selección, auto-seleccionar el equipo
        if (window.viniendonFromSeleccion) {
            document.getElementById('equipo_id').value = equipoGuardado._id;
            document.getElementById('equipoSeleccionado').value = 
                `${equipoGuardado.tipo_equipo} - ${equipoGuardado.marca || 'N/A'} ${equipoGuardado.modelo || 'N/A'}`;
            
            // Actualizar problemas según el tipo
            if (window.actualizarProblemasSegunEquipoTipo) {
                window.actualizarProblemasSegunEquipoTipo(equipoGuardado.tipo_equipo);
            }
            
            window.viniendonFromSeleccion = false;
        }

        document.getElementById('formEquipo').reset();
        cerrarModalNuevoEquipo();
        
        // Agregar al caché y actualizar tabla sin recargar
        equiposCache.unshift(equipoGuardado);
        renderTablaEquipos(equiposCache);
        await actualizarSelectsEquipos();
        
        // 🚀 OPTIMIZACIÓN: Actualizar caché de Servicios
        if (window.Servicios && window.Servicios.equiposCache) {
            window.Servicios.equiposCache.unshift(equipoGuardado);
            console.log('✅ Caché de equipos (Servicios) actualizado');
        }
        
        mostrarNotificacionExito('Equipo guardado');
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al guardar equipo: ' + error.message);
        window.viniendonFromSeleccion = false;
    }
}

/**
 * Cargar lista de equipos
 */
export async function cargarEquipos() {
    const container = document.getElementById('equiposContainer');
    mostrarSpinnerInline('equiposContainer', 'Cargando equipos...');
    
    try {
        // Verificar si se deben incluir eliminados
        const toggleEliminados = document.getElementById('toggleEquiposEliminados');
        const incluirEliminados = toggleEliminados && toggleEliminados.checked;
        
        const url = incluirEliminados ? `${API.EQUIPOS}?incluirEliminados=true` : API.EQUIPOS;
        equiposCache = await getJSON(url);

        if (equiposCache.length === 0) {
            mostrarSinRegistros('equiposContainer', 'No hay equipos registrados');
            return;
        }

        renderTablaEquipos(equiposCache);
    } catch (error) {
        console.error('Error al cargar equipos:', error);
        mostrarErrorEnContenedor('equiposContainer', 'Error al cargar equipos');
    }
}

/**
 * Filtrar equipos por búsqueda
 */
export async function filtrarEquipos() {
    const busqueda = document.getElementById('searchEquipos').value.toLowerCase();
    
    try {
        // Si no hay búsqueda, mostrar todos
        if (!busqueda) {
            await cargarEquipos();
            return;
        }
        
        // Filtrar desde el cache
        const filtrados = equiposCache.filter(eq =>
            eq.tipo_equipo.toLowerCase().includes(busqueda) ||
            (eq.marca && eq.marca.toLowerCase().includes(busqueda)) ||
            (eq.modelo && eq.modelo.toLowerCase().includes(busqueda)) ||
            (eq.numero_serie && eq.numero_serie.toLowerCase().includes(busqueda))
        );

        if (filtrados.length === 0) {
            mostrarSinRegistros('equiposContainer', 'No se encontraron equipos');
            return;
        }

        renderTablaEquipos(filtrados);
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Abrir modal para editar equipo
 */
export async function abrirModalEditarEquipo(id) {
    try {
        // Buscar equipo por ID
        let equipo = await getJSON(`${API.EQUIPOS}/${id}`).catch(() => null);

        if (!equipo) {
            // Buscar en el cache
            equipo = equiposCache.find(e => e._id == id);
        }

        if (!equipo) {
            alert('⚠️ Equipo no encontrado. Recargando lista...');
            await cargarEquipos();
            return;
        }

        // Guardar datos originales
        equipoEnEdicion = { ...equipo };

        // Llenar formulario de edición
        document.getElementById('editTipoEquipo').value = equipo.tipo_equipo || '';
        document.getElementById('editMarcaEquipo').value = equipo.marca || '';
        document.getElementById('editModeloEquipo').value = equipo.modelo || '';
        document.getElementById('editSerieEquipo').value = equipo.numero_serie || '';
        document.getElementById('editClienteEquipo').value = equipo.cliente_id || '';
        
        // Cargar nombre del cliente
        if (equipo.cliente_id) {
            try {
                const clientesRes = await fetch(`${API.CLIENTES}`);
                const clientes = await clientesRes.json();
                const cliente = clientes.find(c => c._id === equipo.cliente_id);
                if (cliente) {
                    const nombreCompleto = `${cliente.nombre} ${cliente.apellido_paterno || ''} ${cliente.apellido_materno || ''}`.trim();
                    document.getElementById('editClienteEquipoSeleccionado').value = `${nombreCompleto} (DNI: ${cliente.dni})`;
                } else {
                    document.getElementById('editClienteEquipoSeleccionado').value = 'Cliente no encontrado';
                }
            } catch (error) {
                console.error('Error al cargar cliente:', error);
                document.getElementById('editClienteEquipoSeleccionado').value = 'Error al cargar cliente';
            }
        } else {
            document.getElementById('editClienteEquipoSeleccionado').value = '';
        }

        actualizarIconoEditar();
        mostrarModal('modalEditarEquipo');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar equipo');
    }
}

/**
 * Cerrar modal de editar equipo
 */
export function cerrarModalEditarEquipo() {
    cerrarModal('modalEditarEquipo');
    equipoEnEdicion = null;
}

/**
 * Guardar cambios del equipo
 */
export async function guardarCambiosEquipo(e) {
    e.preventDefault();

    if (!equipoEnEdicion) return;

    const datosActualizados = {
        tipo_equipo: document.getElementById('editTipoEquipo').value,
        marca: document.getElementById('editMarcaEquipo').value,
        modelo: document.getElementById('editModeloEquipo').value,
        numero_serie: document.getElementById('editSerieEquipo').value,
        cliente_id: document.getElementById('editClienteEquipo').value
    };

    try {
        mostrarModalCarga('Guardando...');
        
        const equipoActualizado = await putJSON(`${API.EQUIPOS}/${equipoEnEdicion._id}`, datosActualizados);

        if (!equipoActualizado || !equipoActualizado._id) {
            throw new Error('El servidor no devolvió un equipo válido');
        }

        cerrarModalCarga();
        cerrarModalEditarEquipo();
        
        // Actualizar en el caché
        const index = equiposCache.findIndex(e => e._id === equipoActualizado._id);
        if (index !== -1) {
            equiposCache[index] = equipoActualizado;
        }
        renderTablaEquipos(equiposCache);
        await actualizarSelectsEquipos();
        
        mostrarNotificacionExito('Equipo actualizado');
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al guardar cambios: ' + error.message);
    }
}

/**
 * Confirmar eliminación de equipo
 */
export async function confirmarEliminarEquipo(id) {
    document.getElementById('confirmMsg').textContent = '¿Estás seguro de que deseas eliminar este equipo?';
    document.getElementById('confirmBtn').onclick = () => eliminarEquipo(id);
    mostrarModal('confirmModal');
}

/**
 * Restaurar equipo eliminado
 */
export async function restaurarEquipo(id) {
    try {
        mostrarModalCarga('Restaurando...');
        
        await putJSON(`${API.EQUIPOS}/${id}/restaurar`, {});

        cerrarModalCarga();
        await cargarEquipos();
        mostrarNotificacionExito('Equipo restaurado');
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al restaurar equipo');
    }
}

/**
 * Actualizar icono en modal nuevo equipo
 */
export function actualizarIconoNuevo() {
    const tipo = document.getElementById('tipoEquipoNuevoForm')?.value;
    const icono = document.getElementById('iconoNuevoEquipo');
    if (icono && tipo) {
        icono.className = getIconoEquipo(tipo);
    }
}

/**
 * Actualizar icono en modal editar equipo
 */
export function actualizarIconoEditar() {
    const tipo = document.getElementById('editTipoEquipo')?.value;
    const icono = document.getElementById('iconoEditarEquipo');
    if (icono && tipo) {
        icono.className = getIconoEquipo(tipo);
    }
}

// ==================== FUNCIONES PRIVADAS ====================

/**
 * Renderizar tabla de equipos
 */
function renderTablaEquipos(equipos) {
    const container = document.getElementById('equiposContainer');
    
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
        const esEliminado = eq.eliminado === true;
        const rowStyle = esEliminado ? 'style="background-color: #ffebee; opacity: 0.7;"' : '';
        
        html += `
            <tr ${rowStyle}>
                <td data-label="Tipo"><i class="${iconoTipo}" style="margin-right: 8px;"></i>${eq.tipo_equipo}${esEliminado ? ' <span style="color: #d32f2f; font-size: 11px;">(ELIMINADO)</span>' : ''}</td>
                <td data-label="Marca">${eq.marca || 'N/A'}</td>
                <td data-label="Modelo">${eq.modelo || 'N/A'}</td>
                <td data-label="Serie">${eq.numero_serie || 'N/A'}</td>
                <td data-label="Acciones" class="actions">
                     ${!esEliminado ? `
                     <button class="btn-edit" onclick="abrirModalEditarEquipo('${eq._id}')">
                         <i class="fas fa-edit"></i> Editar
                     </button>
                     <button class="btn-danger" onclick="confirmarEliminarEquipo('${eq._id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                     ` : `
                     <button class="btn-primary" onclick="restaurarEquipo('${eq._id}')">
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
 * Eliminar equipo (soft delete)
 */
async function eliminarEquipo(id) {
    try {
        mostrarModalCarga('Eliminando...');
        
        // Soft delete: marcar como eliminado
        await putJSON(`${API.EQUIPOS}/${id}`, { eliminado: true });

        cerrarModalCarga();
        await cargarEquipos();
        cerrarModal('confirmModal');
        
        mostrarNotificacionExito('Equipo eliminado');
    } catch (error) {
        cerrarModalCarga();
        console.error('Error:', error);
        alert('Error al eliminar equipo');
    }
}

/**
 * Actualizar selects de equipos en otros formularios
 */
async function actualizarSelectsEquipos() {
    try {
        const equipos = await getJSON(API.EQUIPOS);

        const selectEquipos = document.getElementById('selectEquipos');
        if (selectEquipos) {
            const defaultOption = selectEquipos.options[0];
            selectEquipos.innerHTML = '';
            selectEquipos.appendChild(defaultOption);

            equipos.forEach(equipo => {
                const option = document.createElement('option');
                option.value = equipo._id;
                option.textContent = `${equipo.tipo_equipo} - ${equipo.marca || 'N/A'} ${equipo.modelo || 'N/A'}`;
                option.dataset.tipoEquipo = equipo.tipo_equipo;
                selectEquipos.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al actualizar selects:', error);
    }
}

// Exportar cache para uso externo si es necesario
export { equiposCache };
