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
    const path = event.path.replace('/.netlify/functions/equipos', '');
    const id = path.split('/')[1];
    const body = event.body ? JSON.parse(event.body) : {};

    // GET /equipos
    if (method === 'GET' && !id) {
      const equipos = await db.collection('equipos').find({}).toArray();
      return {
        statusCode: 200,
        body: JSON.stringify(equipos),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // GET /equipos/:id
    if (method === 'GET' && id) {
      const equipo = await db.collection('equipos').findOne({ _id: new ObjectId(id) });
      if (!equipo) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Equipo no encontrado' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify(equipo),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // POST /equipos
    if (method === 'POST' && !id) {
      const nuevoEquipo = {
        cliente_id: body.cliente_id || null,
        tipo_equipo: body.tipo_equipo,
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
      return {
        statusCode: 201,
        body: JSON.stringify({ ...nuevoEquipo, _id: result.insertedId }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // PUT /equipos/:id
    if (method === 'PUT' && id) {
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

      if (!result.value) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Equipo no encontrado' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(result.value),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // DELETE /equipos/:id
    if (method === 'DELETE' && id) {
      const result = await db.collection('equipos').deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Equipo no encontrado' }),
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
