/**
 * Módulo de Reporte de Servicios
 * Maneja visualización, descarga PDF y envío por WhatsApp
 */

class ReporteServicio {
  constructor() {
    this.reporteActual = null;
    this.servicioIdActual = null;
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
   */
  async obtenerReporte(servicioId) {
    try {
      console.log('🔍 Obteniendo reporte para servicio:', servicioId);
      const response = await fetch(`/api/reporte/${servicioId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      this.reporteActual = await response.json();
      this.servicioIdActual = servicioId;
      console.log(' Reporte obtenido y guardado para ID:', this.servicioIdActual);
      console.log(' Datos:', this.reporteActual);
      
      return this.reporteActual;
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
   * Imprimir reporte directamente sin descargar PDF
   */
  async imprimirReporte(servicioId = null) {
    // Si se pasa un servicioId, obtener el reporte primero
    if (servicioId && !this.reporteActual) {
      const reporte = await this.obtenerReporte(servicioId);
      if (!reporte) return;
    }

    if (!this.reporteActual) {
      this.mostrarNotificacion('No hay reporte cargado', 'error');
      return;
    }

    try {
      console.log('Generando PDF...');
      
      // jsPDF se carga como UMD y expone window.jspdf.jsPDF
      const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
      if (!jsPDFConstructor) {
        this.mostrarNotificacion('Librería PDF no disponible. Por favor recarga la página.', 'error');
        return;
      }

      const doc = new jsPDFConstructor();
      const reporte = this.reporteActual;
      const numeroOrden = reporte.numero_orden || reporte.numero_servicio || 'Sin número';

      // Validar datos críticos
      if (!reporte) {
        this.mostrarNotificacion('Error: No hay datos de reporte', 'error');
        return;
      }

      // Paleta de colores profesional
      const COLORES = {
        primario: [33, 150, 243],      // Azul corporativo
        secundario: [25, 118, 210],    // Azul oscuro
        acento: [76, 175, 80],         // Verde éxito
        texto: [51, 51, 51],           // Gris oscuro
        textoClaro: [102, 102, 102],   // Gris medio
        fondoClaro: [245, 245, 245],   // Gris claro
        blanco: [255, 255, 255]
      };

      // Configuración
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let y = 15;

      // ===== ENCABEZADO CON DISEÑO MEJORADO =====
      // Barra superior azul
      doc.setFillColor(...COLORES.primario);
      doc.rect(0, 0, pageWidth, 35, 'F');

      // Logo
      const logoImg = '/images/logo-doctorpc.png';
      try {
        doc.addImage(logoImg, 'PNG', margin, y, 25, 25);
      } catch (e) {
        console.warn('Logo no cargado');
      }

      // Título en blanco sobre fondo azul
      doc.setTextColor(...COLORES.blanco);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('REPORTE DE SERVICIO TÉCNICO', margin + 32, y + 10);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('Doctor PC - Soluciones Informáticas Profesionales', margin + 32, y + 17);
      doc.text('Tel: (01) 234-5678 | Email: contacto@doctorpc.com', margin + 32, y + 23);

      y = 45;

      // Información de orden y fecha en recuadro destacado
      doc.setFillColor(...COLORES.fondoClaro);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 3, 3, 'F');
      
      doc.setTextColor(...COLORES.texto);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`ORDEN DE SERVICIO: ${numeroOrden}`, margin + 5, y + 8);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const fechaEmision = new Date().toLocaleDateString('es-PE', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });
      doc.text(`Fecha de Emisión: ${fechaEmision}`, margin + 5, y + 15);
      
      // Estado del servicio con color
      const estadoX = pageWidth - margin - 45;
      const estadoColor = reporte.datos_tecnicos.estado === 'Completado' 
        ? COLORES.acento : COLORES.primario;
      doc.setFillColor(...estadoColor);
      doc.roundedRect(estadoX, y + 3, 40, 12, 2, 2, 'F');
      doc.setTextColor(...COLORES.blanco);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(reporte.datos_tecnicos.estado || 'N/A', estadoX + 20, y + 11, { align: 'center' });

      y += 30;

      // ===== CLIENTE =====
      y = this._drawSectionHeaderModerno(doc, y, pageWidth, margin, 'DATOS DEL CLIENTE', COLORES);
      doc.setTextColor(...COLORES.texto);
      doc.setFontSize(9);
      
      const clienteNombre = `${reporte.cliente.nombre} ${reporte.cliente.apellido_paterno} ${reporte.cliente.apellido_materno}`;
      
      // Usar tabla para mejor alineación
      const clienteData = [
        ['Nombre Completo:', clienteNombre.toUpperCase()],
        ['DNI:', reporte.cliente.dni || 'N/A'],
        ['Teléfono:', reporte.cliente.telefono || 'N/A'],
        ['Email:', reporte.cliente.email || 'N/A']
      ];
      
      clienteData.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...COLORES.secundario);
        doc.text(label, margin + 5, y);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...COLORES.texto);
        doc.text(value, margin + 40, y);
        y += 6;
      });
      
      y += 8;

      // ===== EQUIPO =====
      y = this._drawSectionHeaderModerno(doc, y, pageWidth, margin, 'INFORMACIÓN DEL EQUIPO', COLORES);
      doc.setFontSize(9);
      
      const equipoData = [
        ['Tipo de Equipo:', reporte.equipo.tipo_equipo || 'N/A'],
        ['Marca:', reporte.equipo.marca || 'N/A'],
        ['Modelo:', reporte.equipo.modelo || 'N/A'],
        ['Número de Serie:', reporte.equipo.numero_serie || 'N/A']
      ];
      
      equipoData.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...COLORES.secundario);
        doc.text(label, margin + 5, y);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...COLORES.texto);
        doc.text(value, margin + 40, y);
        y += 6;
      });
      
      y += 8;

      // ===== SERVICIO =====
      y = this._drawSectionHeaderModerno(doc, y, pageWidth, margin, 'DETALLES DEL SERVICIO', COLORES);
      doc.setFontSize(9);
      doc.setTextColor(...COLORES.texto);
      
      // Problema reportado con fondo
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Problema Reportado:', margin + 5, y);
      y += 5;
      
      doc.setFillColor(...COLORES.fondoClaro);
      const problema = reporte.servicio.descripcion_problema && reporte.servicio.descripcion_problema.trim() 
        ? reporte.servicio.descripcion_problema 
        : 'Sin descripción';
      const problemLines = doc.splitTextToSize(problema, pageWidth - margin * 2 - 10);
      const problemHeight = problemLines.length * 5 + 4;
      doc.roundedRect(margin + 5, y, pageWidth - margin * 2 - 10, problemHeight, 2, 2, 'F');
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(problemLines, margin + 8, y + 4);
      y += problemHeight + 6;

      // Diagnóstico técnico
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Diagnóstico Técnico:', margin + 5, y);
      y += 5;
      
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
      
      const diagLines = doc.splitTextToSize(diagnosticoTexto, pageWidth - margin * 2 - 10);
      const diagHeight = diagLines.length * 5 + 4;
      doc.setFillColor(...COLORES.fondoClaro);
      doc.roundedRect(margin + 5, y, pageWidth - margin * 2 - 10, diagHeight, 2, 2, 'F');
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(diagLines, margin + 8, y + 4);
      y += diagHeight + 6;

      // Solución aplicada
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Solución Aplicada:', margin + 5, y);
      y += 5;
      
      const solucion = reporte.servicio.solucion_aplicada && reporte.servicio.solucion_aplicada.trim()
        ? reporte.servicio.solucion_aplicada
        : 'Pendiente de completar';
      const solLines = doc.splitTextToSize(solucion, pageWidth - margin * 2 - 10);
      const solHeight = solLines.length * 5 + 4;
      doc.setFillColor(...COLORES.fondoClaro);
      doc.roundedRect(margin + 5, y, pageWidth - margin * 2 - 10, solHeight, 2, 2, 'F');
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(solLines, margin + 8, y + 4);
      y += solHeight + 10;

      // ===== COSTOS =====
      // Verificar si necesitamos nueva página
      if (y > pageHeight - 80) {
        doc.addPage();
        y = 20;
      }

      y = this._drawSectionHeader(doc, y, pageWidth, margin, 'COSTOS');
      y += 5;

      // Tabla de costos
      const tableX = margin;
      const colWidth = (pageWidth - margin * 2) / 2;
      const rowH = 10;

      // Encabezado
      doc.setFillColor(0, 0, 0);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.rect(tableX, y, colWidth, rowH, 'F');
      doc.text('ÍTEM', tableX + 3, y + 7);
      doc.rect(tableX + colWidth, y, colWidth, rowH, 'F');
      doc.text('MONTO', tableX + colWidth + 3, y + 7);
      y += rowH;

      // Filas
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setDrawColor(200, 200, 200);

      const subtotal = reporte.costos.total / 1.18;
      const igv = reporte.costos.total - subtotal;

      const costItems = [
        { label: 'Servicio', valor: reporte.costos.costo_base },
        { label: 'Repuestos', valor: reporte.costos.repuestos },
        { label: 'Adicional', valor: reporte.costos.costo_adicional },
        { label: 'Subtotal', valor: subtotal },
        { label: 'I.G.V. (18%)', valor: igv }
      ];

      costItems.forEach(item => {
        doc.rect(tableX, y, colWidth, rowH);
        doc.text(item.label, tableX + 3, y + 7);
        doc.rect(tableX + colWidth, y, colWidth, rowH);
        doc.text(`S/. ${item.valor.toFixed(2)}`, tableX + colWidth + 3, y + 7);
        y += rowH;
      });

      // Total
      doc.setFillColor(0, 0, 0);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.rect(tableX, y, colWidth, rowH, 'F');
      doc.text('TOTAL', tableX + 3, y + 7);
      doc.rect(tableX + colWidth, y, colWidth, rowH, 'F');
      doc.text(`S/. ${reporte.costos.total.toFixed(2)}`, tableX + colWidth + 3, y + 7);

      // Guardar
      const nombreArchivo = `reporte-${numeroOrden}.pdf`;
      doc.save(nombreArchivo);
      console.log('PDF descargado:', nombreArchivo);
      this.mostrarNotificacion(`<i class="fas fa-check-circle"></i> PDF descargado: ${nombreArchivo}`, 'success');

    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.mostrarNotificacion('Error al generar PDF: ' + error.message, 'error');
    }
  }

  /**
   * Imprimir reporte directamente sin descargar PDF
   */
  async imprimirReporte(servicioId = null) {
    // Usar el servicioId pasado o el almacenado en la clase
    const idAUsar = servicioId || this.servicioIdActual;
    
    // Si se pasa un servicioId diferente al actual, obtener el reporte primero
    if (idAUsar && idAUsar !== this.servicioIdActual) {
      const reporte = await this.obtenerReporte(idAUsar);
      if (!reporte) return;
    }

    if (!this.reporteActual) {
      this.mostrarNotificacion('No hay reporte cargado', 'error');
      return;
    }

    console.log('🖨️ Preparando impresión para servicio:', this.servicioIdActual);

    try {
      const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
      if (!jsPDFConstructor) {
        this.mostrarNotificacion('Librería PDF no disponible. Por favor recarga la página.', 'error');
        return;
      }

      const doc = new jsPDFConstructor();
      const reporte = this.reporteActual;
      const numeroOrden = reporte.numero_orden || reporte.numero_servicio || '--------';

      // Helper: mostrar '--------' si el dato está vacío
      const val = (v) => (v && String(v).trim() && String(v).trim() !== 'N/A') ? String(v).trim() : '--------';

      // Paleta de colores profesional
      const COLORES = {
        primario: [33, 150, 243],
        secundario: [25, 118, 210],
        acento: [76, 175, 80],
        texto: [51, 51, 51],
        textoClaro: [102, 102, 102],
        fondoClaro: [245, 245, 245],
        alerta: [255, 152, 0]
      };

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 10;

      // ===== ENCABEZADO PROFESIONAL =====
      doc.setFillColor(...COLORES.primario);
      doc.rect(0, 0, pageWidth, 28, 'F');

      const logoImg = '/images/logo-doctorpc.png';
      try {
        doc.addImage(logoImg, 'PNG', margin, 3, 22, 22);
      } catch (e) {
        console.warn('Logo no cargado');
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('DOCTOR PC', margin + 26, 12);
      
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.text('Soluciones Informáticas Profesionales', margin + 26, 17);
      doc.text('Tel: 961 509 9414 | Email: contacto@gmail.com', margin + 26, 22);

      // Número de orden
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - margin - 45, 5, 43, 18, 2, 2, 'F');
      doc.setTextColor(...COLORES.primario);
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.text('ORDEN N°', pageWidth - margin - 43, 11);
      doc.setFontSize(12);
      doc.text(numeroOrden.toString(), pageWidth - margin - 23, 19, { align: 'center' });

      y = 33;

      // Fecha de emisión
      const fechaEmision = new Date().toLocaleDateString('es-PE', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      doc.setTextColor(...COLORES.textoClaro);
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.text(`Fecha de emisión: ${fechaEmision}`, pageWidth - margin, y, { align: 'right' });
      y += 6;

      // ===== INFORMACIÓN DEL CLIENTE Y EQUIPO EN DOS COLUMNAS =====
      const clienteNombre = `${reporte.cliente.nombre || ''} ${reporte.cliente.apellido_paterno || ''} ${reporte.cliente.apellido_materno || ''}`.trim();
      const marcaModelo = `${reporte.equipo.marca || ''} ${reporte.equipo.modelo || ''}`.trim();
      
      const colWidth = (pageWidth - margin * 2 - 4) / 2;
      const col1X = margin;
      const col2X = margin + colWidth + 4;
      
      // ENCABEZADOS DE LAS DOS COLUMNAS
      doc.setFillColor(...COLORES.primario);
      doc.roundedRect(col1X, y, colWidth, 6, 1, 1, 'F');
      doc.roundedRect(col2X, y, colWidth, 6, 1, 1, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('INFORMACIÓN DEL CLIENTE', col1X + colWidth / 2, y + 4, { align: 'center' });
      doc.text('EQUIPO RECIBIDO', col2X + colWidth / 2, y + 4, { align: 'center' });
      
      y += 8;
      
      // CONTENIDO DE LAS DOS COLUMNAS
      const boxHeight = 26;
      doc.setFillColor(...COLORES.fondoClaro);
      doc.roundedRect(col1X, y, colWidth, boxHeight, 2, 2, 'F');
      doc.roundedRect(col2X, y, colWidth, boxHeight, 2, 2, 'F');
      
      doc.setFontSize(8);
      let cY = y + 5;
      
      // COLUMNA IZQUIERDA - INFORMACIÓN DEL CLIENTE
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Cliente:', col1X + 3, cY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(clienteNombre).toUpperCase(), col1X + 18, cY, { maxWidth: colWidth - 21 });
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('DNI:', col1X + 3, cY + 5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.cliente.dni), col1X + 18, cY + 5);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Teléfono:', col1X + 3, cY + 10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.cliente.telefono), col1X + 18, cY + 10);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Email:', col1X + 3, cY + 15);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.cliente.email), col1X + 18, cY + 15, { maxWidth: colWidth - 21 });
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Dirección:', col1X + 3, cY + 20);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.cliente.direccion), col1X + 18, cY + 20, { maxWidth: colWidth - 21 });
      
      // COLUMNA DERECHA - EQUIPO RECIBIDO
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Tipo:', col2X + 3, cY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.equipo.tipo_equipo), col2X + 18, cY);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Marca:', col2X + 3, cY + 5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.equipo.marca), col2X + 18, cY + 5);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Modelo:', col2X + 3, cY + 10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.equipo.modelo), col2X + 18, cY + 10);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('N° Serie:', col2X + 3, cY + 15);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.equipo.numero_serie), col2X + 18, cY + 15);
      
      y += boxHeight + 4;

      // ===== DETALLES DEL SERVICIO E INFORMACIÓN TÉCNICA EN DOS COLUMNAS =====
      const colWidth2 = (pageWidth - margin * 2 - 4) / 2;
      const col1X2 = margin;
      const col2X2 = margin + colWidth2 + 4;
      
      // ENCABEZADOS DE LAS DOS COLUMNAS
      doc.setFillColor(...COLORES.primario);
      doc.roundedRect(col1X2, y, colWidth2, 6, 1, 1, 'F');
      doc.roundedRect(col2X2, y, colWidth2, 6, 1, 1, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('DETALLES DEL SERVICIO', col1X2 + colWidth2 / 2, y + 4, { align: 'center' });
      doc.text('INFORMACIÓN TÉCNICA', col2X2 + colWidth2 / 2, y + 4, { align: 'center' });
      
      y += 8;
      
      // CONTENIDO DE LAS DOS COLUMNAS
      const boxHeight2 = 26;
      doc.setFillColor(...COLORES.fondoClaro);
      doc.roundedRect(col1X2, y, colWidth2, boxHeight2, 2, 2, 'F');
      doc.roundedRect(col2X2, y, colWidth2, boxHeight2, 2, 2, 'F');
      
      doc.setFontSize(8);
      let dY = y + 5;
      
      // COLUMNA IZQUIERDA - DETALLES DEL SERVICIO
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Problema Reportado:', col1X2 + 3, dY);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.setFontSize(7);
      
      let problemaTexto = reporte.servicio.descripcion_problema;
      if (Array.isArray(problemaTexto)) {
        problemaTexto = problemaTexto.map(p => `- ${p}`).join('\n');
      }
      problemaTexto = val(problemaTexto);
      
      const problemLines = doc.splitTextToSize(problemaTexto, colWidth2 - 6);
      doc.text(problemLines, col1X2 + 3, dY + 4);
      
      // COLUMNA DERECHA - INFORMACIÓN TÉCNICA
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Técnico:', col2X2 + 3, dY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.datos_tecnicos.tecnico_asignado), col2X2 + 18, dY);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Estado:', col2X2 + 3, dY + 5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.datos_tecnicos.estado), col2X2 + 18, dY + 5);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Prioridad:', col2X2 + 3, dY + 10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.datos_tecnicos.prioridad), col2X2 + 18, dY + 10);
      
      y += boxHeight2 + 4;

      // ===== DIAGNÓSTICO + COSTOS LADO A LADO =====
      const diagnostico = reporte.servicio.diagnostico || reporte.servicio.diagnostico_tecnico;
      const tecnicoDiag = val(reporte.servicio.tecnico_diagnosticador);

      // Calcular costos
      const costoBase = reporte.costos.costo_base || 0;
      let costoRepuestos = reporte.costos.repuestos || 0;
      const costoAdicional = reporte.costos.costo_adicional || 0;
      if (costoRepuestos === 0 && Array.isArray(diagnostico) && diagnostico.length > 0) {
        costoRepuestos = diagnostico.reduce((sum, d) => sum + (d.costo || 0), 0);
      }
      const totalCalculado = reporte.costos.total || (costoBase + costoRepuestos + costoAdicional);
      const subtotal = totalCalculado / 1.18;
      const igv = totalCalculado - subtotal;

      const gap = 3;
      const halfW = (pageWidth - margin * 2 - gap) / 2;
      const leftX = margin;
      const rightX = margin + halfW + gap;
      const rowH = 7;
      const startY = y;

      // ========== LADO IZQUIERDO: DIAGNÓSTICO ==========
      let yLeft = startY;

      if (Array.isArray(diagnostico) && diagnostico.length > 0) {
        // Encabezado
        doc.setFillColor(...COLORES.secundario);
        doc.rect(leftX, yLeft, halfW * 0.08, rowH, 'F');
        doc.rect(leftX + halfW * 0.08, yLeft, halfW * 0.37, rowH, 'F');
        doc.rect(leftX + halfW * 0.45, yLeft, halfW * 0.35, rowH, 'F');
        doc.rect(leftX + halfW * 0.80, yLeft, halfW * 0.20, rowH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(6);
        doc.text('N°', leftX + 2, yLeft + 5);
        doc.text('PROBLEMA', leftX + halfW * 0.08 + 2, yLeft + 5);
        doc.text('SOLUCIÓN', leftX + halfW * 0.45 + 2, yLeft + 5);
        doc.text('COSTO', leftX + halfW - 2, yLeft + 5, { align: 'right' });
        yLeft += rowH;

        // Filas
        doc.setFont(undefined, 'normal');
        doc.setFontSize(6);
        diagnostico.forEach((d, i) => {
          if (i % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(leftX, yLeft, halfW, rowH, 'F');
          }
          doc.setDrawColor(230, 230, 230);
          doc.line(leftX, yLeft + rowH, leftX + halfW, yLeft + rowH);
          doc.setTextColor(...COLORES.texto);
          doc.text(`${i + 1}`, leftX + 3, yLeft + 5);
          doc.text(val(d.descripcion), leftX + halfW * 0.08 + 2, yLeft + 5);
          doc.text(val(d.solucion), leftX + halfW * 0.45 + 2, yLeft + 5);
          doc.text(`S/. ${parseFloat(d.costo || 0).toFixed(2)}`, leftX + halfW - 2, yLeft + 5, { align: 'right' });
          yLeft += rowH;
        });

        // Técnico al final
        doc.setFillColor(...COLORES.fondoClaro);
        doc.rect(leftX, yLeft, halfW, rowH, 'F');
        doc.setDrawColor(230, 230, 230);
        doc.line(leftX, yLeft + rowH, leftX + halfW, yLeft + rowH);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...COLORES.secundario);
        doc.text(`Técnico: ${tecnicoDiag}`, leftX + 3, yLeft + 5);
        yLeft += rowH;
      } else {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...COLORES.texto);
        doc.text(`Diagnóstico: ${tecnicoDiag}`, leftX + 3, yLeft);
        yLeft += 4;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...COLORES.textoClaro);
        doc.text('--------', leftX + 3, yLeft);
        yLeft += 6;
      }

      // ========== LADO DERECHO: COSTOS ==========
      let yRight = startY;

      // Encabezado
      doc.setFillColor(...COLORES.secundario);
      doc.rect(rightX, yRight, halfW * 0.65, rowH, 'F');
      doc.rect(rightX + halfW * 0.65, yRight, halfW * 0.35, rowH, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(6);
      doc.text('CONCEPTO', rightX + 3, yRight + 5);
      doc.text('MONTO', rightX + halfW - 2, yRight + 5, { align: 'right' });
      yRight += rowH;

      doc.setTextColor(...COLORES.texto);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(6);

      const costItems = [
        { label: 'Servicio Técnico', valor: costoBase, zebra: true },
        { label: 'Repuestos', valor: costoRepuestos, zebra: false },
        { label: 'Adicionales', valor: costoAdicional, zebra: true }
      ];

      costItems.forEach(item => {
        if (item.zebra) {
          doc.setFillColor(250, 250, 250);
          doc.rect(rightX, yRight, halfW, rowH, 'F');
        }
        doc.setDrawColor(230, 230, 230);
        doc.line(rightX, yRight + rowH, rightX + halfW, yRight + rowH);
        doc.setTextColor(...COLORES.texto);
        doc.text(item.label, rightX + 3, yRight + 5);
        doc.text(`S/. ${item.valor.toFixed(2)}`, rightX + halfW - 2, yRight + 5, { align: 'right' });
        yRight += rowH;
      });

      // Subtotal
      doc.setFillColor(240, 240, 240);
      doc.rect(rightX, yRight, halfW, rowH, 'F');
      doc.setFont(undefined, 'bold');
      doc.text('Subtotal', rightX + 3, yRight + 5);
      doc.text(`S/. ${subtotal.toFixed(2)}`, rightX + halfW - 2, yRight + 5, { align: 'right' });
      yRight += rowH;

      // IGV
      doc.setFillColor(250, 250, 250);
      doc.rect(rightX, yRight, halfW, rowH, 'F');
      doc.setFont(undefined, 'normal');
      doc.text('I.G.V. (18%)', rightX + 3, yRight + 5);
      doc.text(`S/. ${igv.toFixed(2)}`, rightX + halfW - 2, yRight + 5, { align: 'right' });
      yRight += rowH;

      // Total
      doc.setFillColor(...COLORES.acento);
      doc.rect(rightX, yRight, halfW, rowH + 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text('TOTAL A PAGAR', rightX + 3, yRight + 5.5);
      doc.text(`S/. ${totalCalculado.toFixed(2)}`, rightX + halfW - 2, yRight + 5.5, { align: 'right' });
      yRight += rowH + 1;

      // Línea separadora vertical entre ambas tablas
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      const maxTableY = Math.max(yLeft, yRight);
      doc.line(margin + halfW + gap / 2, startY, margin + halfW + gap / 2, maxTableY);

      y = maxTableY + 4;

      // ===== FIRMAS - posición fija =====
      const pageHeight = doc.internal.pageSize.getHeight();
      const firmaY = pageHeight - 40;
      const firmaWidth = 50;
      const firmaSpacing = (pageWidth - margin * 2 - firmaWidth * 2) / 3;

      doc.setFontSize(7);
      doc.setTextColor(...COLORES.texto);
      doc.setFont(undefined, 'bold');

      const firma1X = margin + firmaSpacing;
      doc.setDrawColor(...COLORES.texto);
      doc.setLineWidth(0.3);
      doc.line(firma1X, firmaY, firma1X + firmaWidth, firmaY);
      doc.text('Firma del Técnico', firma1X + firmaWidth / 2, firmaY + 4, { align: 'center' });

      const firma2X = firma1X + firmaWidth + firmaSpacing;
      doc.line(firma2X, firmaY, firma2X + firmaWidth, firmaY);
      doc.text('Firma del Cliente', firma2X + firmaWidth / 2, firmaY + 4, { align: 'center' });

      // ===== TÉRMINOS Y CONDICIONES - pie de página fijo =====
      const pieY = pageHeight - 15;
      doc.setFontSize(6);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.texto);
      doc.text('TÉRMINOS Y CONDICIONES:', pageWidth / 2, pieY, { align: 'center' });

      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.textoClaro);
      doc.text('• Garantía de 30 días en mano de obra. No incluye daños por mal uso.', pageWidth / 2, pieY + 3, { align: 'center' });
      doc.text('• Si su equipo no lo recoge en un máximo de 30 días, no hay opción de reclamo.', pageWidth / 2, pieY + 6, { align: 'center' });

      // Abrir diálogo de impresión en lugar de descargar
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Crear iframe oculto para imprimir
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);
      
      iframe.onload = function() {
        iframe.contentWindow.print();
        console.log('✓ Diálogo de impresión abierto');
      };

      this.mostrarNotificacion('<i class="fas fa-print"></i> Abriendo vista previa de impresión...', 'success');

    } catch (error) {
      console.error('❌ Error al preparar impresión:', error);
      this.mostrarNotificacion('Error al preparar impresión: ' + error.message, 'error');
    }
  }

  /**
   * Descargar reporte como PDF usando jsPDF (generación en el cliente)
   */
  async descargarPDF(servicioId = null) {
    // Usar el servicioId pasado o el almacenado en la clase
    const idAUsar = servicioId || this.servicioIdActual;
    
    if (!idAUsar) {
      this.mostrarNotificacion('No hay servicio seleccionado', 'error');
      return;
    }

    console.log('📄 Generando PDF para servicio:', idAUsar);

    try {
      // Mostrar indicador de carga
      this.mostrarNotificacion('⏳ Obteniendo datos del reporte...', 'info');

      // Obtener datos desde la función serverless
      const response = await fetch('/.netlify/functions/generar-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ servicioId: idAUsar })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Error al obtener datos del reporte');
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Datos del reporte no disponibles');
      }

      const reporte = result.data;
      
      // Generar PDF con jsPDF
      this.mostrarNotificacion('📄 Generando PDF...', 'info');
      await this.generarPDFConJsPDF(reporte);
      
      this.mostrarNotificacion('✅ PDF descargado exitosamente', 'success');
      console.log('✅ PDF descargado');
    } catch (error) {
      console.error('❌ Error al descargar PDF:', error);
      this.mostrarNotificacion('❌ Error al generar PDF: ' + error.message, 'error');
    }
  }

  /**
   * Generar PDF usando jsPDF en el cliente
   */
  async generarPDFConJsPDF(reporte) {
    const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDFConstructor) {
      throw new Error('Librería PDF no disponible. Por favor recarga la página.');
    }

    const doc = new jsPDFConstructor();
    const numeroOrden = reporte.numero_orden || 'SN';
    
    const val = (v) => (v && String(v).trim()) ? String(v).trim() : '--------';
    
    const COLORES = {
      primario: [33, 150, 243],
      secundario: [25, 118, 210],
      texto: [51, 51, 51],
      textoClaro: [102, 102, 102],
      fondoClaro: [245, 245, 245]
    };
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 10;
    
    // ENCABEZADO
    doc.setFillColor(...COLORES.primario);
    doc.rect(0, 0, pageWidth, 28, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('DOCTOR PC', margin, 12);
    
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.text('Soluciones Informáticas Profesionales', margin, 17);
    doc.text('Tel: 961 509 9414 | Email: contacto@doctorpc.com', margin, 22);
    
    // Número de orden
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 45, 5, 43, 18, 2, 2, 'F');
    doc.setTextColor(...COLORES.primario);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.text('ORDEN N°', pageWidth - margin - 43, 11);
    doc.setFontSize(12);
    doc.text(String(numeroOrden), pageWidth - margin - 23, 19, { align: 'center' });
    
    y = 33;
    
    // Fecha
    const fechaEmision = new Date().toLocaleDateString('es-PE', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.setTextColor(...COLORES.textoClaro);
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.text(`Fecha de emisión: ${fechaEmision}`, pageWidth - margin, y, { align: 'right' });
    y += 8;
    
    // CLIENTE Y EQUIPO
    const colWidth = (pageWidth - margin * 2 - 4) / 2;
    const col1X = margin;
    const col2X = margin + colWidth + 4;
    
    doc.setFillColor(...COLORES.primario);
    doc.roundedRect(col1X, y, colWidth, 6, 1, 1, 'F');
    doc.roundedRect(col2X, y, colWidth, 6, 1, 1, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('INFORMACIÓN DEL CLIENTE', col1X + colWidth / 2, y + 4, { align: 'center' });
    doc.text('EQUIPO RECIBIDO', col2X + colWidth / 2, y + 4, { align: 'center' });
    y += 8;
    
    const boxHeight = 26;
    doc.setFillColor(...COLORES.fondoClaro);
    doc.roundedRect(col1X, y, colWidth, boxHeight, 2, 2, 'F');
    doc.roundedRect(col2X, y, colWidth, boxHeight, 2, 2, 'F');
    
    doc.setFontSize(8);
    let cY = y + 5;
    const clienteNombre = `${reporte.cliente.nombre} ${reporte.cliente.apellido_paterno} ${reporte.cliente.apellido_materno}`.trim();
    
    // Cliente
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Cliente:', col1X + 3, cY);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(val(clienteNombre).toUpperCase(), col1X + 18, cY, { maxWidth: colWidth - 21 });
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('DNI:', col1X + 3, cY + 5);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(val(reporte.cliente.dni), col1X + 18, cY + 5);
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Teléfono:', col1X + 3, cY + 10);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(val(reporte.cliente.telefono), col1X + 18, cY + 10);
    
    // Equipo
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Tipo:', col2X + 3, cY);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(val(reporte.equipo.tipo_equipo), col2X + 18, cY);
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Marca:', col2X + 3, cY + 5);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(val(reporte.equipo.marca), col2X + 18, cY + 5);
    
    doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
    doc.text('Modelo:', col2X + 3, cY + 10);
    doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
    doc.text(val(reporte.equipo.modelo), col2X + 18, cY + 10);
    
    y += boxHeight + 6;
    
    // SERVICIO
    doc.setFillColor(...COLORES.primario);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('DETALLES DEL SERVICIO', margin + (pageWidth - margin * 2) / 2, y + 4, { align: 'center' });
    y += 8;
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...COLORES.secundario);
    doc.text('Problema:', margin + 3, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...COLORES.texto);
    const problema = val(reporte.servicio.descripcion_problema);
    const problemLines = doc.splitTextToSize(problema, pageWidth - margin * 2 - 6);
    doc.text(problemLines, margin + 3, y + 4);
    y += 4 + problemLines.length * 4 + 4;
    
    // COSTOS
    doc.setFillColor(...COLORES.primario);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('COSTOS', margin + (pageWidth - margin * 2) / 2, y + 4, { align: 'center' });
    y += 10;
    
    doc.setFontSize(8);
    doc.setTextColor(...COLORES.texto);
    doc.setFont(undefined, 'normal');
    doc.text(`Costo Base: S/. ${reporte.costos.costo_base.toFixed(2)}`, margin + 3, y);
    y += 5;
    doc.text(`Repuestos: S/. ${reporte.costos.repuestos.toFixed(2)}`, margin + 3, y);
    y += 5;
    doc.text(`Adicional: S/. ${reporte.costos.costo_adicional.toFixed(2)}`, margin + 3, y);
    y += 5;
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: S/. ${reporte.costos.total.toFixed(2)}`, margin + 3, y);
    
    // Guardar
    const nombreArchivo = `Reporte-${numeroOrden}.pdf`;
    doc.save(nombreArchivo);
  }

  /**
   * FALLBACK: Descargar PDF usando jsPDF (solo para desarrollo local)
   */
  async descargarPDFLocal(servicioId = null) {
    // Usar el servicioId pasado o el almacenado en la clase
    const idAUsar = servicioId || this.servicioIdActual;
    
    // Si se pasa un servicioId diferente al actual, obtener el reporte primero
    if (idAUsar && idAUsar !== this.servicioIdActual) {
      const reporte = await this.obtenerReporte(idAUsar);
      if (!reporte) return;
    }

    if (!this.reporteActual) {
      this.mostrarNotificacion('No hay reporte cargado', 'error');
      return;
    }

    console.log('📄 Generando PDF LOCAL para servicio:', this.servicioIdActual);
    console.log('📊 Datos del reporte:', this.reporteActual);

    try {
      console.log('Generando PDF compacto en una página...');
      
      const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
      if (!jsPDFConstructor) {
        this.mostrarNotificacion('Librería PDF no disponible. Por favor recarga la página.', 'error');
        return;
      }

      const doc = new jsPDFConstructor();
      const reporte = this.reporteActual;
      const numeroOrden = reporte.numero_orden || reporte.numero_servicio || '--------';

      // Helper: mostrar '--------' si el dato está vacío
      const val = (v) => (v && String(v).trim() && String(v).trim() !== 'N/A') ? String(v).trim() : '--------';

      // Paleta de colores profesional
      const COLORES = {
        primario: [33, 150, 243],
        secundario: [25, 118, 210],
        acento: [76, 175, 80],
        texto: [51, 51, 51],
        textoClaro: [102, 102, 102],
        fondoClaro: [245, 245, 245],
        alerta: [255, 152, 0]
      };

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 10;

      // ===== ENCABEZADO PROFESIONAL =====
      doc.setFillColor(...COLORES.primario);
      doc.rect(0, 0, pageWidth, 28, 'F');

      const logoImg = '/images/logo-doctorpc.png';
      try {
        doc.addImage(logoImg, 'PNG', margin, 3, 22, 22);
      } catch (e) {
        console.warn('Logo no cargado');
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('DOCTOR PC', margin + 26, 12);
      
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.text('Soluciones Informáticas Profesionales', margin + 26, 17);
      doc.text('Tel: 961 509 9414 | Email: contacto@gmail.com', margin + 26, 22);

      // Número de orden
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - margin - 45, 5, 43, 18, 2, 2, 'F');
      doc.setTextColor(...COLORES.primario);
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.text('ORDEN N°', pageWidth - margin - 43, 11);
      doc.setFontSize(12);
      doc.text(numeroOrden.toString(), pageWidth - margin - 23, 19, { align: 'center' });

      y = 33;

      // Fecha de emisión
      const fechaEmision = new Date().toLocaleDateString('es-PE', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      doc.setTextColor(...COLORES.textoClaro);
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.text(`Fecha de emisión: ${fechaEmision}`, pageWidth - margin, y, { align: 'right' });
      y += 6;

      // ===== INFORMACIÓN DEL CLIENTE Y EQUIPO EN DOS COLUMNAS =====
      const clienteNombre = `${reporte.cliente.nombre || ''} ${reporte.cliente.apellido_paterno || ''} ${reporte.cliente.apellido_materno || ''}`.trim();
      const marcaModelo = `${reporte.equipo.marca || ''} ${reporte.equipo.modelo || ''}`.trim();
      
      const colWidth = (pageWidth - margin * 2 - 4) / 2; // Ancho de cada columna con separación
      const col1X = margin;
      const col2X = margin + colWidth + 4;
      
      // ENCABEZADOS DE LAS DOS COLUMNAS
      doc.setFillColor(...COLORES.primario);
      doc.roundedRect(col1X, y, colWidth, 6, 1, 1, 'F');
      doc.roundedRect(col2X, y, colWidth, 6, 1, 1, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('INFORMACIÓN DEL CLIENTE', col1X + colWidth / 2, y + 4, { align: 'center' });
      doc.text('EQUIPO RECIBIDO', col2X + colWidth / 2, y + 4, { align: 'center' });
      
      y += 8;
      
      // CONTENIDO DE LAS DOS COLUMNAS
      const boxHeight = 26;
      doc.setFillColor(...COLORES.fondoClaro);
      doc.roundedRect(col1X, y, colWidth, boxHeight, 2, 2, 'F');
      doc.roundedRect(col2X, y, colWidth, boxHeight, 2, 2, 'F');
      
      doc.setFontSize(8);
      let cY = y + 5;
      
      // COLUMNA IZQUIERDA - INFORMACIÓN DEL CLIENTE
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Cliente:', col1X + 3, cY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(clienteNombre).toUpperCase(), col1X + 18, cY, { maxWidth: colWidth - 21 });
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('DNI:', col1X + 3, cY + 5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.cliente.dni), col1X + 18, cY + 5);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Teléfono:', col1X + 3, cY + 10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.cliente.telefono), col1X + 18, cY + 10);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Email:', col1X + 3, cY + 15);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.cliente.email), col1X + 18, cY + 15, { maxWidth: colWidth - 21 });
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Dirección:', col1X + 3, cY + 20);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.cliente.direccion), col1X + 18, cY + 20, { maxWidth: colWidth - 21 });
      
      // COLUMNA DERECHA - EQUIPO RECIBIDO
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Tipo:', col2X + 3, cY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.equipo.tipo_equipo), col2X + 18, cY);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Marca:', col2X + 3, cY + 5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.equipo.marca), col2X + 18, cY + 5);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Modelo:', col2X + 3, cY + 10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.equipo.modelo), col2X + 18, cY + 10);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('N° Serie:', col2X + 3, cY + 15);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.equipo.numero_serie), col2X + 18, cY + 15);
      
