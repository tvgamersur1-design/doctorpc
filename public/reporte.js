/**
 * Módulo de Reporte de Servicios
 * Maneja visualización, descarga PDF y envío por WhatsApp
 * 
 * REFACTORIZADO: Usa constantes unificadas de pdf-constants.js
 */

// Importar constantes unificadas (se cargarán dinámicamente)
let PDF_CONSTANTS = null;

// Cargar constantes al inicializar
async function cargarConstantesPDF() {
  if (!PDF_CONSTANTS) {
    try {
      const module = await import('./js/pdf-constants.js');
      PDF_CONSTANTS = {
        COLORES: module.COLORES_PDF,
        FUENTES: module.FUENTES,
        ESPACIADO: module.ESPACIADO,
        PAGINA: module.PAGINA,
        COLORES_ESTADO: module.COLORES_ESTADO,
        EMPRESA: module.EMPRESA,
        TERMINOS: module.TERMINOS,
        validarValor: module.validarValor,
        formatearFecha: module.formatearFecha,
        formatearHora: module.formatearHora,
        formatearMoneda: module.formatearMoneda
      };
    } catch (error) {
      console.warn('No se pudieron cargar las constantes PDF, usando valores por defecto:', error);
      // Fallback a valores por defecto
      PDF_CONSTANTS = {
        COLORES: {
          primario: [21, 101, 192],
          primarioDark: [13, 71, 161],
          primarioLight: [33, 150, 243],
          secundario: [25, 118, 210],
          acento: [46, 125, 50],
          texto: [51, 51, 51],
          textoClaro: [102, 102, 102],
          fondo: [255, 255, 255],
          fondoClaro: [250, 250, 250]
        },
        FUENTES: { xs: 6.5, sm: 7.5, base: 8.5, md: 9, lg: 10, xl: 12, xl2: 14, xl3: 16 },
        ESPACIADO: { xs: 2, sm: 4, md: 6, base: 8, lg: 10, xl: 12, xl2: 16, xl3: 20 },
        PAGINA: { margen: 20, margenReducido: 15 },
        EMPRESA: {
          nombre: 'DOCTOR PC',
          slogan: 'Soluciones Informáticas Profesionales',
          telefono: '961 509 941',
          email: 'contacto@doctorpc.pe',
          ubicacion: 'Lima - Perú'
        },
        validarValor: (v, fallback = 'Sin datos') => (v && String(v).trim() && String(v).trim() !== 'N/A' && String(v).trim() !== '--------') ? String(v).trim() : fallback,
        formatearFecha: (f) => f ? new Date(f).toLocaleDateString('es-PE') : 'Sin fecha',
        formatearMoneda: (m) => `S/. ${parseFloat(m || 0).toFixed(2)}`
      };
    }
  }
  return PDF_CONSTANTS;
}

class ReporteServicio {
  constructor() {
    this.reporteActual = null;
    this.servicioIdActual = null;
    this.constantesCargadas = false;
    
    // Cargar constantes al inicializar
    cargarConstantesPDF().then(() => {
      this.constantesCargadas = true;
      console.log('✅ Constantes PDF cargadas');
    });
  }

