// Wrapper serverless para Netlify
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'doctorpc';

if (!MONGODB_URI) {
  console.error(' ERROR: MONGODB_URI no está configurado en .env');
}

let db;
const mongoClient = new MongoClient(MONGODB_URI);

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
async function connectDB() {
  try {
    if (!db) {
      console.log('🔗 Conectando a MongoDB Atlas...');
      await mongoClient.connect();
      db = mongoClient.db(DB_NAME);
      console.log('✓ Conectado a MongoDB exitosamente');
    }
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error.message);
  }
}

// Validaciones
function validarCliente(data, esActualizacion = false) {
  const errores = [];
  
  if (!esActualizacion) {
    if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      errores.push('nombre es requerido');
    }
    
    if (!data.dni || !/^\d{8}$/.test(data.dni)) {
      errores.push('DNI debe ser 8 dígitos');
    }
  }
  
  if (data.nombre && (typeof data.nombre !== 'string' || data.nombre.trim() === '')) {
    errores.push('nombre debe ser un texto no vacío');
  }
  
  if (data.dni && !/^\d{8}$/.test(data.dni)) {
    errores.push('DNI debe ser 8 dígitos');
  }
  
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errores.push('Email inválido');
  }
  
  if (data.telefono && !/^\d{7,}$/.test(data.telefono)) {
    errores.push('Teléfono debe tener al menos 7 dígitos');
  }
  
  if (data.estado && !['activo', 'inactivo', 'suspendido'].includes(data.estado)) {
    errores.push('Estado inválido (activo, inactivo, suspendido)');
  }
  
  return errores;
}

// ==================== ENDPOINTS ====================

// CLIENTES
app.get('/api/clientes', async (req, res) => {
  await connectDB();
  try {
    const clientes = await db.collection('clientes').find({}).toArray();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  await connectDB();
  try {
    let cliente;
    
    if (ObjectId.isValid(req.params.id)) {
      cliente = await db.collection('clientes').findOne({ _id: new ObjectId(req.params.id) });
    }
    
    if (!cliente && /^\d{8}$/.test(req.params.id)) {
      cliente = await db.collection('clientes').findOne({ dni: req.params.id });
    }
    
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  await connectDB();
  try {
    const errores = validarCliente(req.body);
    if (errores.length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    }
    
    const dniExistente = await db.collection('clientes').findOne({ dni: req.body.dni });
    if (dniExistente) {
      return res.status(409).json({ 
        error: 'DNI ya registrado',
        cliente_existente: dniExistente
      });
    }
    
    const nuevoCliente = {
      nombre: req.body.nombre.trim(),
      apellido_paterno: req.body.apellido_paterno?.trim() || '',
      apellido_materno: req.body.apellido_materno?.trim() || '',
      dni: req.body.dni,
      email: req.body.email?.trim() || '',
      telefono: req.body.telefono?.trim() || '',
      telefono_secundario: req.body.telefono_secundario?.trim() || '',
      direccion: req.body.direccion?.trim() || '',
      ciudad: req.body.ciudad?.trim() || '',
      distrito: req.body.distrito?.trim() || '',
      empresa: req.body.empresa?.trim() || '',
      cargo: req.body.cargo?.trim() || '',
      estado: req.body.estado || 'activo',
      notas: req.body.notas?.trim() || '',
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    };
    
    const result = await db.collection('clientes').insertOne(nuevoCliente);
    res.status(201).json({ ...nuevoCliente, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EQUIPOS
app.get('/api/equipos', async (req, res) => {
  await connectDB();
  try {
    const equipos = await db.collection('equipos').find({}).toArray();
    res.json(equipos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/equipos/:id', async (req, res) => {
  await connectDB();
  try {
    const equipo = await db.collection('equipos').findOne({ _id: new ObjectId(req.params.id) });
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json(equipo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/equipos', async (req, res) => {
  await connectDB();
  try {
    const nuevoEquipo = {
      cliente_id: req.body.cliente_id || null,
      tipo_equipo: req.body.tipo_equipo,
      marca: req.body.marca?.trim() || '',
      modelo: req.body.modelo?.trim() || '',
      numero_serie: req.body.numero_serie?.trim() || '',
      descripcion: req.body.descripcion?.trim() || '',
      especificaciones: req.body.especificaciones || {},
      estado: req.body.estado || 'operativo',
      fecha_compra: req.body.fecha_compra || '',
      ubicacion: req.body.ubicacion?.trim() || '',
      responsable: req.body.responsable?.trim() || '',
      notas: req.body.notas?.trim() || '',
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    };
    
    const result = await db.collection('equipos').insertOne(nuevoEquipo);
    res.status(201).json({ ...nuevoEquipo, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SERVICIO-EQUIPO
app.get('/api/servicio-equipo', async (req, res) => {
  await connectDB();
  try {
    const servicioEquipo = await db.collection('servicio_equipo').find({}).toArray();
    res.json(servicioEquipo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/servicio-equipo', async (req, res) => {
  await connectDB();
  try {
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
      ...req.body
    };
    
    const result = await db.collection('servicio_equipo').insertOne(nuevoServicioEquipo);
    res.status(201).json({ ...nuevoServicioEquipo, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SERVICIOS
app.get('/api/servicios', async (req, res) => {
  await connectDB();
  try {
    const servicios = await db.collection('servicios').find({}).toArray();
    res.json(servicios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/servicios', async (req, res) => {
  await connectDB();
  try {
    const nuevoServicio = {
      nombre_servicio: req.body.nombre_servicio,
      categoria: req.body.categoria,
      costo_base: req.body.costo_base,
      tiempo_estimado: req.body.tiempo_estimado || 0,
      descripcion: req.body.descripcion?.trim() || '',
      estado: req.body.estado || 'activo',
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    };
    
    const result = await db.collection('servicios').insertOne(nuevoServicio);
    res.status(201).json({ ...nuevoServicio, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: 'MongoDB Atlas' });
});

// Handler serverless de Netlify
exports.handler = async (event, context) => {
  // Middleware para serverless
  const httpMethod = event.httpMethod;
  const path = event.path;
  
  // Crear request simulado
  const req = {
    method: httpMethod,
    url: path,
    params: event.pathParameters || {},
    query: event.queryStringParameters || {},
    body: event.body ? JSON.parse(event.body) : {}
  };
  
  // Response simulada
  let res = {
    statusCode: 200,
    body: ''
  };
  
  try {
    // Usar el app de Express
    return new Promise((resolve) => {
      app(req, {
        status: (code) => {
          res.statusCode = code;
          return res;
        },
        json: (data) => {
          res.body = JSON.stringify(data);
          resolve(res);
        }
      });
    });
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

module.exports = app;