      y += boxHeight + 4;

      // ===== DETALLES DEL SERVICIO E INFORMACIÓN TÉCNICA EN DOS COLUMNAS =====
      const colWidth2 = (pageWidth - margin * 2 - 4) / 2;
      const col1X2 = margin;
      const col2X2 = margin + colWidth2 + 4;
      
      // ENCABEZADOS DE LAS DOS COLUMNAS
      doc.setFillColor(...COLORES.primario);
      doc.roundedRect(col1X2, y, colWidth2, 6, 1, 1, 'F');
      doc.roundedRect(col2X2, y, colWidth2, 6, 1, 1, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('DETALLES DEL SERVICIO', col1X2 + colWidth2 / 2, y + 4, { align: 'center' });
      doc.text('INFORMACIÓN TÉCNICA', col2X2 + colWidth2 / 2, y + 4, { align: 'center' });
      
      y += 8;
      
      // CONTENIDO DE LAS DOS COLUMNAS
      const boxHeight2 = 26;
      doc.setFillColor(...COLORES.fondoClaro);
      doc.roundedRect(col1X2, y, colWidth2, boxHeight2, 2, 2, 'F');
      doc.roundedRect(col2X2, y, colWidth2, boxHeight2, 2, 2, 'F');
      
      doc.setFontSize(8);
      let dY = y + 5;
      
      // COLUMNA IZQUIERDA - DETALLES DEL SERVICIO
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Problema Reportado:', col1X2 + 3, dY);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.setFontSize(7);
      
      let problemaTexto = reporte.servicio.descripcion_problema;
      if (Array.isArray(problemaTexto)) {
        problemaTexto = problemaTexto.map(p => `- ${p}`).join('\n');
      }
      problemaTexto = val(problemaTexto);
      
      const problemLines = doc.splitTextToSize(problemaTexto, colWidth2 - 6);
      doc.text(problemLines, col1X2 + 3, dY + 4);
      
      // COLUMNA DERECHA - INFORMACIÓN TÉCNICA
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Técnico:', col2X2 + 3, dY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.datos_tecnicos.tecnico_asignado), col2X2 + 18, dY);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Estado:', col2X2 + 3, dY + 5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.datos_tecnicos.estado), col2X2 + 18, dY + 5);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.secundario);
      doc.text('Prioridad:', col2X2 + 3, dY + 10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.texto);
      doc.text(val(reporte.datos_tecnicos.prioridad), col2X2 + 18, dY + 10);
      
      y += boxHeight2 + 4;

      // ===== DIAGNÓSTICO + COSTOS LADO A LADO =====
      const diagnostico = reporte.servicio.diagnostico || reporte.servicio.diagnostico_tecnico;
      const tecnicoDiag = val(reporte.servicio.tecnico_diagnosticador);

      // Calcular costos
      const costoBase = reporte.costos.costo_base || 0;
      let costoRepuestos = reporte.costos.repuestos || 0;
      const costoAdicional = reporte.costos.costo_adicional || 0;
      if (costoRepuestos === 0 && Array.isArray(diagnostico) && diagnostico.length > 0) {
        costoRepuestos = diagnostico.reduce((sum, d) => sum + (d.costo || 0), 0);
      }
      const totalCalculado = reporte.costos.total || (costoBase + costoRepuestos + costoAdicional);
      const subtotal = totalCalculado / 1.18;
      const igv = totalCalculado - subtotal;

      const gap = 3;
      const halfW = (pageWidth - margin * 2 - gap) / 2;
      const leftX = margin;
      const rightX = margin + halfW + gap;
      const rowH = 7;
      const startY = y;

      // ========== LADO IZQUIERDO: DIAGNÓSTICO ==========
      let yLeft = startY;

      if (Array.isArray(diagnostico) && diagnostico.length > 0) {
        // Encabezado
        doc.setFillColor(...COLORES.secundario);
        doc.rect(leftX, yLeft, halfW * 0.08, rowH, 'F');
        doc.rect(leftX + halfW * 0.08, yLeft, halfW * 0.37, rowH, 'F');
        doc.rect(leftX + halfW * 0.45, yLeft, halfW * 0.35, rowH, 'F');
        doc.rect(leftX + halfW * 0.80, yLeft, halfW * 0.20, rowH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(6);
        doc.text('N°', leftX + 2, yLeft + 5);
        doc.text('PROBLEMA', leftX + halfW * 0.08 + 2, yLeft + 5);
        doc.text('SOLUCIÓN', leftX + halfW * 0.45 + 2, yLeft + 5);
        doc.text('COSTO', leftX + halfW - 2, yLeft + 5, { align: 'right' });
        yLeft += rowH;

        // Filas
        doc.setFont(undefined, 'normal');
        doc.setFontSize(6);
        diagnostico.forEach((d, i) => {
          if (i % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(leftX, yLeft, halfW, rowH, 'F');
          }
          doc.setDrawColor(230, 230, 230);
          doc.line(leftX, yLeft + rowH, leftX + halfW, yLeft + rowH);
          doc.setTextColor(...COLORES.texto);
          doc.text(`${i + 1}`, leftX + 3, yLeft + 5);
          doc.text(val(d.descripcion), leftX + halfW * 0.08 + 2, yLeft + 5);
          doc.text(val(d.solucion), leftX + halfW * 0.45 + 2, yLeft + 5);
          doc.text(`S/. ${parseFloat(d.costo || 0).toFixed(2)}`, leftX + halfW - 2, yLeft + 5, { align: 'right' });
          yLeft += rowH;
        });

        // Técnico al final
        doc.setFillColor(...COLORES.fondoClaro);
        doc.rect(leftX, yLeft, halfW, rowH, 'F');
        doc.setDrawColor(230, 230, 230);
        doc.line(leftX, yLeft + rowH, leftX + halfW, yLeft + rowH);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...COLORES.secundario);
        doc.text(`Técnico: ${tecnicoDiag}`, leftX + 3, yLeft + 5);
        yLeft += rowH;
      } else {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...COLORES.texto);
        doc.text(`Diagnóstico: ${tecnicoDiag}`, leftX + 3, yLeft);
        yLeft += 4;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...COLORES.textoClaro);
        doc.text('--------', leftX + 3, yLeft);
        yLeft += 6;
      }

      // ========== LADO DERECHO: COSTOS ==========
      let yRight = startY;

      // Encabezado
      doc.setFillColor(...COLORES.secundario);
      doc.rect(rightX, yRight, halfW * 0.65, rowH, 'F');
      doc.rect(rightX + halfW * 0.65, yRight, halfW * 0.35, rowH, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(6);
      doc.text('CONCEPTO', rightX + 3, yRight + 5);
      doc.text('MONTO', rightX + halfW - 2, yRight + 5, { align: 'right' });
      yRight += rowH;

      doc.setTextColor(...COLORES.texto);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(6);

      const costItems = [
        { label: 'Servicio Técnico', valor: costoBase, zebra: true },
        { label: 'Repuestos', valor: costoRepuestos, zebra: false },
        { label: 'Adicionales', valor: costoAdicional, zebra: true }
      ];

      costItems.forEach(item => {
        if (item.zebra) {
          doc.setFillColor(250, 250, 250);
          doc.rect(rightX, yRight, halfW, rowH, 'F');
        }
        doc.setDrawColor(230, 230, 230);
        doc.line(rightX, yRight + rowH, rightX + halfW, yRight + rowH);
        doc.setTextColor(...COLORES.texto);
        doc.text(item.label, rightX + 3, yRight + 5);
        doc.text(`S/. ${item.valor.toFixed(2)}`, rightX + halfW - 2, yRight + 5, { align: 'right' });
        yRight += rowH;
      });

      // Subtotal
      doc.setFillColor(240, 240, 240);
      doc.rect(rightX, yRight, halfW, rowH, 'F');
      doc.setFont(undefined, 'bold');
      doc.text('Subtotal', rightX + 3, yRight + 5);
      doc.text(`S/. ${subtotal.toFixed(2)}`, rightX + halfW - 2, yRight + 5, { align: 'right' });
      yRight += rowH;

      // IGV
      doc.setFillColor(250, 250, 250);
      doc.rect(rightX, yRight, halfW, rowH, 'F');
      doc.setFont(undefined, 'normal');
      doc.text('I.G.V. (18%)', rightX + 3, yRight + 5);
      doc.text(`S/. ${igv.toFixed(2)}`, rightX + halfW - 2, yRight + 5, { align: 'right' });
      yRight += rowH;

      // Total
      doc.setFillColor(...COLORES.acento);
      doc.rect(rightX, yRight, halfW, rowH + 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text('TOTAL A PAGAR', rightX + 3, yRight + 5.5);
      doc.text(`S/. ${totalCalculado.toFixed(2)}`, rightX + halfW - 2, yRight + 5.5, { align: 'right' });
      yRight += rowH + 1;

      // Línea separadora vertical entre ambas tablas
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      const maxTableY = Math.max(yLeft, yRight);
      doc.line(margin + halfW + gap / 2, startY, margin + halfW + gap / 2, maxTableY);

      y = maxTableY + 4;

      // ===== FIRMAS - posición fija =====
      const pageHeight = doc.internal.pageSize.getHeight();
      const firmaY = pageHeight - 40;
      const firmaWidth = 50;
      const firmaSpacing = (pageWidth - margin * 2 - firmaWidth * 2) / 3;

      doc.setFontSize(7);
      doc.setTextColor(...COLORES.texto);
      doc.setFont(undefined, 'bold');

      const firma1X = margin + firmaSpacing;
      doc.setDrawColor(...COLORES.texto);
      doc.setLineWidth(0.3);
      doc.line(firma1X, firmaY, firma1X + firmaWidth, firmaY);
      doc.text('Firma del Técnico', firma1X + firmaWidth / 2, firmaY + 4, { align: 'center' });

      const firma2X = firma1X + firmaWidth + firmaSpacing;
      doc.line(firma2X, firmaY, firma2X + firmaWidth, firmaY);
      doc.text('Firma del Cliente', firma2X + firmaWidth / 2, firmaY + 4, { align: 'center' });

      // ===== TÉRMINOS Y CONDICIONES - pie de página fijo =====
      const pieY = pageHeight - 15;
      doc.setFontSize(6);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORES.texto);
      doc.text('TÉRMINOS Y CONDICIONES:', pageWidth / 2, pieY, { align: 'center' });

      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORES.textoClaro);
      doc.text('• Garantía de 30 días en mano de obra. No incluye daños por mal uso.', pageWidth / 2, pieY + 3, { align: 'center' });
      doc.text('• Si su equipo no lo recoge en un máximo de 30 días, no hay opción de reclamo.', pageWidth / 2, pieY + 6, { align: 'center' });

      // Guardar PDF
      const nombreArchivo = `Reporte-Servicio-${numeroOrden}.pdf`;
      doc.save(nombreArchivo);
      console.log('✓ PDF generado:', nombreArchivo);
      this.mostrarNotificacion(`<i class="fas fa-check-circle"></i> PDF descargado: ${nombreArchivo}`, 'success');

    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
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