  /**
   * Mostrar notificación con animación en lugar de alert
   */
  mostrarNotificacion(mensaje, tipo = 'success') {
    const notification = document.createElement('div');
    notification.className = `notificacion-${tipo}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${tipo === 'success' ? '#4CAF50' : '#f44336'};
      color: white;
      padding: 16px 24px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      animation: slideInRight 0.3s ease;
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      max-width: 400px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    notification.innerHTML = mensaje;
    
    // Agregar estilos de animación
    if (!document.querySelector('style[data-notification]')) {
      const style = document.createElement('style');
      style.setAttribute('data-notification', 'true');
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Obtener datos del reporte desde el backend
   * OPTIMIZADO: Intenta usar caché primero, luego BD
   */
  async obtenerReporte(servicioId) {
    try {
      console.log('🔍 Obteniendo reporte para servicio:', servicioId);
      
      // 🚀 OPTIMIZACIÓN: Intentar obtener desde caché primero
      if (window.Servicios && window.Servicios.serviciosCache) {
        const servicio = window.Servicios.serviciosCache.find(s => s._id === servicioId);
        
        if (servicio) {
          console.log('💾 Servicio encontrado en caché');
          
          // Obtener cliente desde caché
          const cliente = window.Servicios.clientesCache?.find(c => c._id === servicio.cliente_id);
          
          // Obtener equipo desde caché
          let equipo = null;
          if (servicio.equipo_id) {
            equipo = window.Servicios.equiposCache?.find(e => e._id === servicio.equipo_id);
          }
          
          // Verificar si tenemos todos los datos necesarios
          if (cliente && (equipo || !servicio.equipo_id)) {
          console.log('✅ Datos completos en caché - Usando caché local');
          
          // Parsear diagnóstico: puede ser JSON string, array u objeto
          let diagnosticoData = servicio.diagnostico || servicio.diagnostico_tecnico || '';
          if (typeof diagnosticoData === 'string' && diagnosticoData.startsWith('[')) {
            try {
              diagnosticoData = JSON.parse(diagnosticoData);
            } catch (e) {
              console.warn('Error parsing diagnóstico desde caché:', e);
            }
          }

          // Calcular costo de repuestos desde diagnóstico si existe
          let costoRepuestos = 0;
          if (Array.isArray(diagnosticoData) && diagnosticoData.length > 0) {
            costoRepuestos = diagnosticoData.reduce((sum, d) => sum + parseFloat(d.costo || 0), 0);
          }

          const montoTotal = parseFloat(servicio.monto || servicio.costo_total || 0);

          // Construir objeto de reporte desde caché con formato compatible
          const reporteDesdeCache = {
            numero_orden: servicio.numero_servicio || 'N/A',
            fecha: servicio.fecha || new Date().toISOString(),
            hora: servicio.hora || '',
            local: servicio.local || '',
            estado: servicio.estado || 'Pendiente',
            cliente: {
              nombre: cliente.nombre || '',
              apellido_paterno: cliente.apellido_paterno || '',
              apellido_materno: cliente.apellido_materno || '',
              telefono: cliente.telefono || '',
              email: cliente.email || '',
              direccion: cliente.direccion || '',
              dni: cliente.dni || ''
            },
            equipo: equipo ? {
              tipo_equipo: equipo.tipo_equipo || '',
              marca: equipo.marca || '',
              modelo: equipo.modelo || '',
              numero_serie: equipo.numero_serie || '',
              color: equipo.color || '',
              accesorios: equipo.accesorios || ''
            } : null,
            // Formato compatible con generador de PDF
            servicio: {
              descripcion_problema: servicio.problemas_reportados || servicio.problemas || '',
              diagnostico: diagnosticoData,
              diagnostico_tecnico: diagnosticoData,
              trabajo_realizado: servicio.trabajo_realizado || '',
              solucion_aplicada: servicio.solucion_aplicada || servicio.trabajo_realizado || '',
              observaciones: servicio.observaciones || servicio.notas || '',
              tecnico_asignado: servicio.tecnico_asignado || servicio.tecnico || 'No asignado',
              tecnico_diagnosticador: servicio.tecnico || servicio.tecnico_diagnosticador || servicio.tecnico_asignado || 'No asignado',
              prioridad: servicio.prioridad || 'Normal',
              calificacion: servicio.calificacion || 0
            },
            // Datos técnicos
            datos_tecnicos: {
              tecnico_asignado: servicio.tecnico_asignado || servicio.tecnico || 'No asignado',
              estado: servicio.estado || 'Pendiente',
              prioridad: servicio.prioridad || 'Normal',
              calificacion: servicio.calificacion || 0
            },
            // Costos
            costos: {
              costo_base: montoTotal,
              repuestos: costoRepuestos,
              costo_adicional: parseFloat(servicio.costo_adicional || 0),
              total: montoTotal
            },
            problemas_reportados: servicio.problemas_reportados || servicio.problemas || '',
            diagnostico: diagnosticoData,
            trabajo_realizado: servicio.trabajo_realizado || '',
            observaciones: servicio.observaciones || servicio.notas || '',
            monto: montoTotal,
            adelanto: servicio.adelanto || 0,
            saldo_pendiente: servicio.saldo_pendiente || 0,
            fotos: servicio.fotos || [],
            datos_entrega: servicio.datos_entrega || null,
            fecha: servicio.fecha || servicio.fecha_creacion || '',
            local: servicio.local || servicio.sucursal || '',
            estado: servicio.estado || 'Pendiente',
            historial_pagos: [] // se carga aparte
          };
            
            // Intentar cargar historial de pagos
            try {
              const histRes = await fetch(`/api/historial-pagos/${servicioId}`);
              if (histRes.ok) {
                reporteDesdeCache.historial_pagos = await histRes.json();
              }
            } catch (e) {
              console.warn('No se pudo cargar historial de pagos:', e);
            }
            
            this.reporteActual = reporteDesdeCache;
            this.servicioIdActual = servicioId;
            console.log('✅ Reporte construido desde caché:', reporteDesdeCache);
            return this.reporteActual;
          } else {
            console.log('⚠️ Datos incompletos en caché, consultando BD...');
          }
        } else {
          console.log('⚠️ Servicio no encontrado en caché, consultando BD...');
        }
      }
      
      // Fallback: Consultar BD si no hay caché o datos incompletos
      console.log('📡 Consultando BD para obtener datos completos...');
      
      // Intentar GET /api/reporte/ (funciona en desarrollo local)
      let response = await fetch(`/api/reporte/${servicioId}`);
      
      if (response.ok) {
        this.reporteActual = await response.json();
        this.servicioIdActual = servicioId;
        console.log('✅ Reporte obtenido desde /api/reporte/');
        return this.reporteActual;
      }
      
      // Fallback: usar POST a generar-pdf (funciona en Netlify)
      console.log('🔄 Usando fallback generar-pdf...');
      response = await fetch('/.netlify/functions/generar-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servicioId })
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        this.reporteActual = result.data;
        this.servicioIdActual = servicioId;
        console.log('✅ Reporte obtenido desde generar-pdf');
        return this.reporteActual;
      }
      
      throw new Error('Datos del reporte no disponibles');
    } catch (error) {
      console.error('Error al obtener reporte:', error);
      this.mostrarNotificacion('Error al cargar el reporte: ' + error.message, 'error');
      return null;
    }
  }

  /**
   * Mostrar modal con el reporte
   */
  async mostrarModal(servicioId) {
    // Obtener datos
    const reporte = await this.obtenerReporte(servicioId);
    if (!reporte) return;

    // Crear HTML del modal
    const html = this.generarHTMLReporte(reporte);
    
    // Crear o actualizar modal
    let modal = document.getElementById('modal-reporte');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-reporte';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = html;
    modal.style.display = 'flex';

    // Agregar event listeners
    this.agregarEventListeners(servicioId);
  }

  /**
   * Formatear diagnóstico (puede ser array o JSON string)
   */
  _formatearDiagnostico(diagnostico) {
    let items = [];
    
    try {
      if (Array.isArray(diagnostico)) {
        items = diagnostico;
      } else if (typeof diagnostico === 'string' && diagnostico.startsWith('[')) {
        items = JSON.parse(diagnostico);
      } else if (typeof diagnostico === 'string' && diagnostico) {
        return `<p style="margin-left: 20px;">${diagnostico}</p>`;
      } else {
        return '<p style="margin-left: 20px; color: #999;">Sin diagnóstico registrado</p>';
      }
    } catch (e) {
      if (diagnostico) {
        return `<p style="margin-left: 20px;">${diagnostico}</p>`;
      }
      return '<p style="margin-left: 20px; color: #999;">Sin diagnóstico registrado</p>';
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      return '<p style="margin-left: 20px; color: #999;">Sin diagnóstico registrado</p>';
    }
    
    return `
      <ul style="margin-left: 20px; margin-top: 5px;">
        ${items.map(d => `<li><strong>${d.descripcion || 'N/A'}</strong>: ${d.solucion || 'N/A'} (S/. ${d.costo || 0})</li>`).join('')}
      </ul>
    `;
  }

  /**
   * Generar HTML del reporte
   */
  generarHTMLReporte(reporte) {
    const { cliente, equipo, servicio, costos, datos_tecnicos, numero_orden } = reporte;

    // Validar numero_orden con fallbacks
    const ordenDisplay = numero_orden || reporte.numero_servicio || 'Sin número';

    const estrellas = datos_tecnicos.calificacion > 0
      ? '<i class="fas fa-star" style="color: #FFC107;"></i>'.repeat(datos_tecnicos.calificacion)
      : 'Sin calificación';
    
    return `
      <div class="modal-reporte-overlay" onclick="reporteServicio.cerrarModal()">
        <div class="modal-reporte-contenedor" onclick="event.stopPropagation()">
          
          <!-- Botón Cerrar -->
          <button class="btn-cerrar-modal" onclick="reporteServicio.cerrarModal()"><i class="fas fa-times"></i></button>

          <!-- Contenido -->
          <div class="reporte-contenido">
            
            <!-- Encabezado -->
            <div class="reporte-header">
              <h2><i class="fas fa-clipboard-list"></i> REPORTE DE SERVICIO</h2>
              <p class="orden-numero">Orden: <strong>${ordenDisplay}</strong></p>
            </div>

            <!-- Cliente -->
            <section class="reporte-seccion">
              <h3><i class="fas fa-user"></i> CLIENTE</h3>
              <p><strong>Nombre:</strong> ${cliente.nombre} ${cliente.apellido_paterno} ${cliente.apellido_materno}</p>
              <p><strong>DNI:</strong> ${cliente.dni}</p>
              <p><strong>Email:</strong> ${cliente.email}</p>
              <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
            </section>

            <!-- Equipo -->
            <section class="reporte-seccion">
              <h3><i class="fas fa-laptop"></i> EQUIPO</h3>
              <p><strong>Tipo:</strong> ${equipo.tipo_equipo}</p>
              <p><strong>Marca/Modelo:</strong> ${equipo.marca} ${equipo.modelo}</p>
              <p><strong>Serial:</strong> ${equipo.numero_serie}</p>
            </section>

            <!-- Servicio -->
            <section class="reporte-seccion">
              <h3><i class="fas fa-wrench"></i> SERVICIO</h3>
              <p><strong>Problema Reportado:</strong> ${servicio.descripcion_problema || servicio.problemas || servicio.problema_reportado || 'Sin descripción'}</p>
              <p><strong>Diagnóstico:</strong></p>
              ${this._formatearDiagnostico(servicio.diagnostico || servicio.diagnostico_tecnico)}
              <p><strong>Solución Aplicada:</strong> ${servicio.solucion_aplicada || servicio.solucion || servicio.trabajo_realizado || 'Pendiente'}</p>
            </section>

            <!-- Costos -->
            <section class="reporte-seccion">
              <h3><i class="fas fa-money-bill-wave"></i> COSTOS</h3>
              <table class="tabla-costos">
                <tr>
                  <td>Costo Base Servicio:</td>
                  <td>S/. ${costos.costo_base.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Repuestos Utilizados:</td>
                  <td>S/. ${costos.repuestos.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Costo Adicional:</td>
                  <td>S/. ${costos.costo_adicional.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td><strong>TOTAL:</strong></td>
                  <td><strong>S/. ${costos.total.toFixed(2)}</strong></td>
                </tr>
              </table>
            </section>

            <!-- Datos Técnicos -->
            <section class="reporte-seccion">
              <h3><i class="fas fa-cogs"></i> DATOS TÉCNICOS</h3>
              <p><strong>Técnico Asignado:</strong> ${datos_tecnicos.tecnico_asignado}</p>
              <p><strong>Estado:</strong> ${datos_tecnicos.estado}</p>
              <p><strong>Prioridad:</strong> ${datos_tecnicos.prioridad}</p>
              <p><strong>Calificación:</strong> ${estrellas}</p>
            </section>

          </div>

          <!-- Botones de Acción -->
          <div class="reporte-acciones">
            <button class="btn btn-descargar-pdf" onclick="reporteServicio.descargarPDF()">
              <i class="fas fa-file-pdf"></i> Descargar PDF
            </button>
            <button class="btn btn-imprimir-pdf" onclick="reporteServicio.imprimirReporte()">
              <i class="fas fa-print"></i> Imprimir PDF
            </button>
            <button class="btn btn-whatsapp" onclick="reporteServicio.enviarWhatsApp()">
              <i class="fab fa-whatsapp"></i> Enviar WhatsApp
            </button>
            <button class="btn btn-cerrar" onclick="reporteServicio.cerrarModal()">
              Cerrar
            </button>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Agregar event listeners a los botones
   */
  agregarEventListeners(servicioId) {
    // Los listeners se agregan inline en los botones (onclick)
  }

  /* ⚠️ FUNCIÓN DUPLICADA COMENTADA - La versión activa está en la línea 1044
  async descargarPDF(servicioId = null) {
    // ESTA FUNCIÓN ESTÁ DUPLICADA MÁS ABAJO EN LA LÍNEA 1044
    // SE HA COMENTADO PARA EVITAR CONFLICTOS
    // NO DESCOMENTAR - USAR LA VERSIÓN DE LA LÍNEA 1044
  }
  */

  /**
   * Imprimir reporte - Genera PDF y abre ventana de impresión
   * OPTIMIZADO: Usa obtenerReporte que intenta caché primero
   */
  async imprimirReporte(servicioId = null) {
    // Usar el servicioId pasado o el almacenado en la clase
    const idAUsar = servicioId || this.servicioIdActual;
    
    if (!idAUsar) {
      this.mostrarNotificacion('No hay servicio seleccionado', 'error');
      return;
    }

    console.log('🖨️ Preparando impresión para servicio:', idAUsar);

    try {
      // Mostrar indicador de carga
      this.mostrarNotificacion('⏳ Preparando impresión...', 'info');

      // 🚀 OPTIMIZACIÓN: Usar obtenerReporte que intenta caché primero
      const reporte = await this.obtenerReporte(idAUsar);
      
      if (!reporte) {
        throw new Error('No se pudieron obtener los datos del reporte');
      }
      
      // Generar PDF con jsPDF y abrir ventana de impresión
      this.mostrarNotificacion('🖨️ Abriendo ventana de impresión...', 'info');
      await this.generarPDFParaImprimir(reporte);
      
      this.mostrarNotificacion('✅ Ventana de impresión abierta', 'success');
      console.log('✅ Ventana de impresión abierta');
    } catch (error) {
      console.error('❌ Error al imprimir:', error);
      this.mostrarNotificacion('❌ Error al preparar impresión: ' + error.message, 'error');
    }
  }

  /**
   * Generar PDF y abrir ventana de impresión (sin descargar)
   * REFACTORIZADO: Usa constantes unificadas
   */
  async generarPDFParaImprimir(reporte) {
    // Asegurar que las constantes estén cargadas
    const CONST = await cargarConstantesPDF();
    const { COLORES, FUENTES, validarValor } = CONST;
    
    const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDFConstructor) {
      throw new Error('Librería PDF no disponible. Por favor recarga la página.');
    }

    const doc = new jsPDFConstructor();
    const numeroOrden = reporte.numero_orden || 'SN';
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 10;
    
    // ===== ENCABEZADO =====
    doc.setFillColor(...COLORES.primarioLight);
    doc.rect(0, 0, pageWidth, 28, 'F');
    
    // Logo
    const logoImg = '/images/logo-doctorpc.png';
    try {
      doc.addImage(logoImg, 'PNG', margin, 3, 22, 22);
    } catch (e) {
      console.warn('Logo no disponible');
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(FUENTES.xl3);
    doc.setFont(undefined, 'bold');
    doc.text('DOCTOR PC', margin + 26, 12);
    
    doc.setFontSize(FUENTES.sm);
    doc.setFont(undefined, 'normal');
    doc.text('Soluciones Informáticas Profesionales', margin + 26, 17);
    doc.text('Tel: 961 509 941 | Email: contacto@doctorpc.com', margin + 26, 22);
    
    // Número de orden
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 45, 5, 43, 18, 2, 2, 'F');
    doc.setTextColor(...COLORES.primarioLight);
    doc.setFontSize(FUENTES.sm);
    doc.setFont(undefined, 'bold');
    doc.text('ORDEN N°', pageWidth - margin - 43, 11);
    doc.setFontSize(FUENTES.xl);
    doc.text(String(numeroOrden), pageWidth - margin - 23, 19, { align: 'center' });
    
    y = 33;
    
    // Fecha
    const fechaEmision = new Date().toLocaleDateString('es-PE', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.setTextColor(...COLORES.textoClaro);
    doc.setFontSize(FUENTES.sm);
    doc.setFont(undefined, 'normal');
    doc.text(`Fecha de emisión: ${fechaEmision}`, pageWidth - margin, y, { align: 'right' });
    y += 8;
    
    // ===== CLIENTE Y EQUIPO EN DOS COLUMNAS =====
    const colWidth = (pageWidth - margin * 2 - 4) / 2;
    const col1X = margin;
    const col2X = margin + colWidth + 4;
    
    doc.setFillColor(...COLORES.primarioLight);
    doc.roundedRect(col1X, y, colWidth, 6, 1, 1, 'F');
    doc.roundedRect(col2X, y, colWidth, 6, 1, 1, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(FUENTES.md);
    doc.setFont(undefined, 'bold');
    doc.text('INFORMACIÓN DEL CLIENTE', col1X + colWidth / 2, y + 4, { align: 'center' });
    doc.text('EQUIPO RECIBIDO', col2X + colWidth / 2, y + 4, { align: 'center' });
    y += 8;
    
    const boxHeight = 26;
    doc.setFillColor(...COLORES.fondoClaro);
    doc.roundedRect(col1X, y, colWidth, boxHeight, 2, 2, 'F');
    doc.roundedRect(col2X, y, colWidth, boxHeight, 2, 2, 'F');
    
    doc.setFontSize(FUENTES.base);
    let cY = y + 5;
    const clienteNombre = `${reporte.cliente.nombre} ${reporte.cliente.apellido_paterno} ${reporte.cliente.apellido_materno}`.trim();
    
    // Cliente
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Cliente:', col1X + 3, cY);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(validarValor(clienteNombre).toUpperCase(), col1X + 18, cY, { maxWidth: colWidth - 21 });
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('DNI:', col1X + 3, cY + 5);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(validarValor(reporte.cliente.dni, 'Sin DNI'), col1X + 18, cY + 5);
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Teléfono:', col1X + 3, cY + 10);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(validarValor(reporte.cliente.telefono, 'Sin telefono'), col1X + 18, cY + 10);
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Email:', col1X + 3, cY + 15);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(validarValor(reporte.cliente.email, 'Sin email'), col1X + 18, cY + 15, { maxWidth: colWidth - 21 });
    
    // Equipo
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Tipo:', col2X + 3, cY);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(validarValor(reporte.equipo.tipo_equipo), col2X + 18, cY);
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Marca:', col2X + 3, cY + 5);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(validarValor(reporte.equipo.marca), col2X + 18, cY + 5);
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Modelo:', col2X + 3, cY + 10);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(validarValor(reporte.equipo.modelo), col2X + 18, cY + 10);
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('N° Serie:', col2X + 3, cY + 15);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(validarValor(reporte.equipo.numero_serie, 'Sin serie'), col2X + 18, cY + 15);
    
    y += boxHeight + 4;
    
    // ===== DETALLES DEL SERVICIO E INFORMACIÓN TÉCNICA =====
    const colWidth2 = (pageWidth - margin * 2 - 4) / 2;
    const col1X2 = margin;
    const col2X2 = margin + colWidth2 + 4;
    
    doc.setFillColor(...COLORES.primario);
    doc.roundedRect(col1X2, y, colWidth2, 6, 1, 1, 'F');
    doc.roundedRect(col2X2, y, colWidth2, 6, 1, 1, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('DETALLES DEL SERVICIO', col1X2 + colWidth2 / 2, y + 4, { align: 'center' });
    doc.text('INFORMACIÓN TÉCNICA', col2X2 + colWidth2 / 2, y + 4, { align: 'center' });
    y += 8;
    
    const boxHeight2 = 26;
    doc.setFillColor(...COLORES.fondoClaro);
    doc.roundedRect(col1X2, y, colWidth2, boxHeight2, 2, 2, 'F');
    doc.roundedRect(col2X2, y, colWidth2, boxHeight2, 2, 2, 'F');
    
    doc.setFontSize(8);
    let dY = y + 5;
    
    // Problema Reportado
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Problema Reportado:', col1X2 + 3, dY);
    
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.setFontSize(7);
    
    let problemaTexto = reporte.servicio.descripcion_problema;
    if (Array.isArray(problemaTexto)) {
      problemaTexto = problemaTexto.map(p => `- ${p}`).join('\n');
    }
    problemaTexto = validarValor(problemaTexto);
    
    const problemLines = doc.splitTextToSize(problemaTexto, colWidth2 - 6);
    doc.text(problemLines, col1X2 + 3, dY + 4);
    
    // Información Técnica
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Técnico:', col2X2 + 3, dY);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(validarValor(reporte.datos_tecnicos.tecnico_asignado, 'Sin asignar'), col2X2 + 18, dY);
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Estado:', col2X2 + 3, dY + 5);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(validarValor(reporte.datos_tecnicos.estado, 'Sin estado'), col2X2 + 18, dY + 5);
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Prioridad:', col2X2 + 3, dY + 10);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(validarValor(reporte.datos_tecnicos.prioridad, 'Normal'), col2X2 + 18, dY + 10);
    
    y += boxHeight2 + 6;
    
    // ===== DIAGNÓSTICO Y SOLUCIÓN =====
    doc.setFillColor(...COLORES.primario);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('DIAGNÓSTICO Y SOLUCIÓN', margin + (pageWidth - margin * 2) / 2, y + 4, { align: 'center' });
    y += 10;
    
    // Diagnóstico
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Diagnóstico:', margin + 3, y);
    y += 4;
    
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.setFontSize(7);
    
    let diagnosticoTexto = '';
    const diagnostico = reporte.servicio.diagnostico;
    
    if (Array.isArray(diagnostico) && diagnostico.length > 0) {
      diagnosticoTexto = diagnostico.map(d => 
        `• ${d.descripcion || 'N/A'}: ${d.solucion || 'N/A'} (S/. ${(d.costo || 0).toFixed(2)})`
      ).join('\n');
    } else if (typeof diagnostico === 'string' && diagnostico.trim()) {
      diagnosticoTexto = diagnostico;
    } else {
      diagnosticoTexto = 'Diagnóstico en proceso';
    }
    
    const diagLines = doc.splitTextToSize(diagnosticoTexto, pageWidth - margin * 2 - 6);
    doc.text(diagLines, margin + 3, y);
    y += diagLines.length * 3 + 4;
    
    // Solución
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Solución Aplicada:', margin + 3, y);
    y += 4;
    
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.setFontSize(7);
    const solucion = validarValor(reporte.servicio.solucion_aplicada || 'Pendiente');
    const solLines = doc.splitTextToSize(solucion, pageWidth - margin * 2 - 6);
    doc.text(solLines, margin + 3, y);
    y += solLines.length * 3 + 6;
    
    // ===== TABLA DE COSTOS =====
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFillColor(...COLORES.primario);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('COSTOS', margin + (pageWidth - margin * 2) / 2, y + 4, { align: 'center' });
    y += 10;
    
    // Tabla
    const tableX = margin + 10;
    const tableWidth = pageWidth - margin * 2 - 20;
    const col1Width = tableWidth * 0.6;
    const col2Width = tableWidth * 0.4;
    const rowH = 7;
    
    doc.setFontSize(8);
    
    // Encabezado
    doc.setFillColor(...COLORES.secundario);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.rect(tableX, y, col1Width, rowH, 'F');
    doc.text('CONCEPTO', tableX + 3, y + 5);
    doc.rect(tableX + col1Width, y, col2Width, rowH, 'F');
    doc.text('MONTO', tableX + col1Width + 3, y + 5);
    y += rowH;
    
    // Filas
    doc.setTextColor(...COLORES.texto);
    doc.setFont(undefined, 'normal');
    doc.setDrawColor(200, 200, 200);
    
    const costItems = [
      { label: 'Servicio Técnico', valor: reporte.costos.costo_base },
      { label: 'Repuestos', valor: reporte.costos.repuestos },
      { label: 'Adicionales', valor: reporte.costos.costo_adicional }
    ];
    
    costItems.forEach(item => {
      doc.setFillColor(250, 250, 250);
      doc.rect(tableX, y, col1Width, rowH, 'FD');
      doc.text(item.label, tableX + 3, y + 5);
      doc.rect(tableX + col1Width, y, col2Width, rowH, 'FD');
      doc.text(`S/. ${item.valor.toFixed(2)}`, tableX + col1Width + 3, y + 5);
      y += rowH;
    });
    
    // Subtotal
    const subtotal = reporte.costos.total / 1.18;
    doc.rect(tableX, y, col1Width, rowH, 'D');
    doc.text('Subtotal', tableX + 3, y + 5);
    doc.rect(tableX + col1Width, y, col2Width, rowH, 'D');
    doc.text(`S/. ${subtotal.toFixed(2)}`, tableX + col1Width + 3, y + 5);
    y += rowH;
    
    // IGV
    const igv = reporte.costos.total - subtotal;
    doc.rect(tableX, y, col1Width, rowH, 'D');
    doc.text('I.G.V. (18%)', tableX + 3, y + 5);
    doc.rect(tableX + col1Width, y, col2Width, rowH, 'D');
    doc.text(`S/. ${igv.toFixed(2)}`, tableX + col1Width + 3, y + 5);
    y += rowH;
    
    // Total
    doc.setFillColor(...COLORES.acento);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.rect(tableX, y, col1Width, rowH + 2, 'F');
    doc.text('TOTAL A PAGAR', tableX + 3, y + 6);
    doc.rect(tableX + col1Width, y, col2Width, rowH + 2, 'F');
    doc.text(`S/. ${reporte.costos.total.toFixed(2)}`, tableX + col1Width + 3, y + 6);
    y += rowH + 6;
    
    // ===== FIRMAS =====
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }
    
    y += 10;
    const firmaY = y;
    const firmaWidth = 60;
    const firma1X = margin + 20;
    const firma2X = pageWidth - margin - firmaWidth - 20;
    
    doc.setDrawColor(...COLORES.textoClaro);
    doc.line(firma1X, firmaY, firma1X + firmaWidth, firmaY);
    doc.line(firma2X, firmaY, firma2X + firmaWidth, firmaY);
    
    doc.setTextColor(...COLORES.textoClaro);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Firma del Técnico', firma1X + firmaWidth / 2, firmaY + 5, { align: 'center' });
    doc.text('Firma del Cliente', firma2X + firmaWidth / 2, firmaY + 5, { align: 'center' });
    
    // ===== TÉRMINOS Y CONDICIONES =====
    y = firmaY + 15;
    doc.setFontSize(7);
    doc.setTextColor(...COLORES.textoClaro);
    doc.setFont(undefined, 'bold');
    doc.text('TÉRMINOS Y CONDICIONES:', margin, y);
    y += 4;
    doc.setFont(undefined, 'normal');
    doc.text('• Garantía de 30 días en mano de obra. No cubre daños por mal uso.', margin, y);
    y += 3;
    doc.text('• El equipo no reclamado en 60 días se dará de baja sin previo aviso.', margin, y);
    y += 3;
    doc.text('• El cliente acepta los términos al firmar este documento.', margin, y);
    
    // Abrir ventana de impresión en lugar de descargar
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }

  /**
   * Imprimir reporte directamente sin descargar PDF
   * REFACTORIZADO: Usa constantes unificadas
   */
  async imprimirReporte(servicioId = null) {
    const idAUsar = servicioId || this.servicioIdActual;

    if (!idAUsar) {
      this.mostrarNotificacion('No hay servicio seleccionado', 'error');
      return;
    }

    // Asegurar que el reporte esté cargado
    if (idAUsar !== this.servicioIdActual || !this.reporteActual) {
      const reporte = await this.obtenerReporte(idAUsar);
      if (!reporte) return;
    }

    console.log('🖨️ Preparando impresión para servicio:', idAUsar);
    this.mostrarNotificacion('⏳ Preparando impresión...', 'info');

    // Reutilizar el mismo generador que descargarPDFLocal con flag imprimir=true
    await this.descargarPDFLocal(idAUsar, true);
  }
  /**
   * Descargar reporte como PDF usando jsPDF (generación en el cliente)
   */
  async descargarPDF(servicioId = null) {
    // Redirigir a la versión completa con diseño profesional
    return this.descargarPDFLocal(servicioId);
  }

  /**
   * Descargar PDF empresarial mejorado usando jsPDF
   * REFACTORIZADO: Usa constantes unificadas
   */
  async descargarPDFLocal(servicioId = null, imprimir = false) {
    // Asegurar que las constantes estén cargadas
    const CONST = await cargarConstantesPDF();
    const { COLORES, FUENTES, ESPACIADO, COLORES_ESTADO, EMPRESA, TERMINOS, validarValor, formatearFecha, formatearHora, formatearMoneda } = CONST;
    
    const idAUsar = servicioId || this.servicioIdActual;

    if (!this.reporteActual || (idAUsar && idAUsar !== this.servicioIdActual)) {
      if (!idAUsar) {
        this.mostrarNotificacion('No hay servicio seleccionado', 'error');
        return;
      }
      let reporte = await this.obtenerReporte(idAUsar);
      if (!reporte) {
        try {
          const response = await fetch('/.netlify/functions/generar-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ servicioId: idAUsar })
          });
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              this.reporteActual = result.data;
              this.servicioIdActual = idAUsar;
            }
          }
        } catch (e) {
          console.error('Error al obtener datos:', e);
        }
      }
    }

    if (!this.reporteActual) {
      this.mostrarNotificacion('No hay reporte cargado', 'error');
      return;
    }

    try {
      const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
      if (!jsPDFConstructor) {
        this.mostrarNotificacion('Libreria PDF no disponible. Por favor recarga la pagina.', 'error');
        return;
      }

      const doc = new jsPDFConstructor();
      const reporte = this.reporteActual;
      const numeroOrden = reporte.numero_orden || reporte.numero_servicio || '--------';

      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const m = 20;
      const contentW = pw - m * 2;
      let y = 0;

      // Helper: encabezado de seccion
      const secHeader = (x, w, titulo, color, subtitulo = null) => {
        const yStart = y;
        doc.setFillColor(...(color || COLORES.primarioLight));
        doc.roundedRect(x, yStart, w, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(FUENTES.base);
        doc.setFont(undefined, 'bold');
        doc.text(titulo, x + 10, yStart + 4);
        if (subtitulo) {
          doc.setFontSize(FUENTES.sm);
          doc.setFont(undefined, 'normal');
          doc.text(subtitulo, x + w - 2, yStart + 4, { align: 'right' });
        }
        y = yStart + 6;
        return y;
      };

      // Helper: campo label+valor — labelW dinámico si no se especifica
      const field = (x, yPos, label, valor, labelW) => {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...COLORES.primarioLight);
        doc.setFontSize(FUENTES.base);
        doc.text(label, x, yPos);
        // Si no se pasa labelW, calcularlo dinámicamente + 2px de gap
        const lw = labelW || (doc.getTextWidth(label) + 2);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...COLORES.texto);
        const valorText = validarValor(valor);
        doc.text(valorText, x + lw, yPos);
      };

      // ===== FRANJA SUPERIOR =====
      doc.setFillColor(...COLORES.primarioDark);
      doc.rect(0, 0, pw, 2.5, 'F');

      // ===== ENCABEZADO =====
      doc.setFillColor(...COLORES.primario);
      doc.rect(0, 2.5, pw, 22, 'F');

      // Logo — margen izquierdo de 0.2cm (≈ 2mm) desde el borde
      const logoX = m - 14; // pegado al margen izquierdo con 2mm de padding
      const logoY = 3.5;
      const logoSize = 18;
      try {
        doc.addImage('/images/logo-doctorpc.png', 'PNG', logoX, logoY, logoSize, logoSize);
      } catch (e) {
        // Si falla, dibujar círculo placeholder
        doc.setFillColor(255, 255, 255);
        doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 'F');
        doc.setTextColor(...COLORES.primario);
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.text('DC', logoX + logoSize / 2, logoY + logoSize / 2 + 2.5, { align: 'center' });
      }

      // Texto empresa — desplazado a la derecha del logo
      const textoX = logoX + logoSize + 3;
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(FUENTES.xl2);
      doc.setFont(undefined, 'bold');
      doc.text(EMPRESA.nombre, textoX, 12);
      doc.setFontSize(FUENTES.xs);
      doc.setFont(undefined, 'normal');
      doc.text(EMPRESA.slogan, textoX, 16.5);
      doc.text(`Tel: ${EMPRESA.telefono} | Email: ${EMPRESA.email}`, textoX, 20);
      doc.text(EMPRESA.ubicacion, textoX, 23);

      // Recuadro orden — margen derecho de 0.2cm (≈ 2mm) desde el borde
      const ordenX = pw - m - 40 + 14; // alineado con margen derecho + 2mm padding
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(ordenX, 6, 40, 15, 2, 2, 'F');
      doc.setTextColor(...COLORES.primario);
      doc.setFontSize(FUENTES.xs);
      doc.setFont(undefined, 'bold');
      doc.text('Orden de Servicio', ordenX + 20, 10, { align: 'center' });
      doc.setFontSize(FUENTES.xl);
      doc.setTextColor(...COLORES.primarioDark);
      doc.text(numeroOrden.toString(), ordenX + 20, 16.5, { align: 'center' });
      doc.setFontSize(5.5);
      doc.setTextColor(...COLORES.textoClaro);
      doc.text(`Emision: ${formatearFecha(new Date())}`, ordenX + 20, 19.5, { align: 'center' });

      y = 27;

      // ===== BARRA DE ESTADO =====
      const estado = validarValor(reporte.datos_tecnicos?.estado || reporte.estado);
      const estColor = COLORES_ESTADO[estado] || [117, 117, 117];

      doc.setFillColor(245, 245, 245);
      doc.rect(0, y, pw, 7, 'F');
      doc.setDrawColor(224, 224, 224);
      doc.line(0, y + 7, pw, y + 7);

      // Badge estado — ancho dinámico según el texto
      doc.setFontSize(FUENTES.xs);
      doc.setFont(undefined, 'bold');
      const badgeTextW = doc.getTextWidth(estado) + 6; // padding horizontal
      doc.setFillColor(...estColor);
      doc.roundedRect(m, y + 1, badgeTextW, 5, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(estado, m + badgeTextW / 2, y + 4.5, { align: 'center' });

      doc.setTextColor(...COLORES.textoClaro);
      doc.setFontSize(FUENTES.sm);
      doc.setFont(undefined, 'normal');
      let statusText = `Prioridad: `;
      doc.text(statusText, m + badgeTextW + 3, y + 4.5);
      doc.setFont(undefined, 'bold');
      doc.text(validarValor(reporte.datos_tecnicos?.prioridad, 'Normal'), m + badgeTextW + 3 + doc.getTextWidth(statusText), y + 4.5);
      
      doc.setFont(undefined, 'normal');
      let xPos = m + badgeTextW + 3 + doc.getTextWidth(statusText + validarValor(reporte.datos_tecnicos?.prioridad, 'Normal')) + 3;
      doc.text('|', xPos, y + 4.5);
      xPos += 3;
      
      doc.text('Sucursal: ', xPos, y + 4.5);
      doc.setFont(undefined, 'bold');
      doc.text(validarValor(reporte.local || reporte.sucursal), xPos + doc.getTextWidth('Sucursal: '), y + 4.5);
      
      doc.setFont(undefined, 'normal');
      xPos += doc.getTextWidth('Sucursal: ' + validarValor(reporte.local || reporte.sucursal)) + 3;
      doc.text('|', xPos, y + 4.5);
      xPos += 3;
      
      const fechaIng = reporte.fecha || reporte.fecha_creacion;
      if (fechaIng) {
        try {
          const d = new Date(fechaIng);
          const fechaStr = d.toLocaleDateString('es-PE', {day:'numeric', month:'numeric', year:'numeric'});
          const horaStr = d.toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit', hour12: true});
          doc.text('Ingreso: ', xPos, y + 4.5);
          doc.setFont(undefined, 'bold');
          doc.text(`${fechaStr} ${horaStr}`, xPos + doc.getTextWidth('Ingreso: '), y + 4.5);
          xPos += doc.getTextWidth(`Ingreso: ${fechaStr} ${horaStr}`) + 3;
        } catch(e) {
          doc.text(`Ingreso: ${fechaIng}`, xPos, y + 4.5);
          xPos += doc.getTextWidth(`Ingreso: ${fechaIng}`) + 3;
        }
      }
      
      // Fecha de entrega si aplica
      let entrega = null;
      if (reporte.datos_entrega) {
        entrega = typeof reporte.datos_entrega === 'string' ? JSON.parse(reporte.datos_entrega) : reporte.datos_entrega;
      }
      if (entrega?.fechaEntrega || estado === 'Entregado') {
        const fEnt = entrega?.fechaEntrega || reporte.fecha_entrega || '';
        const hEnt = entrega?.horaEntrega || '';
        if (fEnt) {
          doc.setFont(undefined, 'normal');
          doc.text('|', xPos, y + 4.5);
          xPos += 3;
          doc.text('Entrega: ', xPos, y + 4.5);
          doc.setFont(undefined, 'bold');
          doc.text(`${fEnt} ${hEnt}`.trim(), xPos + doc.getTextWidth('Entrega: '), y + 4.5);
        }
      }

      y = 35;

      // ===== CLIENTE + EQUIPO (2 columnas) =====
      const colW = (contentW - 3) / 2;
      const col1 = m;
      const col2 = m + colW + 3;
      const clienteNombre = `${reporte.cliente?.nombre || ''} ${reporte.cliente?.apellido_paterno || ''} ${reporte.cliente?.apellido_materno || ''}`.trim();

      const yCliente = y;
      secHeader(col1, colW, 'DATOS DEL CLIENTE');
      y = yCliente;
      secHeader(col2, colW, 'EQUIPO RECIBIDO');

      doc.setFillColor(...COLORES.fondoClaro);
      doc.rect(col1, y, colW, 22, 'F');
      doc.rect(col2, y, colW, 22, 'F');

      let fY = y + 4;
      field(col1 + 2, fY, 'Cliente:', validarValor(clienteNombre).toUpperCase(), 16);
      
      // DNI y Tel en la misma línea
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.primario);
      doc.setFontSize(7.5);
      doc.text('DNI:', col1 + 2, fY + 4.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(validarValor(reporte.cliente?.dni, 'Sin DNI'), col1 + 18, fY + 4.5);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.primario);
      doc.text('Tel:', col1 + 45, fY + 4.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(validarValor(reporte.cliente?.telefono, 'Sin telefono'), col1 + 56, fY + 4.5);
      
      field(col1 + 2, fY + 9, 'Email:', validarValor(reporte.cliente?.email, 'Sin email'), 16);
      field(col1 + 2, fY + 13.5, 'Direccion:', validarValor(reporte.cliente?.direccion, 'Sin direccion'), 22);

      // Tipo y Marca en la misma línea
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.primario);
      doc.setFontSize(7.5);
      doc.text('Tipo:', col2 + 2, fY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(validarValor(reporte.equipo?.tipo_equipo), col2 + 16, fY);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.primario);
      doc.text('Marca:', col2 + 45, fY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(validarValor(reporte.equipo?.marca), col2 + 60, fY);
      
      field(col2 + 2, fY + 4.5, 'Modelo:', validarValor(reporte.equipo?.modelo), 18);
      field(col2 + 2, fY + 9, 'N. Serie:', validarValor(reporte.equipo?.numero_serie, 'Sin serie'), 20);
      
      // Color y Acces en la misma línea
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.primario);
      doc.setFontSize(7.5);
      doc.text('Color:', col2 + 2, fY + 13.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(validarValor(reporte.equipo?.color, 'Sin color'), col2 + 18, fY + 13.5);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.primario);
      doc.text('Acces.:', col2 + 45, fY + 13.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(validarValor(reporte.equipo?.accesorios, 'Sin accesorios'), col2 + 60, fY + 13.5);

      y += 24;

      // ===== PROBLEMA REPORTADO =====
      doc.setFillColor(255, 248, 225);
      doc.setDrawColor(255, 224, 130);
      doc.rect(m, y, contentW, 12, 'FD');
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.primario);
      doc.text('Problema Reportado:', m + 2, y + 4);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      let probTxt = reporte.servicio?.descripcion_problema || reporte.problemas_reportados || '';
      if (Array.isArray(probTxt)) probTxt = probTxt.join(', ');
      const probLines = doc.splitTextToSize(validarValor(probTxt), contentW - 4);
      doc.setFontSize(6.5);
      doc.text(probLines.slice(0, 2), m + 2, y + 8);

      const obs = reporte.servicio?.observaciones || reporte.observaciones || '';
      if (obs && obs !== '--------') {
        doc.setFontSize(6);
        doc.setTextColor(230, 81, 0);
        doc.setFont(undefined, 'bold');
        doc.text(`Obs: "${validarValor(obs)}"`, m + 2, y + 11);
      }
      y += 14;

      // ===== DIAGNOSTICO TECNICO =====
      const diagnostico = reporte.servicio?.diagnostico || reporte.servicio?.diagnostico_tecnico || reporte.diagnostico || [];
      const tecnicoDiag = validarValor(reporte.servicio?.tecnico_diagnosticador || reporte.servicio?.tecnico_asignado);
      const diagArray = Array.isArray(diagnostico) ? diagnostico : [];

      secHeader(m, contentW, 'DIAGNOSTICO TECNICO');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont(undefined, 'normal');
      doc.text(`Tecnico: ${tecnicoDiag}`, pw - m - 2, y - 1.5, { align: 'right' });

      if (diagArray.length > 0) {
        // Header tabla
        const rH = 5.5;
        doc.setFillColor(...COLORES.primarioDark);
        doc.rect(m, y, contentW, rH, 'F');
        doc.setTextColor(...COLORES.fondo);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(6);
        doc.text('N.', m + 3, y + 4);
        doc.text('PROBLEMA ENCONTRADO', m + 10, y + 4);
        doc.text('SOLUCION PROPUESTA', m + contentW * 0.48, y + 4);
        doc.text('COSTO', pw - m - 2, y + 4, { align: 'right' });
        y += rH;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(6);
        diagArray.forEach((d, i) => {
          if (i % 2 === 0) { doc.setFillColor(248, 249, 250); doc.rect(m, y, contentW, rH, 'F'); }
          doc.setDrawColor(230, 230, 230);
          doc.line(m, y + rH, pw - m, y + rH);
          doc.setTextColor(...COLORES.texto);
          doc.text(`${i + 1}`, m + 3, y + 4);
          doc.text(validarValor(d.descripcion || d.problema), m + 10, y + 4);
          doc.text(validarValor(d.solucion), m + contentW * 0.48, y + 4);
          doc.setTextColor(...COLORES.primario);
          doc.setFont(undefined, 'bold');
          doc.text(`S/. ${parseFloat(d.costo || 0).toFixed(2)}`, pw - m - 2, y + 4, { align: 'right' });
          doc.setFont(undefined, 'normal');
          y += rH;
        });
      } else {
        doc.setFillColor(...COLORES.fondoClaro);
        doc.rect(m, y, contentW, 6, 'F');
        doc.setTextColor(...COLORES.textoClaro);
        doc.setFontSize(6.5);
        doc.text('Sin diagnostico registrado', m + 3, y + 4);
        y += 6;
      }
      y += 2;

      // ===== TRABAJO REALIZADO =====
      const trabajo = reporte.servicio?.solucion_aplicada || reporte.servicio?.trabajo_realizado || reporte.trabajo_realizado || '';
      if (trabajo) {
        doc.setFillColor(232, 245, 233);
        doc.setDrawColor(165, 214, 167);
        doc.rect(m, y, contentW, 10, 'FD');
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...COLORES.acento);
        doc.text('TRABAJO REALIZADO:', m + 2, y + 4);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...COLORES.texto);
        doc.setFontSize(6.5);
        const trabLines = doc.splitTextToSize(validarValor(trabajo), contentW - 4);
        doc.text(trabLines.slice(0, 2), m + 2, y + 8);
        y += 12;
      }

