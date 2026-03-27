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

// Instancia global
const reporteServicio = new ReporteServicio();
