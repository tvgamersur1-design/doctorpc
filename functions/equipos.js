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
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
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

    console.log(`[equipos] ${httpMethod} - ID: ${id || 'none'}`);

    // GET /equipos
    if (httpMethod === 'GET' && (!id || id === 'equipos')) {
      const equipos = await db.collection('equipos').find({}).toArray();
      await client.close();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(equipos)
      };
    }

    // GET /equipos/:id
    if (httpMethod === 'GET' && id && id !== 'equipos') {
      const equipo = await db.collection('equipos').findOne({ _id: new ObjectId(id) });
      await client.close();
      
      if (!equipo) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Equipo no encontrado' })
        };
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(equipo)
      };
    }

    // POST /equipos
    if (httpMethod === 'POST') {
      const nuevoEquipo = {
        cliente_id: body.cliente_id || null,
        tipo_equipo: body.tipo_equipo || '',
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
      await client.close();
      
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevoEquipo, _id: result.insertedId })
      };
    }

    // PUT /equipos/:id
    if (httpMethod === 'PUT' && id) {
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

      await client.close();

      if (!result.value) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Equipo no encontrado' })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value)
      };
    }

    // DELETE /equipos/:id
    if (httpMethod === 'DELETE' && id) {
      const result = await db.collection('equipos').deleteOne({ _id: new ObjectId(id) });
      await client.close();

      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Equipo no encontrado' })
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
    console.error('[equipos] Error:', error.message);
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