      // ===== RESUMEN FINANCIERO + DETALLE PAGOS (2 columnas) =====
      const yFinanciero = y;
      secHeader(col1, colW, 'RESUMEN FINANCIERO');
      y = yFinanciero;
      secHeader(col2, colW, 'DETALLE DE PAGOS');

      // Costos
      const costoBase = reporte.costos?.costo_base || 0;
      let costoRep = reporte.costos?.repuestos || 0;
      const costoAd = reporte.costos?.costo_adicional || 0;
      if (costoRep === 0 && diagArray.length > 0) {
        costoRep = diagArray.reduce((s, d) => s + parseFloat(d.costo || 0), 0);
      }
      const totalCalc = reporte.costos?.total || (costoBase + costoRep + costoAd);
      const sub = totalCalc / 1.18;
      const igv = totalCalc - sub;
      const adelanto = parseFloat(reporte.adelanto || reporte.costos?.adelanto || 0);
      const saldo = totalCalc - adelanto;

      const rH = 5;
      const costData = [
        { l: 'Mano de Obra', v: costoBase > 0 ? costoBase : totalCalc, z: true },
        { l: 'Repuestos', v: costoRep, z: false },
        { l: 'Adicionales', v: costoAd, z: true },
        { l: 'Subtotal', v: sub, z: false, bold: true },
        { l: 'I.G.V. (18%)', v: igv, z: true }
      ];

