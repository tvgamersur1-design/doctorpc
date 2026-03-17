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

  let client;

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'MONGODB_URI no configurado' })
      };
    }

    client = await getMongoClient();
    const db = client.db('doctorpc');

    const httpMethod = event.httpMethod;
    // Extraer ID del path original: /api/clientes/ID o /.netlify/functions/clientes/ID
    const rawPath = event.rawUrl ? new URL(event.rawUrl).pathname : (event.path || '');
    const match = rawPath.match(/\/(?:api\/)?clientes\/([^/?]+)/);
    const id = match ? match[1] : null;

    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        // Ignorar error de parse
      }
    }

    console.log(`[clientes] ${httpMethod} path=${rawPath} ID=${id || 'none'}`);

    // GET /clientes (list all)
    if (httpMethod === 'GET' && !id) {
      console.log('[clientes] Obteniendo lista de clientes...');
      const clientes = await db.collection('clientes').find({}).toArray();
      console.log(`[clientes] ✓ Retornando ${clientes.length} clientes`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(clientes)
      };
    }

    // GET /clientes/:id
    if (httpMethod === 'GET' && id) {
      console.log(`[clientes] Buscando cliente: ${id}`);
      let cliente = null;

      if (ObjectId.isValid(id)) {
        cliente = await db.collection('clientes').findOne({ _id: new ObjectId(id) });
      }

      if (!cliente && /^\d{8}$/.test(id)) {
        cliente = await db.collection('clientes').findOne({ dni: id });
      }

      if (!cliente) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Cliente no encontrado' })
        };
      }

      console.log(`[clientes] ✓ Cliente encontrado: ${cliente.nombre}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cliente)
      };
    }

    // POST /clientes (create)
    if (httpMethod === 'POST') {
      console.log('[clientes] POST: Creando nuevo cliente');
      const nuevoCliente = {
        nombre: body.nombre?.trim() || '',
        apellido_paterno: body.apellido_paterno?.trim() || '',
        apellido_materno: body.apellido_materno?.trim() || '',
        dni: body.dni || '',
        email: body.email?.trim() || '',
        telefono: body.telefono?.trim() || '',
        telefono_secundario: body.telefono_secundario?.trim() || '',
        direccion: body.direccion?.trim() || '',
        ciudad: body.ciudad?.trim() || '',
        distrito: body.distrito?.trim() || '',
        empresa: body.empresa?.trim() || '',
        cargo: body.cargo?.trim() || '',
        estado: body.estado || 'activo',
        notas: body.notas?.trim() || '',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };

      const result = await db.collection('clientes').insertOne(nuevoCliente);
      console.log(`[clientes] ✓ Cliente creado: ${result.insertedId}`);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ ...nuevoCliente, _id: result.insertedId })
      };
    }

    // PUT /clientes/:id (update)
    if (httpMethod === 'PUT' && id) {
      console.log(`[clientes] PUT: Actualizando cliente ${id}`);
      const updateData = {
        ...body,
        fecha_actualizacion: new Date().toISOString()
      };
      delete updateData._id;

      const result = await db.collection('clientes').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Cliente no encontrado' })
        };
      }

      console.log(`[clientes] ✓ Cliente actualizado: ${id}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }

    // DELETE /clientes/:id
    if (httpMethod === 'DELETE' && id) {
      console.log(`[clientes] DELETE: Eliminando cliente ${id}`);
      const result = await db.collection('clientes').deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Cliente no encontrado' })
        };
      }

      console.log(`[clientes] ✓ Cliente eliminado: ${id}`);
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
    console.error('[clientes] ❌ Error:', error.message);
    console.error('[clientes] Stack:', error.stack);

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
