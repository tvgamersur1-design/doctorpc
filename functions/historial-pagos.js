const { MongoClient, ObjectId } = require('mongodb');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

let cachedClient = null;

async function getMongoClient() {
  if (cachedClient) {
    return cachedClient;
  }
  
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI no configurado');
  }
  
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 25000,
    maxPoolSize: 5,
    minPoolSize: 1,
    retryWrites: true
  });
  
  await client.connect();
  cachedClient = client;
  return client;
}

exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;

    // Manejar preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const client = await getMongoClient();
        const db = client.db('doctorpc');
        const pagosCollection = db.collection('historial_pagos');
        
        const rawPath = event.rawUrl ? new URL(event.rawUrl).pathname : (event.path || '');
        const match = rawPath.match(/\/(?:api\/)?historial-pagos\/([^/?]+)/);
        const id = match ? match[1] : null;

        console.log(`[historial-pagos] ${event.httpMethod} path=${rawPath} ID=${id || 'none'}`);

        // GET /api/historial-pagos/:servicioId - Obtener historial de pagos de un servicio
        if (event.httpMethod === 'GET' && id) {
            const servicioId = id;
            
            const pagos = await pagosCollection
                .find({ servicio_id: servicioId })
                .sort({ fecha_pago: -1 })
                .toArray();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(pagos)
            };
        }

        // POST /api/historial-pagos - Registrar un nuevo pago
        if (event.httpMethod === 'POST' && !id) {
            const pago = JSON.parse(event.body);
            
            console.log('📝 Recibiendo pago para historial:', pago);
            
            const nuevoPago = {
                servicio_id: pago.servicio_id,
                numero_servicio: pago.numero_servicio,
                cliente_id: pago.cliente_id,
                monto: parseFloat(pago.monto),
                metodo_pago: pago.metodo_pago,
                referencia: pago.referencia || '',
                notas: pago.notas || '',
                fecha_pago: new Date().toISOString(),
                usuario_registro: pago.usuario_registro || 'Sistema',
                fecha_creacion: new Date().toISOString()
            };

            console.log('💾 Insertando en historial_pagos:', nuevoPago);
            
            const result = await pagosCollection.insertOne(nuevoPago);
            nuevoPago._id = result.insertedId;
            
            console.log('✅ Pago guardado en historial con ID:', result.insertedId);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(nuevoPago)
            };
        }
        
        console.log('❌ Ruta no encontrada:', event.httpMethod, rawPath);

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Ruta no encontrada' })
        };

    } catch (error) {
        console.error('Error en historial-pagos:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
