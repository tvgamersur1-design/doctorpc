const { MongoClient, ObjectId } = require('mongodb');

let client = null;
let db = null;

async function connectDB() {
  try {
    if (!client) {
      client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      db = client.db('doctorpc');
      console.log('✓ Conectado a MongoDB');
    }
    return db;
  } catch (error) {
    console.error('Error conectando a MongoDB:', error.message);
    throw error;
  }
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const database = await connectDB();
    const httpMethod = event.httpMethod;
    const path = event.path || '';
    const id = path.split('/').pop() || null;
    let body = {};

    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        body = {};
      }
    }

    console.log(`${httpMethod} ${path}`);

    // GET all clientes
    if (httpMethod === 'GET' && (!id || id === 'clientes')) {
      const clientes = await database.collection('clientes').find({}).toArray();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientes)
      };
    }

    // GET clientes by ID
    if (httpMethod === 'GET' && id && id !== 'clientes') {
      let cliente = null;
      
      if (ObjectId.isValid(id)) {
        cliente = await database.collection('clientes').findOne({ _id: new ObjectId(id) });
      }
      
      if (!cliente && /^\d{8}$/.test(id)) {
        cliente = await database.collection('clientes').findOne({ dni: id });
      }

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

    // POST new cliente
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

      const result = await database.collection('clientes').insertOne(nuevoCliente);
      
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevoCliente, _id: result.insertedId })
      };
    }

    // PUT update cliente
    if (httpMethod === 'PUT' && id) {
      const updateData = {
        ...body,
        fecha_actualizacion: new Date().toISOString()
      };
      delete updateData._id;

      const result = await database.collection('clientes').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

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

    // DELETE cliente
    if (httpMethod === 'DELETE' && id) {
      const result = await database.collection('clientes').deleteOne({ _id: new ObjectId(id) });

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

    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Método no permitido' })
    };

  } catch (error) {
    console.error('Error en handler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: error.message || 'Error interno del servidor',
        details: error.toString()
      })
    };
  }
};
