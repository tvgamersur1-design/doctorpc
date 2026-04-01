/**
 * Ruta para envío de WhatsApp con PDF (desarrollo local)
 * Usa WhatsApp Cloud API (gratis hasta 1000 msgs/mes)
 */

const axios = require('axios');
const FormData = require('form-data');
const { ObjectId } = require('mongodb');
const { jsPDF } = require('jspdf');

module.exports = function(app, db) {
  console.log('✅ Ruta de WhatsApp cargada: POST /api/enviar-whatsapp-pdf');
  
  /**
   * POST /api/enviar-whatsapp-pdf
   * Genera PDF y lo envía por WhatsApp Cloud API
   * Si la API no está configurada, retorna error 503 para que el frontend use modo manual
   */
  app.post('/api/enviar-whatsapp-pdf', async (req, res) => {
    try {
      const { servicioId, telefono } = req.body;
      
      console.log('📱 POST /api/enviar-whatsapp-pdf recibido');
      console.log('   servicioId:', servicioId);
      console.log('   telefono:', telefono);
      
      if (!servicioId || !telefono) {
        return res.status(400).json({ 
          error: 'servicioId y telefono son requeridos' 
        });
      }
      
      // Verificar configuración de WhatsApp Cloud API
      const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
      const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
      
      if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('⚠️ WhatsApp Cloud API no configurada');
        return res.status(503).json({
          error: 'WhatsApp Cloud API no configurada',
          details: 'Configura WHATSAPP_TOKEN y WHATSAPP_PHONE_ID en .env'
        });
      }
      
      // Validar ObjectId
      if (!ObjectId.isValid(servicioId)) {
        return res.status(400).json({ error: 'servicioId inválido' });
      }
      
      // Buscar servicio
      let servicio = await db.collection('servicio_equipo').findOne({ 
        _id: new ObjectId(servicioId) 
      });
      if (!servicio) {
        servicio = await db.collection('servicios').findOne({ 
          _id: new ObjectId(servicioId) 
        });
      }
      
      if (!servicio) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }
      
      console.log('✅ Servicio encontrado:', servicio.numero_orden || 'Sin número');
      
      // Obtener cliente
      let cliente = null;
      if (servicio.cliente_id && ObjectId.isValid(servicio.cliente_id)) {
        cliente = await db.collection('clientes').findOne({ 
          _id: new ObjectId(servicio.cliente_id) 
        });
      }
      if (!cliente && servicio.cliente_id) {
        cliente = await db.collection('clientes').findOne({ id: servicio.cliente_id });
      }
      
      // Obtener equipo
      let equipo = null;
      if (servicio.equipo_id && ObjectId.isValid(servicio.equipo_id)) {
        equipo = await db.collection('equipos').findOne({ 
          _id: new ObjectId(servicio.equipo_id) 
        });
      }
      if (!equipo && servicio.equipo_id) {
        equipo = await db.collection('equipos').findOne({ id: servicio.equipo_id });
      }
      
      const numeroOrden = servicio.numero_orden || servicio.numero_servicio || 'SN';
      const clienteNombre = cliente 
        ? `${cliente.nombre || ''} ${cliente.apellido_paterno || ''}`.trim() 
        : 'Cliente';
      const equipoInfo = equipo 
        ? `${equipo.tipo_equipo || 'Equipo'} ${equipo.marca || ''}`.trim() 
        : 'Equipo';
      const estado = servicio.estado || 'En proceso';
      
      // Generar PDF
      console.log('📄 Generando PDF...');
      const pdfBuffer = generarPDFReporte({
        numero_orden: numeroOrden,
        cliente: {
          nombre: cliente?.nombre || '',
          apellido_paterno: cliente?.apellido_paterno || '',
          apellido_materno: cliente?.apellido_materno || '',
          dni: cliente?.dni || '',
          telefono: cliente?.telefono || '',
          email: cliente?.email || ''
        },
        equipo: {
          tipo_equipo: equipo?.tipo_equipo || '',
          marca: equipo?.marca || '',
          modelo: equipo?.modelo || ''
        },
        servicio: servicio,
        estado: estado
      });
      
      const nombreArchivo = `Reporte-Servicio-${numeroOrden}.pdf`;
      
      // Preparar mensaje
      const mensaje = `Hola ${clienteNombre}! 👋\n\n` +
        `Adjunto el reporte de su servicio:\n` +
        `📋 Orden N°: ${numeroOrden}\n` +
        `💻 Equipo: ${equipoInfo}\n` +
        `📊 Estado: ${estado}\n\n` +
        `Gracias por confiar en DOCTOR PC 🔧`;
      
      // Limpiar número de teléfono
      const telefonoLimpio = telefono.replace(/\D/g, '');
      const telefonoCompleto = telefonoLimpio.startsWith('51') ? telefonoLimpio : '51' + telefonoLimpio;
      
      console.log('📤 Subiendo PDF a WhatsApp Cloud...');
      
      // 1. Subir PDF a WhatsApp Cloud API
      const formData = new FormData();
      formData.append('file', pdfBuffer, {
        filename: nombreArchivo,
        contentType: 'application/pdf'
      });
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', 'application/pdf');
      
      const uploadUrl = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/media`;
      
      const uploadResponse = await axios.post(uploadUrl, formData, {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          ...formData.getHeaders()
        }
      });
      
      const mediaId = uploadResponse.data.id;
      console.log('✅ PDF subido, mediaId:', mediaId);
      
      // 2. Enviar documento por WhatsApp
      const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`;
      
      const sendResponse = await axios.post(
        WHATSAPP_API_URL,
        {
          messaging_product: 'whatsapp',
          to: telefonoCompleto,
          type: 'document',
          document: {
            id: mediaId,
            caption: mensaje,
            filename: nombreArchivo
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ PDF enviado por WhatsApp exitosamente');
      
      return res.status(200).json({
        success: true,
        message: 'PDF enviado por WhatsApp exitosamente',
        telefono: telefonoCompleto,
        messageId: sendResponse.data.messages[0].id
      });
      
    } catch (error) {
      console.error('❌ Error en enviar-whatsapp-pdf:', error.response?.data || error.message);
      return res.status(500).json({
        error: 'Error al enviar PDF por WhatsApp',
        details: error.response?.data?.error?.message || error.message
      });
    }
  });
};

/**
 * Generar PDF del reporte de servicio (versión servidor)
 */
function generarPDFReporte(data) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 10;
  
  const COLORES = {
    primario: [33, 150, 243],
    secundario: [25, 118, 210],
    texto: [51, 51, 51],
    textoClaro: [102, 102, 102],
    fondoClaro: [245, 245, 245]
  };
  
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
  doc.text('Tel: 961 509 941 | Email: contacto@gmail.com', margin, 22);
  
  // Número de orden
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - margin - 45, 5, 43, 18, 2, 2, 'F');
  doc.setTextColor(...COLORES.primario);
  doc.setFontSize(7);
  doc.setFont(undefined, 'bold');
  doc.text('ORDEN N°', pageWidth - margin - 43, 11);
  doc.setFontSize(12);
  doc.text(String(data.numero_orden), pageWidth - margin - 23, 19, { align: 'center' });
  
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
  const val = (v) => (v && String(v).trim()) ? String(v).trim() : '--------';
  const colWidth = (pageWidth - margin * 2 - 4) / 2;
  const col1X = margin;
  const col2X = margin + colWidth + 4;
  
  // Encabezados de sección
  doc.setFillColor(...COLORES.primario);
  doc.roundedRect(col1X, y, colWidth, 6, 1, 1, 'F');
  doc.roundedRect(col2X, y, colWidth, 6, 1, 1, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('INFORMACIÓN DEL CLIENTE', col1X + colWidth / 2, y + 4, { align: 'center' });
  doc.text('EQUIPO RECIBIDO', col2X + colWidth / 2, y + 4, { align: 'center' });
  y += 8;
  
  // Contenido
  const boxHeight = 26;
  doc.setFillColor(...COLORES.fondoClaro);
  doc.roundedRect(col1X, y, colWidth, boxHeight, 2, 2, 'F');
  doc.roundedRect(col2X, y, colWidth, boxHeight, 2, 2, 'F');
  
  doc.setFontSize(8);
  let cY = y + 5;
  const clienteNombre = `${data.cliente.nombre} ${data.cliente.apellido_paterno} ${data.cliente.apellido_materno}`.trim();
  
  // Cliente info
  doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
  doc.text('Cliente:', col1X + 3, cY);
  doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
  doc.text(val(clienteNombre).toUpperCase(), col1X + 18, cY, { maxWidth: colWidth - 21 });
  
  doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
  doc.text('DNI:', col1X + 3, cY + 5);
  doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
  doc.text(val(data.cliente.dni), col1X + 18, cY + 5);
  
  doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
  doc.text('Teléfono:', col1X + 3, cY + 10);
  doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
  doc.text(val(data.cliente.telefono), col1X + 18, cY + 10);
  
  // Equipo info
  doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
  doc.text('Tipo:', col2X + 3, cY);
  doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
  doc.text(val(data.equipo.tipo_equipo), col2X + 18, cY);
  
  doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
  doc.text('Marca:', col2X + 3, cY + 5);
  doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
  doc.text(val(data.equipo.marca), col2X + 18, cY + 5);
  
  doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
  doc.text('Modelo:', col2X + 3, cY + 10);
  doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
  doc.text(val(data.equipo.modelo), col2X + 18, cY + 10);
  
  y += boxHeight + 5;
  
  // ESTADO
  doc.setFillColor(...COLORES.primario);
  doc.rect(margin, y, 3, 6, 'F');
  doc.setFillColor(248, 248, 248);
  doc.rect(margin + 3, y, pageWidth - margin * 2 - 3, 6, 'F');
  doc.setTextColor(...COLORES.primario);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.text(`ESTADO: ${data.estado}`, margin + 8, y + 4.5);
  
  y += 12;
  
  // PROBLEMA
  const problema = data.servicio.problemas_reportados || data.servicio.descripcion_problema || data.servicio.problemas || 'Sin descripción';
  doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
  doc.text('PROBLEMA REPORTADO:', margin, y);
  y += 5;
  doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
  doc.setFontSize(8);
  const problemLines = doc.splitTextToSize(val(problema), pageWidth - margin * 2);
  doc.text(problemLines, margin, y);
  y += problemLines.length * 4 + 5;
  
  // COSTOS
  const costoBase = parseFloat(data.servicio.costo_base || data.servicio.costo_servicio || 0);
  const costoFinal = parseFloat(data.servicio.costo_final || data.servicio.costo_total || costoBase);
  
  doc.setFont(undefined, 'bold'); doc.setTextColor(...COLORES.secundario);
  doc.setFontSize(9);
  doc.text('COSTOS:', margin, y);
  y += 5;
  doc.setFont(undefined, 'normal'); doc.setTextColor(...COLORES.texto);
  doc.setFontSize(8);
  doc.text(`Total: S/. ${costoFinal.toFixed(2)}`, margin, y);
  
  // PIE DE PÁGINA
  const pieY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(6);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLORES.texto);
  doc.text('TÉRMINOS Y CONDICIONES:', pageWidth / 2, pieY, { align: 'center' });
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORES.textoClaro);
  doc.text('• Garantía de 30 días en mano de obra. No incluye daños por mal uso.', pageWidth / 2, pieY + 3, { align: 'center' });
  doc.text('• Si su equipo no lo recoge en un máximo de 30 días, no hay opción de reclamo.', pageWidth / 2, pieY + 6, { align: 'center' });
  
  return Buffer.from(doc.output('arraybuffer'));
}
