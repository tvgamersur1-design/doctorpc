const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'doctorpc_secretkey_2024_s3cur3!';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

let cachedClient = null;

async function getMongoClient() {
  if (cachedClient) return cachedClient;
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI no configurado');
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
  return client;
}

function verificarToken(event) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Verificar autenticación
  const usuario = verificarToken(event);
  if (!usuario) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token de acceso requerido' }) };
  }

  // Solo admin
  if (usuario.rol !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acceso denegado. Se requiere rol de administrador' }) };
  }

  try {
    const client = await getMongoClient();
    const db = client.db('doctorpc');

    const rawPath = event.rawUrl ? new URL(event.rawUrl).pathname : (event.path || '');
    const match = rawPath.match(/\/(?:api\/)?usuarios\/([^/?]+)/);
    const id = match ? match[1] : null;

    let body = {};
    if (event.body) {
      try { body = JSON.parse(event.body); } catch (e) {}
    }

    // GET /usuarios
    if (event.httpMethod === 'GET' && !id) {
      const usuarios = await db.collection('usuarios').find({}, { projection: { clave: 0 } }).toArray();
      return { statusCode: 200, headers, body: JSON.stringify(usuarios) };
    }

    // POST /usuarios
    if (event.httpMethod === 'POST') {
      const { usuario: nombre, correo, clave, rol } = body;

      if (!nombre || !correo || !clave) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Usuario, correo y contraseña son requeridos' }) };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Correo electrónico inválido' }) };
      }
      if (clave.length < 6) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }) };
      }

      const existente = await db.collection('usuarios').findOne({
        $or: [{ usuario: nombre }, { correo }]
      });
      if (existente) {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'El usuario o correo ya existe' }) };
      }

      const salt = await bcrypt.genSalt(12);
      const claveHash = await bcrypt.hash(clave, salt);

      const nuevoUsuario = {
        usuario: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        clave: claveHash,
        rol: rol || 'usuario',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };

      const result = await db.collection('usuarios').insertOne(nuevoUsuario);
      const { clave: _, ...sinClave } = nuevoUsuario;
      return { statusCode: 201, headers, body: JSON.stringify({ ...sinClave, _id: result.insertedId }) };
    }

    // PUT /usuarios/:id
    if (event.httpMethod === 'PUT' && id) {
      const { usuario: nombre, correo, rol, clave_nueva, clave_admin } = body;

      if (!nombre || !correo) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Usuario y correo son requeridos' }) };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Correo electrónico inválido' }) };
      }

      const usuarioExistente = await db.collection('usuarios').findOne({ _id: new ObjectId(id) });
      if (!usuarioExistente) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuario no encontrado' }) };
      }

      const duplicado = await db.collection('usuarios').findOne({
        _id: { $ne: new ObjectId(id) },
        $or: [{ usuario: nombre }, { correo: correo.trim().toLowerCase() }]
      });
      if (duplicado) {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'El usuario o correo ya está en uso por otra cuenta' }) };
      }

      const updateData = {
        usuario: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        rol: rol || usuarioExistente.rol,
        fecha_actualizacion: new Date().toISOString()
      };

      if (clave_nueva) {
        if (clave_nueva.length < 6) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }) };
        }
        if (!clave_admin) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Debes ingresar tu contraseña de administrador para cambiar la clave' }) };
        }

        const adminUser = await db.collection('usuarios').findOne({ _id: new ObjectId(usuario.id) });
        const claveAdminValida = await bcrypt.compare(clave_admin, adminUser.clave);
        if (!claveAdminValida) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Contraseña de administrador incorrecta' }) };
        }

        const salt = await bcrypt.genSalt(12);
        updateData.clave = await bcrypt.hash(clave_nueva, salt);
      }

      await db.collection('usuarios').updateOne({ _id: new ObjectId(id) }, { $set: updateData });
      const { clave: _, ...resultado } = { ...usuarioExistente, ...updateData, _id: usuarioExistente._id };
      return { statusCode: 200, headers, body: JSON.stringify(resultado) };
    }

    // DELETE /usuarios/:id
    if (event.httpMethod === 'DELETE' && id) {
      if (id === usuario.id.toString()) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'No puedes eliminar tu propio usuario' }) };
      }

      const result = await db.collection('usuarios').deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuario no encontrado' }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Usuario eliminado exitosamente' }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  } catch (error) {
    console.error('[usuarios] Error:', error.message);
    if (error.code === 11000) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'El usuario o correo ya existe' }) };
    }
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
