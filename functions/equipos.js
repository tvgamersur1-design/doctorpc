const { MongoClient, ObjectId } = require('mongodb');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
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
    const match = rawPath.match(/\/(?:api\/)?equipos\/([^/?]+)/);
    const id = match ? match[1] : null;

    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {}
    }

    console.log(`[equipos] ${httpMethod} path=${rawPath} ID=${id || 'none'}`);

    // GET /equipos
    if (httpMethod === 'GET' && !id) {
      console.log('[equipos] Obteniendo lista de equipos...');
      const equipos = await db.collection('equipos').find({}).toArray();
      console.log(`[equipos] ✓ Retornando ${equipos.length} equipos`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(equipos)
      };
    }

    // GET /equipos/:id
    if (httpMethod === 'GET' && id) {
      console.log(`[equipos] Buscando equipo: ${id}`);
      const equipo = await db.collection('equipos').findOne({ _id: new ObjectId(id) });

      if (!equipo) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Equipo no encontrado' })
        };
      }

      console.log(`[equipos] ✓ Equipo encontrado: ${equipo.modelo}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(equipo)
      };
    }

    // POST /equipos
    if (httpMethod === 'POST') {
      console.log('[equipos] POST: Creando nuevo equipo');
      const nuevoEquipo = {
        cliente_id: body.cliente_id || null,
        tipo_equipo: body.tipo_equipo,
        marca: body.marca?.trim() || '',
        modelo: body.modelo?.trim() || '',
        numero_serie: body.numero_serie?.trim() || '',
        descripcion: body.descripcion?.trim() || '',
        especificaciones: body.especificaciones || {},
        estado: body.estado || 'operativo',
        fecha_compra: body.fecha_compra || '',
        ubicacion: body.ubicacion?.trim() || '',
        responsable: body.responsable?.trim() || '',
        notas: body.notas?.trim() || '',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };

      const result = await db.collection('equipos').insertOne(nuevoEquipo);
      console.log(`[equipos] ✓ Equipo creado: ${result.insertedId}`);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ ...nuevoEquipo, _id: result.insertedId })
      };
    }

    // PUT /equipos/:id
    if (httpMethod === 'PUT' && id) {
      console.log(`[equipos] PUT: Actualizando equipo ${id}`);
      const updateData = {
        ...body,
        fecha_actualizacion: new Date().toISOString()
      };
      delete updateData._id;

      const result = await db.collection('equipos').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Equipo no encontrado' })
        };
      }

      console.log(`[equipos] ✓ Equipo actualizado: ${id}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.value)
      };
    }

    // DELETE /equipos/:id
    if (httpMethod === 'DELETE' && id) {
      console.log(`[equipos] DELETE: Eliminando equipo ${id}`);
      const result = await db.collection('equipos').deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Equipo no encontrado' })
        };
      }

      console.log(`[equipos] ✓ Equipo eliminado: ${id}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };

  } catch (error) {
    console.error('[equipos] ❌ Error:', error.message);
    console.error('[equipos] Stack:', error.stack);

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
