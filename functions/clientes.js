const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

let cachedClient = null;

// Función para verificar token JWT
function verificarToken(event) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) return null;
  
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

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

    // GET /clientes?incluirEliminados=true (list all with optional deleted - SOLO ADMIN)
    if (httpMethod === 'GET' && !id) {
      const queryParams = event.queryStringParameters || {};
      const incluirEliminados = queryParams.incluirEliminados === 'true';
      
      // Si se solicitan eliminados, verificar que sea admin
      if (incluirEliminados) {
        const usuario = verificarToken(event);
        if (!usuario || usuario.rol !== 'admin') {
          console.log('[clientes] Acceso denegado: solo admin puede ver eliminados');
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'No autorizado. Solo administradores pueden ver clientes eliminados.' })
          };
        }
      }
      
      console.log(`[clientes] Obteniendo lista de clientes (incluirEliminados: ${incluirEliminados})...`);
      
      const filtro = incluirEliminados ? {} : { eliminado: { $ne: true } };
      const clientes = await db.collection('clientes')
        .find(filtro)
        .toArray();
      
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
        eliminado: false,
        fecha_eliminacion: null,
        motivo_eliminacion: null,
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

    // PUT /clientes/:id/restaurar (RESTORE - SOLO ADMIN) - DEBE IR ANTES DEL PUT GENÉRICO
    if (httpMethod === 'PUT' && id && rawPath.includes('/restaurar')) {
      console.log(`[clientes] RESTAURAR: Verificando permisos para ${id}`);
      
      // Verificar que sea admin
      const usuario = verificarToken(event);
      if (!usuario || usuario.rol !== 'admin') {
        console.log('[clientes] Acceso denegado: solo admin puede restaurar');
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'No autorizado. Solo administradores pueden restaurar clientes.' })
        };
      }
      
      console.log(`[clientes] RESTAURAR: Reactivando cliente ${id}`);
      
      const updateData = {
        eliminado: false,
        estado: 'activo',
        fecha_eliminacion: null,
        motivo_eliminacion: null,
        fecha_actualizacion: new Date().toISOString()
      };

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

      console.log(`[clientes] ✓ Cliente restaurado: ${id}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: 'Cliente restaurado correctamente',
          cliente: result
        })
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

    // DELETE /clientes/:id (SOFT DELETE)
    if (httpMethod === 'DELETE' && id) {
      console.log(`[clientes] SOFT DELETE: Marcando cliente como eliminado ${id}`);
      
      const updateData = {
        eliminado: true,
        estado: 'inactivo',
        fecha_eliminacion: new Date().toISOString(),
        motivo_eliminacion: body.motivo || null,
        fecha_actualizacion: new Date().toISOString()
      };

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

      console.log(`[clientes] ✓ Cliente marcado como eliminado: ${id}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: 'Cliente eliminado correctamente',
          cliente: result
        })
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