      let cYL = y;
      costData.forEach(item => {
        if (item.z) { doc.setFillColor(248, 249, 250); doc.rect(col1, cYL, colW, rH, 'F'); }
        doc.setDrawColor(230, 230, 230);
        doc.line(col1, cYL + rH, col1 + colW, cYL + rH);
        doc.setFont(undefined, item.bold ? 'bold' : 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...COLORES.texto);
        doc.text(item.l, col1 + 2, cYL + 3.5);
        doc.text(`S/. ${item.v.toFixed(2)}`, col1 + colW - 2, cYL + 3.5, { align: 'right' });
        cYL += rH;
      });

      // Total
      doc.setFillColor(...COLORES.primario);
      doc.rect(col1, cYL, colW, 6, 'F');
      doc.setTextColor(...COLORES.fondo);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.text('TOTAL', col1 + 2, cYL + 4.5);
      doc.text(`S/. ${totalCalc.toFixed(2)}`, col1 + colW - 2, cYL + 4.5, { align: 'right' });
      cYL += 6;

      // Detalle pagos — calcular altura total incluyendo historial
      const historial = reporte.historial_pagos || [];
      const hRH = 4.5;
      // Altura base: Adelanto + Saldo + (datos entrega si aplica)
      let boxPagosH = entrega ? 26 : 11;
      // Añadir espacio del historial si existe
      if (historial.length > 0) {
        boxPagosH += 2 + 4 + hRH + historial.length * hRH + 1; // sep + título + header + filas + padding
      }
      // El box debe ser al menos tan alto como la columna izquierda (costos)
      boxPagosH = Math.max(boxPagosH, cYL - y - 6);

