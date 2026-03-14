const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'doctorpc';

let cachedDb = null;

async function connectDB() {
  if (cachedDb) {
    return cachedDb;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedDb = client.db(DB_NAME);
  return cachedDb;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const db = await connectDB();
    const method = event.httpMethod;
    const path = event.path.replace('/.netlify/functions/clientes', '');
    const id = path.split('/')[1];
    const body = event.body ? JSON.parse(event.body) : {};

    // GET /clientes
    if (method === 'GET' && !id) {
      const clientes = await db.collection('clientes').find({}).toArray();
      return {
        statusCode: 200,
        body: JSON.stringify(clientes),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // GET /clientes/:id
    if (method === 'GET' && id) {
      let cliente;
      if (ObjectId.isValid(id)) {
        cliente = await db.collection('clientes').findOne({ _id: new ObjectId(id) });
      }
      if (!cliente && /^\d{8}$/.test(id)) {
        cliente = await db.collection('clientes').findOne({ dni: id });
      }
      if (!cliente) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Cliente no encontrado' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify(cliente),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // POST /clientes
    if (method === 'POST' && !id) {
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
      return {
        statusCode: 201,
        body: JSON.stringify({ ...nuevoCliente, _id: result.insertedId }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // PUT /clientes/:id
    if (method === 'PUT' && id) {
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

      if (!result.value) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Cliente no encontrado' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(result.value),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // DELETE /clientes/:id
    if (method === 'DELETE' && id) {
      const result = await db.collection('clientes').deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Cliente no encontrado' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Método no soportado' }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
