/**
 * Netlify Function: Enviar PDF por WhatsApp
 * Endpoint: /.netlify/functions/enviar-whatsapp-pdf
 */

const { MongoClient, ObjectId } = require('mongodb');
const { jsPDF } = require('jspdf');
const { enviarPDFPorWhatsApp } = require('./whatsapp-sender');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'doctorpc';

/**
 * Generar PDF del reporte de servicio
 */
function generarPDFReporte(data) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 10;
  
  const val = (v) => (v && String(v).trim()) ? String(v).trim() : '--------';
  
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
  doc.text('Tel: 961 509 9414 | Email: contacto@gmail.com', margin, 22);
  
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
  const clienteNombre = `${data.cliente.nombre} ${data.cliente.apellido_paterno} ${data.cliente.apellido_materno}`.trim();
  
  // Cliente
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
  
  // Equipo
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
  
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Handler de la función Netlify
 */
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }
  
  let client;
  
  try {
    const { servicioId, telefono } = JSON.parse(event.body);
    
    if (!servicioId || !telefono) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'servicioId y telefono son requeridos' })
      };
    }
    
    if (!ObjectId.isValid(servicioId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'servicioId inválido' })
      };
    }
    
    // Conectar a MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Buscar servicio en servicio_equipo o servicios
    let servicio = await db.collection('servicio_equipo').findOne({ _id: new ObjectId(servicioId) });
    if (!servicio) {
      servicio = await db.collection('servicios').findOne({ _id: new ObjectId(servicioId) });
    }
    
    if (!servicio) {
      await client.close();
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Servicio no encontrado' })
      };
    }
    
    // Obtener cliente por cliente_id
    let cliente = null;
    if (servicio.cliente_id && ObjectId.isValid(servicio.cliente_id)) {
      cliente = await db.collection('clientes').findOne({ _id: new ObjectId(servicio.cliente_id) });
    }
    if (!cliente && servicio.cliente_id) {
      cliente = await db.collection('clientes').findOne({ id: servicio.cliente_id });
    }
    
    // Obtener equipo por equipo_id
    let equipo = null;
    if (servicio.equipo_id && ObjectId.isValid(servicio.equipo_id)) {
      equipo = await db.collection('equipos').findOne({ _id: new ObjectId(servicio.equipo_id) });
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
      }
    });
    const nombreArchivo = `Reporte-Servicio-${numeroOrden}.pdf`;
    
    // Preparar mensaje
    const mensaje = `Hola ${clienteNombre}! 👋\n\n` +
      `Adjunto el reporte de su servicio:\n` +
      `📋 Orden N°: ${numeroOrden}\n` +
      `💻 Equipo: ${equipoInfo}\n\n` +
      `Gracias por confiar en DOCTOR PC 🔧`;
    
    // Enviar por WhatsApp
    console.log('📤 Enviando por WhatsApp...');
    const resultado = await enviarPDFPorWhatsApp(telefono, pdfBuffer, nombreArchivo, mensaje);
    
    await client.close();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'PDF enviado por WhatsApp exitosamente',
        ...resultado
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    if (client) await client.close();
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error al enviar PDF por WhatsApp',
        details: error.response?.data?.error?.message || error.message
      })
    };
  }
};
