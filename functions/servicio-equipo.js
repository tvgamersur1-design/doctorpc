const { MongoClient, ObjectId } = require('mongodb');

let cachedClient = null;

async function getMongoClient() {
  if (cachedClient) {
    console.log('[servicio-equipo] ✓ Usando cliente MongoDB cacheado');
    return cachedClient;
  }
  
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI no configurado');
  }
  
  console.log('[servicio-equipo] 🔗 Creando nueva conexión a MongoDB...');
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
  console.log('[servicio-equipo] ✓ Conectado a MongoDB');
  return client;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'MONGODB_URI no configurado' })
      };
    }

    const client = await getMongoClient();
    const db = client.db('doctorpc');

    const httpMethod = event.httpMethod;
    const path = event.path || '';
    const pathParts = path.split('/');
    const id = pathParts[pathParts.length - 1];

    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {}
    }

    console.log(`[servicio-equipo] ${httpMethod} - ID: ${id || 'none'}`);

    // GET /servicio-equipo
    if (httpMethod === 'GET' && (!id || id === 'servicio-equipo')) {
      console.log('[servicio-equipo] Obteniendo lista de órdenes...');
      const servicioEquipo = await db.collection('servicio_equipo').find({}).toArray();
      console.log(`[servicio-equipo] ✓ Retornando ${servicioEquipo.length} órdenes`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicioEquipo)
      };
    }

    // GET /servicio-equipo/:id
    if (httpMethod === 'GET' && id && id !== 'servicio-equipo') {
      console.log(`[servicio-equipo] Buscando orden: ${id}`);
      const servicio = await db.collection('servicio_equipo').findOne({ _id: new ObjectId(id) });

      if (!servicio) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Orden no encontrada' })
        };
      }

      console.log(`[servicio-equipo] ✓ Orden encontrada: ${servicio.numero_orden}`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
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
        cliente_id: body.cliente_id || null,
        equipo_id: body.equipo_id || null,
        servicios: body.servicios || [],
        costo_total: body.costo_total || 0,
        estado: body.estado || 'Pendiente de evaluación',
        descripcion_problema: body.descripcion_problema?.trim() || '',
        observaciones: body.observaciones?.trim() || '',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };

      const result = await db.collection('servicio_equipo').insertOne(nuevoServicio);
      console.log(`[servicio-equipo] ✓ Orden creada: ${numeroOrden}`);

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
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

      if (!result.value) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Orden no encontrada' })
        };
      }

      console.log(`[servicio-equipo] ✓ Orden actualizada: ${id}`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value)
      };
    }

    // DELETE /servicio-equipo/:id
    if (httpMethod === 'DELETE' && id) {
      console.log(`[servicio-equipo] DELETE: Eliminando orden ${id}`);
      const result = await db.collection('servicio_equipo').deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Orden no encontrada' })
        };
      }

      console.log(`[servicio-equipo] ✓ Orden eliminada: ${id}`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Método no permitido' })
    };

  } catch (error) {
    console.error('[servicio-equipo] ❌ Error:', error.message);
    console.error('[servicio-equipo] Stack:', error.stack);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message || 'Internal Server Error',
        type: error.constructor.name
      })
    };
  }
};