      let cYR = y;
      doc.setFillColor(...COLORES.fondoClaro);
      doc.rect(col2, cYR, colW, boxPagosH, 'F');

      // ===== LÓGICA DE ETIQUETAS SEGÚN ESCENARIO DE PAGO =====
      // Si adelanto >= total → pagó todo al inicio (no es "adelanto", es "pagado")
      // Si adelanto > 0 y < total → sí es adelanto parcial
      // Si adelanto = 0 → no dejó adelanto
      const labelAdelanto = adelanto >= totalCalc
        ? 'Pagado:'
        : adelanto > 0
          ? 'Adelanto:'
          : 'Sin adelanto:';

      const labelSaldo = saldo <= 0 ? 'Saldo:' : 'Saldo pendiente:';

      // Adelanto y Saldo
      doc.setFontSize(6.5);
      field(col2 + 2, cYR + 3.5, labelAdelanto, `S/. ${adelanto.toFixed(2)}`);
      doc.setFont(undefined, 'bold');
      const saldoColor = saldo > 0 ? COLORES.textoClaro : COLORES.primario;
      doc.setTextColor(...saldoColor);
      doc.setFontSize(7);
      field(col2 + 2, cYR + 7.5, labelSaldo, `S/. ${saldo.toFixed(2)}`);

