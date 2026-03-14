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
    const path = event.path.replace('/.netlify/functions/servicio-equipo', '');
    const id = path.split('/')[1];
    const body = event.body ? JSON.parse(event.body) : {};

    // GET /servicio-equipo
    if (method === 'GET' && !id) {
      const servicioEquipo = await db.collection('servicio_equipo').find({}).toArray();
      return {
        statusCode: 200,
        body: JSON.stringify(servicioEquipo),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // POST /servicio-equipo
    if (method === 'POST' && !id) {
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
      return {
        statusCode: 201,
        body: JSON.stringify({ ...nuevoServicioEquipo, _id: result.insertedId }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // PUT /servicio-equipo/:id
    if (method === 'PUT' && id) {
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
          body: JSON.stringify({ error: 'Servicio-equipo no encontrado' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(result.value),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // DELETE /servicio-equipo/:id
    if (method === 'DELETE' && id) {
      const result = await db.collection('servicio_equipo').deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Servicio-equipo no encontrado' }),
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
