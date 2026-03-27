/**
 * Netlify Function: Generar PDF con Puppeteer
 * Endpoint: /.netlify/functions/generar-pdf
 */

const { MongoClient, ObjectId } = require('mongodb');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'doctorpc';

/**
 * Generar HTML del reporte
 */
function generarHTMLReporte(data) {
  const val = (v) => (v && String(v).trim()) ? String(v).trim() : '--------';
  
  const clienteNombre = `${data.cliente.nombre} ${data.cliente.apellido_paterno} ${data.cliente.apellido_materno}`.trim();
  
  // Formatear diagnóstico
  let diagnosticoHTML = '<p style="margin-left: 20px; color: #999;">Sin diagnóstico registrado</p>';
  if (data.servicio.diagnostico) {
    try {
      let items = [];
      if (Array.isArray(data.servicio.diagnostico)) {
        items = data.servicio.diagnostico;
      } else if (typeof data.servicio.diagnostico === 'string' && data.servicio.diagnostico.startsWith('[')) {
        items = JSON.parse(data.servicio.diagnostico);
      } else if (typeof data.servicio.diagnostico === 'string' && data.servicio.diagnostico) {
        diagnosticoHTML = `<p style="margin-left: 20px;">${data.servicio.diagnostico}</p>`;
      }
      
      if (Array.isArray(items) && items.length > 0) {
        diagnosticoHTML = `
          <ul style="margin-left: 20px; margin-top: 5px;">
            ${items.map(d => `<li><strong>${d.descripcion || 'N/A'}</strong>: ${d.solucion || 'N/A'} (S/. ${d.costo || 0})</li>`).join('')}
          </ul>
        `;
      }
    } catch (e) {
      diagnosticoHTML = `<p style="margin-left: 20px;">${data.servicio.diagnostico}</p>`;
    }
  }
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Arial', sans-serif; 
      color: #333; 
      padding: 20px;
      font-size: 12px;
    }
    .header {
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left h1 { font-size: 24px; margin-bottom: 5px; }
    .header-left p { font-size: 11px; opacity: 0.9; }
    .orden-box {
      background: white;
      color: #2196F3;
      padding: 10px 20px;
      border-radius: 5px;
      text-align: center;
    }
    .orden-box .label { font-size: 10px; font-weight: bold; }
    .orden-box .numero { font-size: 18px; font-weight: bold; }
    .fecha { text-align: right; color: #666; font-size: 10px; margin-bottom: 15px; }
    .seccion {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
      border-left: 4px solid #2196F3;
    }
    .seccion h2 {
      color: #2196F3;
      font-size: 14px;
      margin-bottom: 10px;
      border-bottom: 2px solid #2196F3;
      padding-bottom: 5px;
    }
    .seccion p { margin: 5px 0; line-height: 1.6; }
    .seccion strong { color: #1976D2; }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .tabla-costos {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .tabla-costos td {
      padding: 8px;
      border: 1px solid #ddd;
    }
    .tabla-costos .total-row {
      background: #2196F3;
      color: white;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #2196F3;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>🖥️ DOCTOR PC</h1>
      <p>Soluciones Informáticas Profesionales</p>
      <p>Tel: 961 509 9414 | Email: contacto@doctorpc.com</p>
    </div>
    <div class="orden-box">
      <div class="label">ORDEN N°</div>
      <div class="numero">${data.numero_orden}</div>
    </div>
  </div>
  
  <div class="fecha">
    Fecha de emisión: ${new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>
  
  <div class="grid-2">
    <div class="seccion">
      <h2>👤 INFORMACIÓN DEL CLIENTE</h2>
      <p><strong>Cliente:</strong> ${val(clienteNombre).toUpperCase()}</p>
      <p><strong>DNI:</strong> ${val(data.cliente.dni)}</p>
      <p><strong>Teléfono:</strong> ${val(data.cliente.telefono)}</p>
      <p><strong>Email:</strong> ${val(data.cliente.email)}</p>
      <p><strong>Dirección:</strong> ${val(data.cliente.direccion)}</p>
    </div>
    
    <div class="seccion">
      <h2>💻 EQUIPO RECIBIDO</h2>
      <p><strong>Tipo:</strong> ${val(data.equipo.tipo_equipo)}</p>
      <p><strong>Marca:</strong> ${val(data.equipo.marca)}</p>
      <p><strong>Modelo:</strong> ${val(data.equipo.modelo)}</p>
      <p><strong>N° Serie:</strong> ${val(data.equipo.numero_serie)}</p>
    </div>
  </div>
  
  <div class="seccion">
    <h2>🔧 DETALLES DEL SERVICIO</h2>
    <p><strong>Problema Reportado:</strong></p>
    <p style="margin-left: 20px;">${val(data.servicio.descripcion_problema || data.servicio.problemas)}</p>
    
    <p style="margin-top: 10px;"><strong>Diagnóstico Técnico:</strong></p>
    ${diagnosticoHTML}
    
    <p style="margin-top: 10px;"><strong>Solución Aplicada:</strong></p>
    <p style="margin-left: 20px;">${val(data.servicio.solucion_aplicada || 'Pendiente')}</p>
  </div>
  
  <div class="seccion">
    <h2>💰 COSTOS</h2>
    <table class="tabla-costos">
      <tr>
        <td>Costo Base Servicio:</td>
        <td>S/. ${(data.costos.costo_base || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td>Repuestos Utilizados:</td>
        <td>S/. ${(data.costos.repuestos || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td>Costo Adicional:</td>
        <td>S/. ${(data.costos.costo_adicional || 0).toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL:</td>
        <td>S/. ${(data.costos.total || 0).toFixed(2)}</td>
      </tr>
    </table>
  </div>
  
  <div class="seccion">
    <h2>⚙️ INFORMACIÓN TÉCNICA</h2>
    <p><strong>Técnico Asignado:</strong> ${val(data.datos_tecnicos.tecnico_asignado)}</p>
    <p><strong>Estado:</strong> ${val(data.datos_tecnicos.estado)}</p>
    <p><strong>Prioridad:</strong> ${val(data.datos_tecnicos.prioridad)}</p>
  </div>
  
  <div class="footer">
    <p>Gracias por confiar en Doctor PC</p>
    <p>Este documento es un comprobante oficial del servicio técnico realizado</p>
  </div>
</body>
</html>
  `;
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
  let browser;
  
  try {
    const { servicioId } = JSON.parse(event.body);
    
    if (!servicioId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'servicioId es requerido' })
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
    
    // Buscar servicio
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
    
    // Obtener cliente
    let cliente = null;
    if (servicio.cliente_id && ObjectId.isValid(servicio.cliente_id)) {
      cliente = await db.collection('clientes').findOne({ _id: new ObjectId(servicio.cliente_id) });
    }
    
    // Obtener equipo
    let equipo = null;
    if (servicio.equipo_id && ObjectId.isValid(servicio.equipo_id)) {
      equipo = await db.collection('equipos').findOne({ _id: new ObjectId(servicio.equipo_id) });
    }
    
    // Preparar datos del reporte
    const reporteData = {
      numero_orden: servicio.numero_orden || servicio.numero_servicio || 'SN',
      cliente: {
        nombre: cliente?.nombre || '',
        apellido_paterno: cliente?.apellido_paterno || '',
        apellido_materno: cliente?.apellido_materno || '',
        dni: cliente?.dni || '',
        telefono: cliente?.telefono || '',
        email: cliente?.email || '',
        direccion: cliente?.direccion || ''
      },
      equipo: {
        tipo_equipo: equipo?.tipo_equipo || '',
        marca: equipo?.marca || '',
        modelo: equipo?.modelo || '',
        numero_serie: equipo?.numero_serie || ''
      },
      servicio: {
        descripcion_problema: servicio.problemas || servicio.descripcion_problema || '',
        diagnostico: servicio.diagnostico || servicio.diagnostico_tecnico || '',
        solucion_aplicada: servicio.solucion_aplicada || servicio.trabajo_realizado || ''
      },
      costos: {
        costo_base: parseFloat(servicio.monto || 0),
        repuestos: parseFloat(servicio.costo_repuestos || 0),
        costo_adicional: parseFloat(servicio.costo_adicional || 0),
        total: parseFloat(servicio.monto || 0)
      },
      datos_tecnicos: {
        tecnico_asignado: servicio.tecnico_asignado || 'No asignado',
        estado: servicio.estado || 'Pendiente',
        prioridad: servicio.prioridad || 'Normal'
      }
    };
    
    await client.close();
    
    // Generar HTML
    const html = generarHTMLReporte(reporteData);
    
    // Configurar Puppeteer para Netlify
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generar PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    
    await browser.close();
    
    // Retornar PDF como base64
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Reporte-${reporteData.numero_orden}.pdf"`
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true
    };
    
  } catch (error) {
    console.error('Error:', error);
    if (client) await client.close();
    if (browser) await browser.close();
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error al generar PDF',
        details: error.message
      })
    };
  }
};
