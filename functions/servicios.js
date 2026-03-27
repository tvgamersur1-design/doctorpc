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
    const match = rawPath.match(/\/(?:api\/)?servicios\/([^/?]+)/);
    const id = match ? match[1] : null;

    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {}
    }

    console.log(`[servicios] ${httpMethod} path=${rawPath} ID=${id || 'none'}`);

    // GET /servicios
    if (httpMethod === 'GET' && !id) {
      console.log('[servicios] Obteniendo lista de servicios...');
      
      // Por defecto, excluir servicios cancelados
      let incluirCancelados = false;
      
      // Verificar múltiples formas de obtener query parameters
      if (event.queryStringParameters) {
        console.log('[servicios] queryStringParameters:', event.queryStringParameters);
        incluirCancelados = event.queryStringParameters.incluir_cancelados === 'true';
      }
      
      if (!incluirCancelados && event.rawUrl) {
        // Parsear URL manualmente si queryStringParameters no funcionó
        const url = new URL(event.rawUrl, 'http://localhost');
        console.log('[servicios] URL params:', url.searchParams.toString());
        incluirCancelados = url.searchParams.get('incluir_cancelados') === 'true';
      }
      
      console.log(`[servicios] incluir_cancelados final: ${incluirCancelados}`);
      
      // Filtro simplificado: si no incluir cancelados, excluir estado "Cancelado"
      const filter = incluirCancelados 
        ? {} 
        : { estado: { $ne: 'Cancelado' } };
      
      console.log('[servicios] Filtro aplicado:', JSON.stringify(filter));
      
      const servicios = await db.collection('servicios').find(filter).toArray();
      
      // Log detallado
      console.log(`[servicios] Total encontrados: ${servicios.length}`);
      
      // Contar por estado
      const estadosCount = {};
      servicios.forEach(s => {
        const estado = s.estado || 'Sin estado';
        estadosCount[estado] = (estadosCount[estado] || 0) + 1;
      });
      console.log('[servicios] Estados en resultado:', estadosCount);
      
      // Si incluir cancelados, verificar cuántos hay
      if (incluirCancelados) {
        const canceladosEnBD = await db.collection('servicios').countDocuments({ estado: 'Cancelado' });
        console.log(`[servicios] Cancelados en BD (verificación): ${canceladosEnBD}`);
      }
      
      // Log detallado de estados
      const estadosUnicos = [...new Set(servicios.map(s => s.estado))];
      console.log('[servicios] Estados únicos en resultado:', estadosUnicos);
      
      const canceladosCount = servicios.filter(s => s.estado === 'Cancelado').length;
      console.log(`[servicios] ✓ Retornando ${servicios.length} servicios (${canceladosCount} cancelados)`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(servicios)
      };
    }

    // GET /servicios/:id
    if (httpMethod === 'GET' && id) {
      console.log(`[servicios] Buscando servicio: ${id}`);
      const servicio = await db.collection('servicios').findOne({ _id: new ObjectId(id) });

      if (!servicio) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Servicio no encontrado' })
        };
      }

      console.log(`[servicios] ✓ Servicio encontrado: ${servicio.nombre_servicio}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(servicio)
      };
    }

    // POST /servicios
    if (httpMethod === 'POST') {
      console.log('[servicios] POST: Creando nuevo servicio');
      const nuevoServicio = {
        numero_servicio: body.numero_servicio || '',
        cliente_id: body.cliente_id || null,
        equipo_id: body.equipo_id || null,
        fecha: body.fecha || '',
        hora: body.hora || '',
        local: body.local || '',
        problemas: body.problemas || '',
        observaciones: body.observaciones || '',
        monto: parseFloat(body.monto) || 0,
        adelanto: parseFloat(body.adelanto) || 0,
        estado: body.estado || 'Pendiente de evaluación',
        nombre_servicio: body.nombre_servicio?.trim() || '',
        categoria: body.categoria?.trim() || '',
        descripcion: body.descripcion?.trim() || '',
        notas: body.notas?.trim() || '',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };

      const result = await db.collection('servicios').insertOne(nuevoServicio);
      console.log(`[servicios] ✓ Servicio creado: ${result.insertedId}`);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ ...nuevoServicio, _id: result.insertedId })
      };
    }

    // PUT /servicios/:id
    if (httpMethod === 'PUT' && id) {
      console.log(`[servicios] PUT: Actualizando servicio ${id}`);
      const updateData = {
        ...body,
        fecha_actualizacion: new Date().toISOString()
      };
      delete updateData._id;

      const result = await db.collection('servicios').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Servicio no encontrado' })
        };
      }

      console.log(`[servicios] ✓ Servicio actualizado: ${id}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }

    // DELETE /servicios/:id (SOFT DELETE - Cambiar a Cancelado)
    if (httpMethod === 'DELETE' && id) {
      console.log(`[servicios] DELETE: Cancelando servicio ${id} (soft delete)`);
      
      // Validar que el ID es un ObjectId válido
      if (!ObjectId.isValid(id)) {
        console.log(`[servicios] ❌ ID no es válido: ${id}`);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID inválido' })
        };
      }
      
      // Verificar que el servicio existe
      const servicioExiste = await db.collection('servicios').findOne({ _id: new ObjectId(id) });
      if (!servicioExiste) {
        console.log(`[servicios] ❌ Servicio no encontrado: ${id}`);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Servicio no encontrado' })
        };
      }
      
      console.log(`[servicios] ✓ Servicio encontrado: ${servicioExiste.numero_servicio || id}`);
      console.log(`[servicios] Estado actual: ${servicioExiste.estado}`);
      
      // Obtener datos del body para motivo de cancelación
      const motivoCancelacion = body.motivo_cancelacion || 'Sin motivo especificado';
      const canceladoPor = body.cancelado_por || 'Sistema';
      
      console.log(`[servicios] Motivo: ${motivoCancelacion}`);
      console.log(`[servicios] Cancelado por: ${canceladoPor}`);
      
      // SOFT DELETE: Usar updateOne en lugar de findOneAndUpdate
      const result = await db.collection('servicios').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            estado: 'Cancelado',
            fecha_cancelacion: new Date().toISOString(),
            motivo_cancelacion: motivoCancelacion,
            cancelado_por: canceladoPor,
            fecha_actualizacion: new Date().toISOString()
          }
        }
      );

      if (result.modifiedCount === 0) {
        console.log(`[servicios] ❌ No se pudo actualizar el servicio: ${id}`);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'No se pudo cancelar el servicio' })
        };
      }

      // Obtener el servicio actualizado
      const servicioActualizado = await db.collection('servicios').findOne({ _id: new ObjectId(id) });

      console.log(`[servicios] ✓ Servicio cancelado exitosamente`);
      console.log(`[servicios] Estado actualizado: ${servicioActualizado.estado}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Servicio cancelado exitosamente',
          servicio: servicioActualizado
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };

  } catch (error) {
    console.error('[servicios] ❌ Error:', error.message);
    console.error('[servicios] Stack:', error.stack);

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
