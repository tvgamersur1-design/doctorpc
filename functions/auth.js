const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) return null;
  
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function seedAdmin(db) {
  const adminExists = await db.collection('usuarios').findOne({ usuario: 'admin' });
  if (!adminExists) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('[auth] ADMIN_PASSWORD no configurado, no se creó el admin');
      return;
    }
    const salt = await bcrypt.genSalt(12);
    const claveHash = await bcrypt.hash(adminPassword, salt);
    await db.collection('usuarios').insertOne({
      usuario: 'admin',
      correo: 'tvgamersur7@gmail.com',
      clave: claveHash,
      rol: 'admin',
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    });
    console.log('[auth] Admin creado');
  }
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // Verificar variables de entorno críticas
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('[auth] JWT_SECRET no configurado');
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Configuración del servidor incompleta. Contacte al administrador.' }) 
      };
    }

    const client = await getMongoClient();
    const db = client.db('doctorpc');

    // Asegurar índices y admin
    try {
      await db.collection('usuarios').createIndex({ usuario: 1 }, { unique: true });
      await db.collection('usuarios').createIndex({ correo: 1 }, { unique: true });
      await db.collection('login_attempts').createIndex({ timestamp: 1 }, { expireAfterSeconds: 900 });
    } catch (e) { /* ya existen */ }
    await seedAdmin(db);

    const rawPath = event.rawUrl ? new URL(event.rawUrl).pathname : (event.path || '');

    // POST /api/auth/login
    if (event.httpMethod === 'POST' && rawPath.includes('/login')) {
      // Rate limiting por IP (máx 10 intentos cada 15 minutos)
      const ip = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown').split(',')[0].trim();
      const WINDOW_MS = 15 * 60 * 1000;
      const MAX_ATTEMPTS = 10;
      const now = Date.now();

      const attempts = await db.collection('login_attempts').countDocuments({
        ip, timestamp: { $gt: new Date(now - WINDOW_MS) }
      });

      if (attempts >= MAX_ATTEMPTS) {
        return { statusCode: 429, headers, body: JSON.stringify({ error: 'Demasiados intentos de login. Intente nuevamente en 15 minutos.' }) };
      }

      let body = {};
      try { body = JSON.parse(event.body); } catch (e) {}

      const { usuario, clave } = body;
      if (!usuario || !clave) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Usuario y contraseña son requeridos' }) };
      }

      const user = await db.collection('usuarios').findOne({ usuario });
      if (!user) {
        await db.collection('login_attempts').insertOne({ ip, timestamp: new Date() });
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Usuario o contraseña incorrectos' }) };
      }

      // ✅ NUEVO: Verificar si el usuario está activo
      if (user.activo === false) {
        return { 
          statusCode: 403, 
          headers, 
          body: JSON.stringify({ 
            error: 'Usuario desactivado',
            mensaje: 'Tu cuenta ha sido desactivada. Contacta al administrador para más información.',
            tipo: 'usuario_desactivado'
          }) 
        };
      }

      const claveValida = await bcrypt.compare(clave, user.clave);
      if (!claveValida) {
        await db.collection('login_attempts').insertOne({ ip, timestamp: new Date() });
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Usuario o contraseña incorrectos' }) };
      }

      const token = jwt.sign(
        { id: user._id.toString(), usuario: user.usuario, rol: user.rol },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Determinar el nombre a mostrar
      const nombreMostrar = user.nombre || (user.usuario === 'admin' ? 'Admin' : user.usuario);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          token,
          usuario: {
            id: user._id.toString(),
            usuario: user.usuario,
            nombre: nombreMostrar,
            correo: user.correo,
            rol: user.rol
          }
        })
      };
    }

    // GET /api/auth/verificar
    if (event.httpMethod === 'GET' && rawPath.includes('/verificar')) {
      const decoded = verificarToken(event);
      if (!decoded) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Token inválido o expirado' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ valido: true, usuario: decoded }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  } catch (error) {
    console.error('[auth] Error:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
