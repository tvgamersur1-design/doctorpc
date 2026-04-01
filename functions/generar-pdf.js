/**
 * Netlify Function: Generar datos del reporte para PDF
 * Endpoint: /.netlify/functions/generar-pdf
 * 
 * Esta función solo obtiene los datos de MongoDB.
 * El PDF se genera en el cliente con jsPDF.
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'doctorpc';

/**
 * Handler de la función Netlify
 */
exports.handler = async (event, context) => {
  // Configurar headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Manejar preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }
  
  let client;
  
  try {
    const { servicioId } = JSON.parse(event.body);
    
    if (!servicioId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'servicioId es requerido' })
      };
    }
    
    if (!ObjectId.isValid(servicioId)) {
      return {
        statusCode: 400,
        headers,
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
        headers,
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
    
    // Parsear diagnóstico (puede ser JSON string o array)
    let diagnosticoData = servicio.diagnostico || servicio.diagnostico_tecnico || '';
    if (typeof diagnosticoData === 'string' && diagnosticoData.startsWith('[')) {
      try {
        diagnosticoData = JSON.parse(diagnosticoData);
      } catch (e) {
        // Si falla el parse, dejar como string
      }
    }

    // Calcular costo de repuestos desde diagnóstico si existe
    let costoRepuestos = parseFloat(servicio.costo_repuestos || 0);
    if (costoRepuestos === 0 && Array.isArray(diagnosticoData) && diagnosticoData.length > 0) {
      costoRepuestos = diagnosticoData.reduce((sum, d) => sum + parseFloat(d.costo || 0), 0);
    }

    // Extraer descripción del problema desde múltiples fuentes
    let descripcionProblema = servicio.problemas_reportados || servicio.descripcion_problema || servicio.problemas || '';
    if (Array.isArray(servicio.servicios) && servicio.servicios.length > 0 && !descripcionProblema) {
      descripcionProblema = servicio.servicios.map(s => s.nombre || s).join(', ');
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
        descripcion_problema: descripcionProblema,
        diagnostico: diagnosticoData,
        tecnico_diagnosticador: servicio.tecnico || '',
        solucion_aplicada: servicio.solucion_aplicada || servicio.trabajo_realizado || ''
      },
      costos: {
        costo_base: parseFloat(servicio.monto || servicio.costo_total || 0),
        repuestos: costoRepuestos,
        costo_adicional: parseFloat(servicio.costo_adicional || 0),
        total: parseFloat(servicio.monto || servicio.costo_total || 0)
      },
      datos_tecnicos: {
        tecnico_asignado: servicio.tecnico || servicio.tecnico_asignado || 'No asignado',
        estado: servicio.estado || 'Pendiente',
        prioridad: servicio.prioridad || 'Normal'
      }
    };
    
    await client.close();
    
    // Retornar datos en JSON para que el cliente genere el PDF
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: reporteData
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    if (client) await client.close();
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error al obtener datos del reporte',
        details: error.message
      })
    };
  }
};