      let innerY = cYR + 10;

      if (entrega) {
        const cobradoEntrega = parseFloat(entrega.montoCobraHoy || 0);
        // Solo mostrar bloque de cobro si hubo cobro en entrega
        if (cobradoEntrega > 0 || entrega.metodoPago) {
          doc.setDrawColor(200, 200, 200);
          doc.setLineDashPattern([1.5, 1], 0);
          doc.line(col2 + 2, innerY, col2 + colW - 2, innerY);
          doc.setLineDashPattern([], 0);
          innerY += 2.5;
          // Si no hubo adelanto, el cobro en entrega es el pago total
          const labelCobro = adelanto === 0 ? 'Pagado en entrega:' : 'Cobrado en entrega:';
          field(col2 + 2, innerY, labelCobro, `S/. ${cobradoEntrega.toFixed(2)}`);
          field(col2 + 2, innerY + 4, 'Metodo:', validarValor(entrega.metodoPago, 'Sin metodo'));
          field(col2 + 2, innerY + 8, 'Comprobante:', validarValor(entrega.comprobanteEntrega, 'Sin comprobante'));
          innerY += 13;
        }
      }

      // Historial de pagos — dentro del mismo box, separado por línea punteada
      if (historial.length > 0) {
        innerY += 1;
        // Línea punteada separadora
        doc.setDrawColor(200, 200, 200);
        doc.setLineDashPattern([1.5, 1], 0);
        doc.line(col2 + 2, innerY, col2 + colW - 2, innerY);
        doc.setLineDashPattern([], 0);
        innerY += 2;

        // Título
        doc.setFontSize(6);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...COLORES.primario);
        doc.text('Historial de pagos:', col2 + 2, innerY + 2);
        innerY += 4;

