// ==================== MÓDULO DE DIAGNÓSTICO ====================

import { API_CLIENTES, API_SERVICIOS, API_EQUIPOS } from '../config.js';
import { mostrarModalCarga, cerrarModalCarga, mostrarNotificacionExito } from '../ui.js';

// ==================== ESTADO DEL MÓDULO ====================

let servicioActualDiagnostico = null;

// ==================== FUNCIONES PÚBLICAS ====================

/**
 * Abrir modal de diagnóstico
 */
export async function abrirModalDiagnostico(servicioId, clienteNombre) {
    try {
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => String(s._id) === String(servicioId));

        if (!servicio) {
            console.error('Servicio no encontrado:', servicioId);
            return;
        }

        const clientesRes = await fetch(`${API_CLIENTES}`);
        const clientes = await clientesRes.json();
        const cliente = clientes.find(c => c._id == servicio.cliente_id);

        // Guardar datos del servicio en memoria (NO cambiar estado aún)
        servicioActualDiagnostico = {
            id: servicioId,
            numero_servicio: servicio.numero_servicio,
            cliente: clienteNombre,
            telefono: cliente?.telefono || '',
            problemas: [],
            modificado: false
        };
        window.servicioActualDiagnostico = servicioActualDiagnostico;

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
        document.getElementById('descripcionServicioDiagnostico').textContent = servicio.problemas_reportados || servicio.problemas || servicio.descripcion_problema || 'Sin problemas reportados';
        
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

/**
 * Cerrar modal diagnóstico
 */
export function cerrarModalDiagnostico(acabaDeGuardar = false) {
    // Si acaba de guardar, cerrar sin preguntar
    if (!acabaDeGuardar) {
        // Verificar si hay cambios sin guardar
        const filas = document.querySelectorAll('#problemasContainer > div');
        const nombreTecnico = document.getElementById('nombreTecnicoDiagnostico').value.trim();
        
        const hayContenido = filas.length > 0 || nombreTecnico;
        
        if (hayContenido && servicioActualDiagnostico) {
            // Mostrar modal de confirmación en lugar de confirm()
            document.getElementById('modalConfirmarCierreDiagnostico').classList.add('show');
            return;
        }
    }
    
    document.getElementById('modalDiagnostico').classList.remove('show');
    servicioActualDiagnostico = null;
    window.servicioActualDiagnostico = null;
}

/**
 * Agregar fila de problema
 */
export function agregarProblemaFila() {
    const container = document.getElementById('problemasContainer');
    const id = Date.now();
    const numeroFila = container.querySelectorAll('[id^="problema-"]').length + 1;

    const fila = document.createElement('div');
    fila.id = `problema-${id}`;
    fila.className = 'problema-fila';

    fila.innerHTML = `
        <div class="problema-header">
            <span class="problema-numero">${numeroFila}</span>
            <span class="problema-label">Problema encontrado</span>
            <button type="button" class="btn-eliminar-problema" onclick="eliminarProblemaFila('${id}')" title="Eliminar problema">
                <i class="fas fa-trash"></i> Eliminar
            </button>
        </div>
        
        <!-- Campos del problema -->
        <div class="problema-campos">
            <!-- Descripción del problema -->
            <div class="campo-grupo">
                <label>Descripción:</label>
                <input type="text" class="problemaInput" placeholder="Pantalla rota, batería dañada, etc." onchange="calcularMontoTotal()">
            </div>
            
            <!-- Solución -->
            <div class="campo-grupo">
                <label>Solución:</label>
                <input type="text" class="solucionInput" placeholder="Pantalla nueva, batería reemplazada, etc.">
            </div>
            
            <!-- Costo -->
            <div class="campo-grupo">
                <label>Costo:</label>
                <input type="number" class="costoInput" placeholder="0.00" step="0.01" min="0" onchange="calcularMontoTotal()">
            </div>
        </div>
    `;

    container.appendChild(fila);

    // Agregar listener para prevenir valores negativos en tiempo real
    const costoInput = fila.querySelector('.costoInput');
    if (costoInput) {
        costoInput.addEventListener('input', function() {
            if (this.value && parseFloat(this.value) < 0) {
                this.value = 0;
                this.style.borderColor = '#d32f2f';
                this.style.backgroundColor = '#ffebee';
                setTimeout(() => {
                    this.style.borderColor = '';
                    this.style.backgroundColor = '';
                }, 1500);
            }
        });
    }
}

/**
 * Eliminar fila de problema
 */
export function eliminarProblemaFila(id) {
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
            if (confirm('¿Deseas eliminar este problema? Los datos se perderán.')) {
                fila.remove();
                calcularMontoTotal();
            }
        }
    }
}

/**
 * Calcular monto total
 */
export function calcularMontoTotal() {
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
    if (servicioActualDiagnostico) {
        servicioActualDiagnostico.montoTotal = total;
        window.servicioActualDiagnostico = servicioActualDiagnostico;
    }
}

/**
 * Guardar progreso del diagnóstico (sin cambiar estado)
 */
export async function guardarProcesoDiagnostico() {
    await guardarDiagnosticoInterno(false);
}

/**
 * Finalizar diagnóstico (cambiar a "En reparación")
 */
export async function finalizarDiagnostico() {
    await guardarDiagnosticoInterno(true);
}

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Guardar diagnóstico interno
 */
async function guardarDiagnosticoInterno(finalizarDiag = false) {
    if (!servicioActualDiagnostico) {
        alert('Error: No hay servicio en diagnóstico');
        return;
    }

    // Validación 1: Nombre del técnico
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

    // Validación 2: Problemas encontrados
    const filas = document.querySelectorAll('#problemasContainer > div');
    
    if (filas.length === 0) {
        alert('❌ Debe agregar al menos un problema');
        return;
    }

    // Validación 3: Todos los problemas completados
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

         // Validación: Evitar costos negativos
         if (costo && parseFloat(costo) < 0) {
             if (costoInput) {
                 costoInput.style.borderColor = '#d32f2f';
                 costoInput.style.borderWidth = '2px';
                 costoInput.style.backgroundColor = '#ffebee';
             }
             alert('⚠️ El costo no puede ser negativo');
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
        const servicioId = servicioActualDiagnostico.id;
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

        // Cerrar y recargar
        cerrarModalDiagnostico(true);
        
        // Recargar servicios si la función existe
        if (window.cargarServicios) {
            window.cargarServicios();
        }
        
        // Mostrar notificación de éxito
        mostrarNotificacionExito('Diagnóstico guardado');
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error al guardar diagnóstico: ' + error.message);
    }
}

/**
 * Generar mensaje de WhatsApp
 */
function generarMensajeWhatsApp(problemas, montoTotal, nombreTecnico) {
    const servicio = servicioActualDiagnostico;
    let mensaje = `*DIAGNÓSTICO DEL EQUIPO*%0A%0A`;
    mensaje += `Cliente: ${servicio.cliente}%0A`;
    mensaje += `Servicio: ${servicio.numero_servicio}%0A%0A`;
    mensaje += `*Problemas Encontrados:*%0A`;

    problemas.forEach((p, idx) => {
        mensaje += `${idx + 1}. ${p.descripcion} - ${p.costo.toFixed(2)}%0A`;
    });

    mensaje += `%0A*Monto Total del Diagnóstico: ${montoTotal.toFixed(2)}*%0A`;
    mensaje += `%0ATécnico: ${nombreTecnico}`;

    const telefono = servicio.telefono;
    if (telefono) {
        const url = `https://wa.me/${telefono}?text=${mensaje}`;
        window.open(url, '_blank');
    }
}
