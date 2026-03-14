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
    const path = event.path.replace('/.netlify/functions/servicios', '');
    const id = path.split('/')[1];
    const body = event.body ? JSON.parse(event.body) : {};

    // GET /servicios
    if (method === 'GET' && !id) {
      const servicios = await db.collection('servicios').find({}).toArray();
      return {
        statusCode: 200,
        body: JSON.stringify(servicios),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // GET /servicios/:id
    if (method === 'GET' && id) {
      const servicio = await db.collection('servicios').findOne({ _id: new ObjectId(id) });
      if (!servicio) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Servicio no encontrado' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify(servicio),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // POST /servicios
    if (method === 'POST' && !id) {
      const nuevoServicio = {
        nombre_servicio: body.nombre_servicio,
        categoria: body.categoria,
        costo_base: body.costo_base,
        tiempo_estimado: body.tiempo_estimado || 0,
        descripcion: body.descripcion?.trim() || '',
        estado: body.estado || 'activo',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };

      const result = await db.collection('servicios').insertOne(nuevoServicio);
      return {
        statusCode: 201,
        body: JSON.stringify({ ...nuevoServicio, _id: result.insertedId }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // PUT /servicios/:id
    if (method === 'PUT' && id) {
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

      if (!result.value) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Servicio no encontrado' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(result.value),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // DELETE /servicios/:id
    if (method === 'DELETE' && id) {
      const result = await db.collection('servicios').deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Servicio no encontrado' }),
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
