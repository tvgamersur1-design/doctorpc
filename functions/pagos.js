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
  
  try {
    await client.connect();
    cachedClient = client;
    return client;
  } catch (error) {
    cachedClient = null;
    throw error;
  }
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'MONGODB_URI no configurado' })
      };
    }

    const client = await getMongoClient();
    const db = client.db('doctorpc');

    const httpMethod = event.httpMethod;
    const rawPath = event.rawUrl ? new URL(event.rawUrl).pathname : (event.path || '');
    const match = rawPath.match(/\/(?:api\/)?pagos\/([^/?]+)/);
    const id = match ? match[1] : null;

    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {}
    }

    console.log(`[pagos] ${httpMethod} path=${rawPath} ID=${id || 'none'}`);

    // GET /pagos - Obtener todos los pagos
    if (httpMethod === 'GET' && !id) {
      console.log('[pagos] Obteniendo lista de pagos...');
      
      const pagos = await db.collection('pagos')
        .find({})
        .sort({ fecha_pago: -1 })
        .toArray();
      
      console.log(`[pagos] ${pagos.length} pagos encontrados`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(pagos)
      };
    }

    // GET /pagos/:id - Obtener un pago específico
    if (httpMethod === 'GET' && id) {
      console.log(`[pagos] Obteniendo pago con ID: ${id}`);
      
      const pago = await db.collection('pagos').findOne({ _id: new ObjectId(id) });
      
      if (!pago) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Pago no encontrado' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(pago)
      };
    }

    // POST /pagos - Crear nuevo pago
    if (httpMethod === 'POST') {
      console.log('[pagos] Creando nuevo pago...');
      console.log('[pagos] Datos recibidos:', JSON.stringify(body, null, 2));
      
      const { servicio_equipo_id, monto_pagado, metodo_pago, numero_referencia, notas } = body;
      
      if (!servicio_equipo_id || !monto_pagado || !metodo_pago) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Faltan campos requeridos: servicio_equipo_id, monto_pagado, metodo_pago' })
        };
      }
      
      // Obtener el servicio
      const servicio = await db.collection('servicios').findOne({ _id: new ObjectId(servicio_equipo_id) });
      
      if (!servicio) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Servicio no encontrado' })
        };
      }
      
      // Crear registro de pago
      const nuevoPago = {
        servicio_equipo_id: new ObjectId(servicio_equipo_id),
        cliente_id: servicio.cliente_id,
        monto_pagado: parseFloat(monto_pagado),
        metodo_pago,
        numero_referencia: numero_referencia || null,
        fecha_pago: new Date().toISOString(),
        registrado_por: body.registrado_por || 'sistema',
        notas: notas || '',
        estado: 'confirmado',
        fecha_creacion: new Date().toISOString()
      };
      
      const result = await db.collection('pagos').insertOne(nuevoPago);
      
      console.log('[pagos] Pago insertado en BD, ahora actualizando servicio...');
      
      // Actualizar el servicio con el nuevo monto pagado
      const montoTotalActual = parseFloat(servicio.monto || servicio.costo_total || 0);
      const montoPagadoActual = parseFloat(servicio.adelanto || 0);
      const nuevoMontoPagado = montoPagadoActual + parseFloat(monto_pagado);
      const nuevoSaldoPendiente = montoTotalActual - nuevoMontoPagado;
      
      console.log('[pagos] Cálculos:', {
        servicio_id: servicio_equipo_id,
        montoTotalActual,
        montoPagadoActual,
        montoPago: parseFloat(monto_pagado),
        nuevoMontoPagado,
        nuevoSaldoPendiente
      });
      
      let estadoPago = 'pendiente';
      if (montoTotalActual === 0) {
        estadoPago = 'pendiente';
      } else if (nuevoMontoPagado >= montoTotalActual) {
        estadoPago = 'pagado';
      } else if (nuevoMontoPagado > 0) {
        estadoPago = 'parcial';
      }
      
      console.log('[pagos] Estado de pago calculado:', estadoPago);
      
      const updateResult = await db.collection('servicios').updateOne(
        { _id: new ObjectId(servicio_equipo_id) },
        { 
          $set: { 
            adelanto: nuevoMontoPagado,
            saldo_pendiente: nuevoSaldoPendiente,
            estado_pago: estadoPago,
            fecha_actualizacion: new Date().toISOString()
          } 
        }
      );
      
      console.log('[pagos] Resultado de actualización del servicio:', {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
        acknowledged: updateResult.acknowledged
      });
      
      if (updateResult.modifiedCount === 0) {
        console.warn('[pagos] ⚠️ ADVERTENCIA: El servicio no fue modificado');
      } else {
        console.log('[pagos] ✅ Servicio actualizado exitosamente');
      }
      
      console.log('[pagos] Pago creado exitosamente:', result.insertedId);
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          message: 'Pago registrado exitosamente',
          id: result.insertedId,
          pago: { ...nuevoPago, _id: result.insertedId }
        })
      };
    }

    // DELETE /pagos/:id - Eliminar pago (solo admin)
    if (httpMethod === 'DELETE' && id) {
      console.log(`[pagos] Eliminando pago con ID: ${id}`);
      
      // Obtener el pago antes de eliminarlo
      const pago = await db.collection('pagos').findOne({ _id: new ObjectId(id) });
      
      if (!pago) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Pago no encontrado' })
        };
      }
      
      // Eliminar el pago
      await db.collection('pagos').deleteOne({ _id: new ObjectId(id) });
      
      // Actualizar el servicio restando el monto del pago eliminado
      const servicio = await db.collection('servicios').findOne({ _id: pago.servicio_equipo_id });
      
      if (servicio) {
        const montoTotalActual = parseFloat(servicio.monto || servicio.costo_total || 0);
        const montoPagadoActual = parseFloat(servicio.adelanto || 0);
        const nuevoMontoPagado = Math.max(0, montoPagadoActual - pago.monto_pagado);
        const nuevoSaldoPendiente = montoTotalActual - nuevoMontoPagado;
        
        let estadoPago = 'pendiente';
        if (montoTotalActual === 0) {
          estadoPago = 'pendiente';
        } else if (nuevoMontoPagado >= montoTotalActual) {
          estadoPago = 'pagado';
        } else if (nuevoMontoPagado > 0) {
          estadoPago = 'parcial';
        }
        
        await db.collection('servicios').updateOne(
          { _id: pago.servicio_equipo_id },
          { 
            $set: { 
              adelanto: nuevoMontoPagado,
              saldo_pendiente: nuevoSaldoPendiente,
              estado_pago: estadoPago,
              fecha_actualizacion: new Date().toISOString()
            } 
          }
        );
      }
      
      console.log('[pagos] Pago eliminado exitosamente');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Pago eliminado exitosamente' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };

  } catch (error) {
    console.error('[pagos] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      })
    };
  }
};