        // Cabecera tabla
        const colFecha  = col2;
        const colMonto  = col2 + colW * 0.35;
        const colMetodo = col2 + colW * 0.58;
        const colRef    = col2 + colW * 0.80;

        doc.setFillColor(...COLORES.primario);
        doc.rect(colFecha, innerY, colW, hRH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(5.5);
        doc.setFont(undefined, 'bold');
        doc.text('Fecha',   colFecha  + 2, innerY + 3.2);
        doc.text('Monto',   colMonto  + 1, innerY + 3.2);
        doc.text('Metodo',  colMetodo + 1, innerY + 3.2);
        doc.text('Ref.',    colRef    + 1, innerY + 3.2);
        innerY += hRH;

        // Filas
        doc.setFont(undefined, 'normal');
        doc.setFontSize(5.5);
        historial.forEach((p, i) => {
          if (i % 2 === 0) {
            doc.setFillColor(235, 242, 248);
            doc.rect(colFecha, innerY, colW, hRH, 'F');
          }
          doc.setDrawColor(210, 225, 235);
          doc.line(colFecha, innerY + hRH, colFecha + colW, innerY + hRH);
          doc.setTextColor(...COLORES.texto);

          const fechaStr = p.fecha_pago
            ? new Date(p.fecha_pago).toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })
            : 'Sin fecha';

          doc.text(fechaStr,                                    colFecha  + 2, innerY + 3.2);
          doc.text(`S/. ${parseFloat(p.monto||0).toFixed(2)}`, colMonto  + 1, innerY + 3.2);
          doc.text(validarValor(p.metodo_pago, 'Sin metodo'),                 colMetodo + 1, innerY + 3.2);
          doc.text(validarValor(p.referencia, 'Sin ref.'),                  colRef    + 1, innerY + 3.2);
          innerY += hRH;
        });
      }

      // Badge pagado/pendiente — pegado al fondo del box
      const badgeY = cYR + boxPagosH;
      const badgeColor = saldo <= 0 ? COLORES.primarioDark : COLORES.textoClaro;
      doc.setFillColor(...badgeColor);
      doc.rect(col2, badgeY, colW, 6, 'F');
      doc.setTextColor(...COLORES.fondo);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(7);
      const badgeText = saldo <= 0 ? 'PAGADO COMPLETO' : `SALDO PENDIENTE: S/. ${saldo.toFixed(2)}`;
      doc.text(badgeText, col2 + colW / 2, badgeY + 4, { align: 'center' });

      // Ajustar cYL para que ambas columnas terminen al mismo nivel
      cYL = Math.max(cYL, badgeY + 6);

      y = cYL + 3;

      // ===== DATOS DE ENTREGA (si aplica) =====
      if (entrega || estado === 'Entregado') {
        // Guardar y antes de los dos headers para que queden al mismo nivel
        const yEntrega = y;
        secHeader(col1, colW, 'DATOS DE ENTREGA', COLORES.primario);
        y = yEntrega; // resetear para que el segundo header arranque igual
        secHeader(col2, colW, 'GARANTIA Y RECOMENDACIONES', COLORES.primario);

        const boxH = 20;
        doc.setFillColor(...COLORES.fondoClaro);
        doc.rect(col1, y, colW, boxH, 'F');
        doc.rect(col2, y, colW, boxH, 'F');

        let eY = y + 4;
        field(col1 + 2, eY, 'Recibido:', validarValor(entrega?.recibido_por || clienteNombre));
        field(col1 + 2, eY + 4.5, 'Fecha:', entrega?.fechaEntrega ? `${entrega.fechaEntrega} ${entrega.horaEntrega || ''}` : 'Sin fecha');
        field(col1 + 2, eY + 9, 'Encargado:', validarValor(entrega?.encargadoEntrega, 'Sin encargado'));
        field(col1 + 2, eY + 13.5, 'Estado eq.:', validarValor(entrega?.estadoEquipo, 'Sin estado'));

        field(col2 + 2, eY, 'Garantia:', validarValor(entrega?.garantiaHasta, 'Sin garantia'));
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...COLORES.primario);
        doc.text('Recomendaciones:', col2 + 2, eY + 5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...COLORES.texto);
        doc.setFontSize(6);
        const recLines = doc.splitTextToSize(validarValor(entrega?.recomendaciones, 'Sin recomendaciones'), colW - 4);
        doc.text(recLines.slice(0, 3), col2 + 2, eY + 9);

        y += boxH + 2;
      }

      // ===== FIRMAS (posicion fija en pie) =====
      const firmaY = ph - 32;
      const firmaW = 50;
      const firmaGap = (contentW - firmaW * 2) / 3;

      doc.setDrawColor(...COLORES.texto);
      doc.setLineWidth(0.3);

      const f1X = m + firmaGap;
      doc.line(f1X, firmaY, f1X + firmaW, firmaY);
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.texto);
      doc.text('Firma del Tecnico', f1X + firmaW / 2, firmaY + 4, { align: 'center' });
      doc.setFontSize(5.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.textoClaro);
      doc.text(validarValor(reporte.datos_tecnicos?.tecnico_asignado || reporte.servicio?.tecnico_asignado), f1X + firmaW / 2, firmaY + 7.5, { align: 'center' });

      const f2X = f1X + firmaW + firmaGap;
      doc.line(f2X, firmaY, f2X + firmaW, firmaY);
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.texto);
      doc.text('Firma del Cliente', f2X + firmaW / 2, firmaY + 4, { align: 'center' });
      doc.setFontSize(5.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.textoClaro);
      doc.text(validarValor(clienteNombre), f2X + firmaW / 2, firmaY + 7.5, { align: 'center' });
      doc.text(`DNI: ${validarValor(reporte.cliente?.dni, 'Sin DNI')}`, f2X + firmaW / 2, firmaY + 10.5, { align: 'center' });

      // ===== TERMINOS Y CONDICIONES (pie de pagina fijo) =====
      const tY = ph - 17;
      doc.setFillColor(245, 245, 245);
      doc.rect(0, tY - 1, pw, 18, 'F');
      doc.setDrawColor(...COLORES.primario);
      doc.line(0, tY - 1, pw, tY - 1);

      doc.setFontSize(6);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.texto);
      doc.text('TERMINOS Y CONDICIONES', pw / 2, tY + 2, { align: 'center' });

      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.textoClaro);
      doc.setFontSize(5);
      doc.text('1. La garantia de 30 dias cubre unicamente defectos en mano de obra. No incluye danos por mal uso, golpes, caidas o liquidos.', pw / 2, tY + 5.5, { align: 'center' });
      doc.text('2. Los equipos no recogidos en un plazo maximo de 30 dias calendario despues de la notificacion no seran sujeto de reclamo.', pw / 2, tY + 8.5, { align: 'center' });
      doc.text('3. Los repuestos reemplazados originales quedan en propiedad de DOCTOR PC salvo acuerdo previo por escrito.', pw / 2, tY + 11.5, { align: 'center' });
      doc.text('4. El cliente acepta haber recibido el equipo en las condiciones descritas en este documento al firmar.', pw / 2, tY + 14.5, { align: 'center' });

      // Guardar o imprimir según el flag
      const nombreArchivo = `Reporte-Servicio-${numeroOrden}.pdf`;
      if (imprimir) {
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = pdfUrl;
        document.body.appendChild(iframe);
        iframe.onload = function() {
          iframe.contentWindow.print();
          console.log('✓ Diálogo de impresión abierto');
        };
        this.mostrarNotificacion('<i class="fas fa-print"></i> Abriendo vista previa de impresión...', 'success');
      } else {
        doc.save(nombreArchivo);
        this.mostrarNotificacion(`<i class="fas fa-check-circle"></i> PDF descargado: ${nombreArchivo}`, 'success');
      }

    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.mostrarNotificacion('Error al generar PDF: ' + error.message, 'error');
    }
  }

  /**
   * Helper: Encabezado de sección compacto
   */
  _drawSectionHeaderCompacto(doc, y, rightEdge, leftEdge, titulo, COLORES) {
    const w = rightEdge - leftEdge;
    doc.setFillColor(...COLORES.primario);
    doc.rect(leftEdge, y, 3, 6, 'F');
    doc.setFillColor(248, 248, 248);
    doc.rect(leftEdge + 3, y, w - 3, 6, 'F');
    doc.setTextColor(...COLORES.primario);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text(titulo, leftEdge + 6, y + 4.5);
    return y + 9;
  }

  /**
   * Helper: Dibujar encabezado de sección moderno
   */
  _drawSectionHeaderModerno(doc, y, pageWidth, margin, titulo, COLORES) {
    const sectionH = 8;
    
    // Barra lateral de color
    doc.setFillColor(...COLORES.primario);
    doc.rect(margin, y, 3, sectionH, 'F');
    
    // Fondo claro
    doc.setFillColor(248, 248, 248);
    doc.rect(margin + 3, y, pageWidth - margin * 2 - 3, sectionH, 'F');
    
    // Texto
    doc.setTextColor(...COLORES.primario);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text(titulo, margin + 8, y + 5.5);
    
    return y + sectionH + 5;
  }

  /**
   * Enviar reporte por WhatsApp desde el modal de detalles
   */
  async enviarWhatsAppDesdeMotal(servicioId, telefono) {
    if (!servicioId) {
      this.mostrarNotificacion('Error: servicioId no especificado', 'error');
      return;
    }

    // Obtener el reporte primero
    const reporte = await this.obtenerReporte(servicioId);
    if (!reporte) return;

    await this.enviarWhatsApp(telefono);
  }

  /**
   * Enviar reporte por WhatsApp
   */
  async enviarWhatsApp(telefonoCliente = null) {
    if (!this.reporteActual) {
      this.mostrarNotificacion('No hay reporte cargado', 'error');
      return;
    }

    try {
      console.log('Preparando envío por WhatsApp...');
      
      const telCliente = telefonoCliente || this.reporteActual.cliente.telefono;
      
      if (!telCliente || telCliente === '--------') {
        this.mostrarNotificacion('El cliente no tiene teléfono registrado', 'error');
        return;
      }
      
      const telefonoLimpio = telCliente.replace(/\D/g, '');
      
      if (telefonoLimpio.length < 9) {
        this.mostrarNotificacion('Número de teléfono inválido', 'error');
        return;
      }
      
      const telefonoCompleto = telefonoLimpio.startsWith('51') ? telefonoLimpio : '51' + telefonoLimpio;
      
      // Intentar envío automático con WhatsApp Cloud API
      const envioAutomatico = await this.intentarEnvioAutomatico(telefonoCompleto);
      
      if (!envioAutomatico) {
        // Modo manual: descargar PDF + abrir WhatsApp Web
        console.log('📱 Usando método manual...');
        await this.descargarPDF();
        
        const reporte = this.reporteActual;
        const numeroOrden = reporte.numero_orden || reporte.numero_servicio || 'Sin número';
        const clienteNombre = `${reporte.cliente.nombre || ''} ${reporte.cliente.apellido_paterno || ''} ${reporte.cliente.apellido_materno || ''}`.trim();
        
        const mensaje = `Hola ${clienteNombre}! 👋\n\n` +
          `Le enviamos el reporte de su servicio:\n\n` +
          `📋 *Orden N°:* ${numeroOrden}\n` +
          `💻 *Equipo:* ${reporte.equipo.tipo_equipo} ${reporte.equipo.marca || ''}\n` +
          `📊 *Estado:* ${reporte.datos_tecnicos.estado}\n\n` +
          `Por favor adjunte el PDF que se acaba de descargar.\n\n` +
          `Gracias por confiar en *DOCTOR PC* 🔧`;
        
        const urlWhatsApp = `https://wa.me/${telefonoCompleto}?text=${encodeURIComponent(mensaje)}`;
        window.open(urlWhatsApp, '_blank');
        
        this.mostrarNotificacion(`<i class="fas fa-check-circle"></i> PDF descargado. Se abrió WhatsApp para ${telCliente}. Adjunta el PDF manualmente.`, 'success');
        
        setTimeout(() => {
          if (document.getElementById('modal-reporte')) {
            this.cerrarModal();
          }
        }, 2000);
      }

    } catch (error) {
      console.error('Error al enviar WhatsApp:', error);
      this.mostrarNotificacion('Error: ' + error.message, 'error');
    }
  }

  /**
   * Intentar envío automático con WhatsApp Cloud API
   */
  async intentarEnvioAutomatico(telefono) {
    try {
      console.log('🔍 Intentando envío automático con WhatsApp Cloud API...');
      
      // Siempre usar /api/ - en Netlify el redirect lo resuelve
      const endpoint = '/api/enviar-whatsapp-pdf';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicioId: this.servicioIdActual,
          telefono: telefono
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ PDF enviado automáticamente por WhatsApp:', result);
        this.mostrarNotificacion('✅ PDF enviado por WhatsApp exitosamente al ' + telefono, 'success');
        
        setTimeout(() => {
          if (document.getElementById('modal-reporte')) {
            this.cerrarModal();
          }
        }, 2000);
        
        return true;
      } else {
        const error = await response.json();
        console.warn('⚠️ API de WhatsApp no disponible:', error.error || error.details);
        return false;
      }
      
    } catch (error) {
      console.warn('⚠️ Error al intentar envío automático:', error.message);
      return false;
    }
  }

  /**
   * Cerrar modal
   */
  cerrarModal() {
    const modal = document.getElementById('modal-reporte');
    if (modal) {
      modal.style.display = 'none';
    }
  }
}

// Instancia global
const reporteServicio = new ReporteServicio();