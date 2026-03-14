const { MongoClient, ObjectId } = require('mongodb');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  let client;

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'MONGODB_URI not configured' })
      };
    }

    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1
    });

    await client.connect();
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
      const servicioEquipo = await db.collection('servicio_equipo').find({}).toArray();
      await client.close();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicioEquipo)
      };
    }

    // POST /servicio-equipo
    if (httpMethod === 'POST') {
      let numeroOrden;
      let exists = true;
      let contador = 1;

      while (exists) {
        numeroOrden = `OS${String(contador).padStart(3, '0')}`;
        const doc = await db.collection('servicio_equipo').findOne({ numero_orden: numeroOrden });
        exists = doc !== null;
        contador++;
      }

      const nuevoServicioEquipo = {
        numero_orden: numeroOrden,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        ...body
      };

      const result = await db.collection('servicio_equipo').insertOne(nuevoServicioEquipo);
      await client.close();
      
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevoServicioEquipo, _id: result.insertedId })
      };
    }

    // PUT /servicio-equipo/:id
    if (httpMethod === 'PUT' && id) {
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

      await client.close();

      if (!result.value) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Servicio-equipo no encontrado' })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value)
      };
    }

    // DELETE /servicio-equipo/:id
    if (httpMethod === 'DELETE' && id) {
      const result = await db.collection('servicio_equipo').deleteOne({ _id: new ObjectId(id) });
      await client.close();

      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Servicio-equipo no encontrado' })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      };
    }

    await client.close();

    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Método no permitido' })
    };

  } catch (error) {
    console.error('[servicio-equipo] Error:', error.message);
    if (client) {
      try {
        await client.close();
      } catch (e) {}
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};
