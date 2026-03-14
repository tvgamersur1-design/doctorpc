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

    // Crear nuevo cliente para cada request (simplifica timeout issues)
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
      } catch (e) {
        // Ignorar error de parse
      }
    }

    console.log(`[clientes] ${httpMethod} - ID: ${id || 'none'}`);

    // GET /clientes (list all)
    if (httpMethod === 'GET' && (!id || id === 'clientes')) {
      const clientes = await db.collection('clientes').find({}).toArray();
      
      await client.close();
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientes)
      };
    }

    // GET /clientes/:id
    if (httpMethod === 'GET' && id && id !== 'clientes') {
      let cliente = null;

      if (ObjectId.isValid(id)) {
        cliente = await db.collection('clientes').findOne({ _id: new ObjectId(id) });
      }

      if (!cliente && /^\d{8}$/.test(id)) {
        cliente = await db.collection('clientes').findOne({ dni: id });
      }

      await client.close();

      if (!cliente) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Cliente no encontrado' })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cliente)
      };
    }

    // POST /clientes (create)
    if (httpMethod === 'POST') {
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

      await client.close();

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevoCliente, _id: result.insertedId })
      };
    }

    // PUT /clientes/:id (update)
    if (httpMethod === 'PUT' && id) {
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

      await client.close();

      if (!result.value) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Cliente no encontrado' })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value)
      };
    }

    // DELETE /clientes/:id
    if (httpMethod === 'DELETE' && id) {
      const result = await db.collection('clientes').deleteOne({ _id: new ObjectId(id) });

      await client.close();

      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Cliente no encontrado' })
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
    console.error('[clientes] Error:', error.message);
    
    if (client) {
      try {
        await client.close();
      } catch (e) {
        // Ignorar error al cerrar
      }
    }

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
