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
    const match = rawPath.match(/\/(?:api\/)?servicio-equipo\/([^/?]+)/);
    const id = match ? match[1] : null;

    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {}
    }

    console.log(`[servicio-equipo] ${httpMethod} path=${rawPath} ID=${id || 'none'}`);

    // GET /servicio-equipo
    if (httpMethod === 'GET' && !id) {
      console.log('[servicio-equipo] Obteniendo lista de órdenes...');
      
      const params = event.queryStringParameters || {};
      const page = parseInt(params.page) || 0;
      const limit = parseInt(params.limit) || 20;
      const busqueda = (params.q || '').trim();
      const estadoFiltro = (params.estado || '').trim();
      const incluirCanceladas = params.incluir_canceladas === 'true';
      
      const filter = incluirCanceladas ? {} : { estado: { $ne: 'Cancelado' } };
      
      if (estadoFiltro) {
        filter.estado = estadoFiltro;
      }
      
      if (busqueda) {
        filter.$or = [
          { numero_orden: { $regex: busqueda, $options: 'i' } },
          { descripcion_problema: { $regex: busqueda, $options: 'i' } },
          { observaciones: { $regex: busqueda, $options: 'i' } }
        ];
      }
      
      if (page > 0) {
        const skip = (page - 1) * limit;
        const [servicioEquipo, total] = await Promise.all([
          db.collection('servicio_equipo')
            .find(filter)
            .sort({ fecha_creacion: -1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
          db.collection('servicio_equipo').countDocuments(filter)
        ]);
        
        console.log(`[servicio-equipo] ✓ Página ${page}, ${servicioEquipo.length}/${total} órdenes`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            data: servicioEquipo,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit)
            }
          })
        };
      } else {
        const servicioEquipo = await db.collection('servicio_equipo').find(filter).sort({ fecha_creacion: -1 }).toArray();
        console.log(`[servicio-equipo] ✓ Retornando ${servicioEquipo.length} órdenes (sin paginación)`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(servicioEquipo)
        };
      }
    }

    // GET /servicio-equipo/:id
    if (httpMethod === 'GET' && id) {
      console.log(`[servicio-equipo] Buscando orden: ${id}`);
      const servicio = await db.collection('servicio_equipo').findOne({ _id: new ObjectId(id) });

      if (!servicio) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Orden no encontrada' })
        };
      }

      console.log(`[servicio-equipo] ✓ Orden encontrada: ${servicio.numero_orden}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(servicio)
      };
    }

    // POST /servicio-equipo
    if (httpMethod === 'POST') {
      console.log('[servicio-equipo] POST: Creando nueva orden');
      
      // Generar numero_orden único
      let numeroOrden;
      let exists = true;
      let contador = 1;
      
      while (exists) {
        numeroOrden = `OS${String(contador).padStart(3, '0')}`;
        const doc = await db.collection('servicio_equipo').findOne({ numero_orden: numeroOrden });
        exists = doc !== null;
        contador++;
      }

      const nuevoServicio = {
        numero_orden: numeroOrden,
        servicio_id: body.servicio_id || null,
        cliente_id: body.cliente_id || null,
        equipo_id: body.equipo_id || null,
        servicios: body.servicios || [],
        monto: parseFloat(body.monto) || 0,
        adelanto: parseFloat(body.adelanto) || 0,
        estado: body.estado || 'Pendiente de evaluación',
        problemas_reportados: body.problemas_reportados?.trim() || body.descripcion_problema?.trim() || '',
        observaciones: body.observaciones?.trim() || '',
        local: body.local?.trim() || '',
        fecha: body.fecha || '',
        hora: body.hora || '',
        numero_servicio: body.numero_servicio || '',
        diagnostico: body.diagnostico || '',
        trabajo_realizado: body.trabajo_realizado || '',
        fecha_inicio: body.fecha_inicio || '',
        fecha_cierre: body.fecha_cierre || '',
        fotos: body.fotos || [],
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };

      const result = await db.collection('servicio_equipo').insertOne(nuevoServicio);
      console.log(`[servicio-equipo] ✓ Orden creada: ${numeroOrden}`);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ ...nuevoServicio, _id: result.insertedId })
      };
    }

    // PUT /servicio-equipo/:id
    if (httpMethod === 'PUT' && id) {
      console.log(`[servicio-equipo] PUT: Actualizando orden ${id}`);
      const updateData = {
        ...body,
        fecha_actualizacion: new Date().toISOString()
      };
      delete updateData._id;

      const result = await db.collection('servicio_equipo').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Orden no encontrada' })
        };
      }

      console.log(`[servicio-equipo] ✓ Orden actualizada: ${id}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }

    // DELETE /servicio-equipo/:id (SOFT DELETE - Cambiar a Cancelado)
    if (httpMethod === 'DELETE' && id) {
      console.log(`[servicio-equipo] DELETE: Cancelando orden ${id} (soft delete)`);
      
      // Obtener datos del body para motivo de cancelación
      const motivoCancelacion = body.motivo_cancelacion || 'Sin motivo especificado';
      const canceladoPor = body.cancelado_por || 'Sistema';
      
      const result = await db.collection('servicio_equipo').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            estado: 'Cancelado',
            fecha_cancelacion: new Date().toISOString(),
            motivo_cancelacion: motivoCancelacion,
            cancelado_por: canceladoPor,
            fecha_actualizacion: new Date().toISOString()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Orden no encontrada' })
        };
      }

      console.log(`[servicio-equipo] ✓ Orden cancelada (soft delete): ${id}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Orden cancelada exitosamente',
          orden: result
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };

  } catch (error) {
    console.error('[servicio-equipo] ❌ Error:', error.message);
    console.error('[servicio-equipo] Stack:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Internal Server Error',
        type: error.constructor.name
      })
    };
  }
};
