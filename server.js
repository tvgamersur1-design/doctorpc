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
  console.error('❌ ERROR: MONGODB_URI no está configurado en .env');
  process.exit(1);
}

let db;
const mongoClient = new MongoClient(MONGODB_URI);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Conectar a MongoDB al iniciar
async function connectDB() {
  try {
    console.log('🔗 Conectando a MongoDB Atlas...');
    console.log('📌 MONGODB_URI configurado:', MONGODB_URI ? 'SÍ' : 'NO');
    if (MONGODB_URI) {
      const uriMascarado = MONGODB_URI.replace(/\/\/.+@/, '//****:****@');
      console.log('📌 URI (mascarada):', uriMascarado);
    }
    
    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);
    console.log('✓ Conectado a MongoDB exitosamente');
    console.log('✓ Base de datos:', DB_NAME);
    
    // Crear índices automáticamente
    await createIndexes();
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error.message);
    console.error('❌ Stack completo:', error.stack);
    process.exit(1);
  }
}

// Crear índices de seguridad
async function createIndexes() {
  try {
    // Índices para clientes
    await db.collection('clientes').createIndex({ dni: 1 }, { unique: true, sparse: true });
    await db.collection('clientes').createIndex({ email: 1 }, { sparse: true });
    await db.collection('clientes').createIndex({ estado: 1 });
    
    // Índices para equipos
    await db.collection('equipos').createIndex({ cliente_id: 1 });
    await db.collection('equipos').createIndex({ numero_serie: 1 }, { unique: true, sparse: true });
    await db.collection('equipos').createIndex({ estado: 1 });
    
    // Índices para servicios
    await db.collection('servicios').createIndex({ estado: 1 });
    
    // Índices para servicio_equipo
    await db.collection('servicio_equipo').createIndex({ cliente_id: 1 });
    await db.collection('servicio_equipo').createIndex({ equipo_id: 1 });
    await db.collection('servicio_equipo').createIndex({ numero_orden: 1 }, { unique: true });
    await db.collection('servicio_equipo').createIndex({ estado: 1 });
    
    console.log('✓ Índices creados exitosamente');
  } catch (error) {
    console.warn('⚠️ Advertencia al crear índices:', error.message);
    // No es error crítico si los índices ya existen
  }
}

// Funciones de validación
function validarCliente(data, esActualizacion = false) {
  const errores = [];
  
  // Para POST: todos estos campos son requeridos
  // Para PUT: solo validar los campos que se envían
  
  if (!esActualizacion) {
    // Validación estricta para POST
    if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      errores.push('nombre es requerido');
    }
    
    if (!data.dni || !/^\d{8}$/.test(data.dni)) {
      errores.push('DNI debe ser 8 dígitos');
    }
  }
  
  // Validación parcial (para POST y PUT)
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

// Función de validación para servicios
function validarServicio(data, esActualizacion = false) {
  const errores = [];
  
  if (!esActualizacion) {
    // Validación estricta para POST
    if (!data.nombre_servicio || typeof data.nombre_servicio !== 'string' || data.nombre_servicio.trim() === '') {
      errores.push('nombre_servicio es requerido');
    }
    
    if (!data.categoria || typeof data.categoria !== 'string' || data.categoria.trim() === '') {
      errores.push('categoria es requerida');
    }
    
    if (data.costo_base === undefined || data.costo_base === null || isNaN(parseFloat(data.costo_base))) {
      errores.push('costo_base es requerido y debe ser un número');
    }
  }
  
  // Validación parcial (para POST y PUT)
  if (data.nombre_servicio && (typeof data.nombre_servicio !== 'string' || data.nombre_servicio.trim() === '')) {
    errores.push('nombre_servicio debe ser un texto no vacío');
  }
  
  if (data.categoria && (typeof data.categoria !== 'string' || data.categoria.trim() === '')) {
    errores.push('categoria debe ser un texto no vacío');
  }
  
  if (data.costo_base !== undefined && data.costo_base !== null && isNaN(parseFloat(data.costo_base))) {
    errores.push('costo_base debe ser un número');
  }
  
  if (data.costo_base !== undefined && data.costo_base !== null && parseFloat(data.costo_base) < 0) {
    errores.push('costo_base no puede ser negativo');
  }
  
  if (data.tiempo_estimado !== undefined && data.tiempo_estimado !== null && isNaN(parseFloat(data.tiempo_estimado))) {
    errores.push('tiempo_estimado debe ser un número');
  }
  
  if (data.tiempo_estimado !== undefined && data.tiempo_estimado !== null && parseFloat(data.tiempo_estimado) < 0) {
    errores.push('tiempo_estimado no puede ser negativo');
  }
  
  if (data.estado && !['activo', 'inactivo', 'Pendiente de evaluación', 'En progreso', 'En reparación', 'Completado', 'Cancelado', 'Entregado', 'En diagnóstico', 'Diagnosticado'].includes(data.estado)) {
    errores.push('Estado inválido (activo, inactivo, Pendiente de evaluación, En progreso, En reparación, Completado, Cancelado, Entregado, En diagnóstico, Diagnosticado)');
  }
  
  return errores;
}

// ==================== CLIENTES ====================

// GET all clientes
app.get('/api/clientes', async (req, res) => {
  try {
    console.log('🔍 GET /api/clientes - Conectado a BD:', !!db);
    const clientes = await db.collection('clientes').find({}).toArray();
    console.log(`📋 GET /api/clientes: Retornando ${clientes.length} clientes`);
    if (clientes.length > 0) {
      console.log(`   Primer cliente: _id=${clientes[0]._id}, nombre=${clientes[0].nombre}`);
    } else {
      console.warn('⚠️ No hay clientes en la base de datos');
    }
    res.json(clientes);
  } catch (error) {
    console.error('❌ Error GET /api/clientes:', error);
    console.error('❌ BD conectada:', !!db);
    res.status(500).json({ error: error.message });
  }
});

// GET cliente by ID (acepta _id de MongoDB)
app.get('/api/clientes/:id', async (req, res) => {
  try {
    console.log(`🔍 GET /api/clientes/${req.params.id}`);
    let cliente;
    
    // Intentar buscar por _id de MongoDB
    if (ObjectId.isValid(req.params.id)) {
      console.log(`   Buscando por ObjectId...`);
      cliente = await db.collection('clientes').findOne({ _id: new ObjectId(req.params.id) });
    }
    
    // Si no encontró, intentar por DNI (búsqueda alternativa)
    if (!cliente && /^\d{8}$/.test(req.params.id)) {
      console.log(`   Buscando por DNI...`);
      cliente = await db.collection('clientes').findOne({ dni: req.params.id });
    }
    
    if (!cliente) {
      console.warn(`   ⚠️ Cliente NO encontrado`);
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    console.log(`   ✓ Cliente encontrado: ${cliente.nombre}`);
    res.json(cliente);
  } catch (error) {
    console.error('Error GET /api/clientes/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST nuevo cliente con validación
app.post('/api/clientes', async (req, res) => {
  try {
    // Validar datos
    const errores = validarCliente(req.body);
    if (errores.length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    }
    
    // Verificar DNI único
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
    console.error('Error POST /api/clientes:', error);
    if (error.code === 11000) {
      // Error de índice unique
      const campo = Object.keys(error.keyPattern)[0];
      res.status(409).json({ error: `${campo} ya existe en la base de datos` });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// PUT actualizar cliente con validación
app.put('/api/clientes/:id', async (req, res) => {
  try {
    console.log(`📝 PUT /api/clientes/${req.params.id}`);
    console.log(`   Datos recibidos:`, req.body);
    
    // Validar datos (si los proporciona) - con validación parcial para PUT
    if (Object.keys(req.body).length > 0) {
      const errores = validarCliente(req.body, true); // true = es actualización
      if (errores.length > 0) {
        console.warn(`   ⚠️ Validación falló:`, errores);
        return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
      }
    }
    
    const updateData = {
      ...req.body,
      fecha_actualizacion: new Date().toISOString()
    };
    delete updateData._id;
    
    // Buscar por _id de MongoDB
    let query = {};
    if (ObjectId.isValid(req.params.id)) {
      console.log(`   ✓ ID es ObjectId válido`);
      query = { _id: new ObjectId(req.params.id) };
    } else if (/^\d{8}$/.test(req.params.id)) {
      console.log(`   ✓ ID es DNI válido`);
      query = { dni: req.params.id };
    } else {
      console.warn(`   ❌ ID no es ObjectId ni DNI válido: "${req.params.id}"`);
    }
    
    console.log(`   Query:`, query);
    
    const result = await db.collection('clientes').findOneAndUpdate(
      query,
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    // En MongoDB 5.0+, findOneAndUpdate retorna el documento directamente
    const updatedCliente = result.value || result;
    
    if (!updatedCliente) {
      console.warn(`   ❌ Cliente NO encontrado`);
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    console.log(`   ✓ Cliente actualizado: ${updatedCliente.nombre}`);
    res.json(updatedCliente);
  } catch (error) {
    console.error('❌ Error PUT /api/clientes/:id:', error);
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      res.status(409).json({ error: `${campo} ya existe en la base de datos` });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// DELETE cliente con confirmación
app.delete('/api/clientes/:id', async (req, res) => {
  try {
    // Buscar por _id de MongoDB
    let query = {};
    if (ObjectId.isValid(req.params.id)) {
      query = { _id: new ObjectId(req.params.id) };
    } else if (/^\d{8}$/.test(req.params.id)) {
      query = { dni: req.params.id };
    }
    
    const result = await db.collection('clientes').deleteOne(query);
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cliente no encontrado',
        deletedCount: 0 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Cliente eliminado exitosamente',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error DELETE /api/clientes/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SERVICIOS ====================

// GET próximo número secuencial para servicios
app.get('/api/servicios/proximo-numero', async (req, res) => {
  try {
    console.log(`🔢 GET /api/servicios/proximo-numero`);
    
    const ano = new Date().getFullYear();
    const servicios = await db.collection('servicios').find({}).toArray();
    
    // Contar servicios del año actual
    const serviciosDelAno = servicios.filter(s =>
      s.numero_servicio && s.numero_servicio.startsWith(`SRV-${ano}`)
    );
    
    const contador = serviciosDelAno.length + 1;
    const numero = `SRV-${ano}-${String(contador).padStart(3, '0')}`;
    
    console.log(`   ✓ Próximo número: ${numero}`);
    res.json({ numero });
  } catch (error) {
    console.error('❌ Error GET /api/servicios/proximo-numero:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET all servicios
app.get('/api/servicios', async (req, res) => {
  try {
    console.log('🔍 GET /api/servicios - Conectado a BD:', !!db);
    const servicios = await db.collection('servicios').find({}).toArray();
    console.log(`📋 GET /api/servicios: Retornando ${servicios.length} servicios`);
    if (servicios.length > 0) {
      console.log(`   Primer servicio: _id=${servicios[0]._id}, nombre=${servicios[0].nombre_servicio}`);
    } else {
      console.warn('⚠️ No hay servicios en la base de datos');
    }
    res.json(servicios);
  } catch (error) {
    console.error('❌ Error GET /api/servicios:', error);
    console.error('❌ BD conectada:', !!db);
    res.status(500).json({ error: error.message });
  }
});

// GET servicio by ID
app.get('/api/servicios/:id', async (req, res) => {
  try {
    console.log(`🔍 GET /api/servicios/${req.params.id}`);
    let servicio;
    
    // Intentar buscar por _id de MongoDB
    if (ObjectId.isValid(req.params.id)) {
      console.log(`   Buscando por ObjectId...`);
      servicio = await db.collection('servicios').findOne({ _id: new ObjectId(req.params.id) });
    }
    
    if (!servicio) {
      console.warn(`   ⚠️ Servicio NO encontrado`);
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    console.log(`   ✓ Servicio encontrado: ${servicio.nombre_servicio}`);
    res.json(servicio);
  } catch (error) {
    console.error('❌ Error GET /api/servicios/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST nuevo servicio con validación
app.post('/api/servicios', async (req, res) => {
  try {
    console.log(`📝 POST /api/servicios`);
    console.log(`   Datos recibidos:`, req.body);
    
    // Si viene del frontend (sin nombre_servicio ni categoria), usar valores por defecto
    const esOrdenDeServicio = !req.body.nombre_servicio && !req.body.categoria;
    if (esOrdenDeServicio) {
      // Para órdenes de servicio desde el frontend, usar el número como nombre
      req.body.nombre_servicio = req.body.numero_servicio || 'Orden de Servicio';
      
      // Mapear campo 'problemas' del frontend a 'problemas_reportados'
      if (req.body.problemas && !req.body.problemas_reportados) {
        req.body.problemas_reportados = req.body.problemas;
      }
      
      // Problemas reportados puede ser string (del textarea) o array (de botones)
      const problemasStr = req.body.problemas_reportados || '';
      const categoriasProblemas = Array.isArray(problemasStr) 
        ? problemasStr.join(', ') 
        : String(problemasStr).split('\n').filter(p => p.trim()).slice(0, 3).join(', ');
      
      req.body.categoria = categoriasProblemas || 'Mantenimiento';
      req.body.costo_base = req.body.monto || 0;
    }
    
    // Asegurar que costo_base siempre es un número (después de asignar valores por defecto)
    if (!req.body.costo_base && req.body.monto) {
      req.body.costo_base = req.body.monto;
    }
    
    // Validar datos básicos
    const errores = validarServicio(req.body);
    if (errores.length > 0) {
      console.warn(`⚠️ Validación falló en POST /api/servicios:`, errores);
      console.warn(`   Campo nombre_servicio: "${req.body.nombre_servicio}"`);
      console.warn(`   Campo categoria: "${req.body.categoria}"`);
      console.warn(`   Campo costo_base: ${req.body.costo_base}`);
      return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    }
    
    const nuevoServicio = {
      // Campos básicos del servicio
      numero_servicio: req.body.numero_servicio?.trim() || '',
      nombre_servicio: req.body.nombre_servicio?.trim() || '',
      descripcion: req.body.descripcion?.trim() || '',
      categoria: req.body.categoria?.trim() || '',
      costo_base: req.body.costo_base ? parseFloat(req.body.costo_base) : 0,
      tiempo_estimado: req.body.tiempo_estimado ? parseFloat(req.body.tiempo_estimado) : 0,
      
      // Campos del cliente y equipo
      cliente_id: req.body.cliente_id?.trim() || '',
      equipo_id: req.body.equipo_id?.trim() || '',
      
      // Campos adicionales del servicio
      fecha: req.body.fecha?.trim() || '',
      hora: req.body.hora?.trim() || '',
      local: req.body.local?.trim() || '',
      monto: req.body.monto ? parseFloat(req.body.monto) : 0,
      adelanto: req.body.adelanto ? parseFloat(req.body.adelanto) : 0,
      
      // Problemas reportados
      problemas_reportados: req.body.problemas_reportados || [],
      
      // Observaciones
      observaciones: req.body.observaciones?.trim() || '',
      
      // Estado
      estado: req.body.estado || 'Pendiente de evaluación',
      
      // Notas
      notas: req.body.notas?.trim() || '',
      
      // Timestamps
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    };
    
    const result = await db.collection('servicios').insertOne(nuevoServicio);
    console.log(`✓ POST /api/servicios: Servicio creado con _id=${result.insertedId}, numero=${nuevoServicio.numero_servicio}`);
    res.status(201).json({ ...nuevoServicio, _id: result.insertedId });
  } catch (error) {
    console.error('❌ Error POST /api/servicios:', error);
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      res.status(409).json({ error: `${campo} ya existe en la base de datos` });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// PUT actualizar servicio con validación
app.put('/api/servicios/:id', async (req, res) => {
  try {
    console.log(`📝 PUT /api/servicios/${req.params.id}`);
    console.log(`   Datos recibidos:`, req.body);
    
    // Validar datos (si los proporciona) - con validación parcial para PUT
    if (Object.keys(req.body).length > 0) {
      const errores = validarServicio(req.body, true); // true = es actualización
      if (errores.length > 0) {
        console.warn(`   ⚠️ Validación falló:`, errores);
        return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
      }
    }
    
    const updateData = {
      ...req.body,
      fecha_actualizacion: new Date().toISOString()
    };
    delete updateData._id;
    
    // Buscar por _id de MongoDB
    let query = {};
    if (ObjectId.isValid(req.params.id)) {
      console.log(`   ✓ ID es ObjectId válido`);
      query = { _id: new ObjectId(req.params.id) };
    } else {
      console.warn(`   ❌ ID no es ObjectId válido: "${req.params.id}"`);
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    console.log(`   Query:`, query);
    
    const result = await db.collection('servicios').findOneAndUpdate(
      query,
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    // En MongoDB 5.0+, findOneAndUpdate retorna el documento directamente
    const updatedServicio = result.value || result;
    
    if (!updatedServicio) {
      console.warn(`   ❌ Servicio NO encontrado`);
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    console.log(`   ✓ Servicio actualizado: ${updatedServicio.nombre_servicio}`);
    res.json(updatedServicio);
  } catch (error) {
    console.error('❌ Error PUT /api/servicios/:id:', error);
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      res.status(409).json({ error: `${campo} ya existe en la base de datos` });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// DELETE servicio con confirmación
app.delete('/api/servicios/:id', async (req, res) => {
  try {
    console.log(`🗑️ DELETE /api/servicios/${req.params.id}`);
    
    // Buscar por _id de MongoDB
    let query = {};
    if (ObjectId.isValid(req.params.id)) {
      console.log(`   ✓ ID es ObjectId válido`);
      query = { _id: new ObjectId(req.params.id) };
    } else {
      console.warn(`   ❌ ID no es ObjectId válido`);
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const result = await db.collection('servicios').deleteOne(query);
    
    if (result.deletedCount === 0) {
      console.warn(`   ⚠️ Servicio NO encontrado`);
      return res.status(404).json({ 
        success: false, 
        error: 'Servicio no encontrado',
        deletedCount: 0 
      });
    }
    
    console.log(`   ✓ Servicio eliminado exitosamente`);
    res.json({ 
      success: true, 
      message: 'Servicio eliminado exitosamente',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('❌ Error DELETE /api/servicios/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== EQUIPOS ====================

// GET all equipos
app.get('/api/equipos', async (req, res) => {
  try {
    console.log('🔍 GET /api/equipos - Conectado a BD:', !!db);
    const equipos = await db.collection('equipos').find({}).toArray();
    console.log(`📋 GET /api/equipos: Retornando ${equipos.length} equipos`);
    if (equipos.length === 0) {
      console.warn('⚠️ No hay equipos en la base de datos');
    }
    res.json(equipos);
  } catch (error) {
    console.error('❌ Error GET /api/equipos:', error);
    console.error('❌ BD conectada:', !!db);
    res.status(500).json({ error: error.message });
  }
});

// GET equipo by ID
app.get('/api/equipos/:id', async (req, res) => {
  try {
    let equipo;
    if (ObjectId.isValid(req.params.id)) {
      equipo = await db.collection('equipos').findOne({ _id: new ObjectId(req.params.id) });
    }
    if (!equipo && req.body.cliente_id) {
      equipo = await db.collection('equipos').findOne({ cliente_id: req.params.id });
    }
    
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json(equipo);
  } catch (error) {
    console.error('Error GET /api/equipos/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST nuevo equipo
app.post('/api/equipos', async (req, res) => {
  try {
    if (!req.body.tipo_equipo) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        detalles: ['tipo_equipo es requerido']
      });
    }
    
    // Validar número de serie único
    if (req.body.numero_serie) {
      const existe = await db.collection('equipos').findOne({ numero_serie: req.body.numero_serie });
      if (existe) {
        return res.status(409).json({ 
          error: 'Número de serie ya existe',
          equipo_existente: existe
        });
      }
    }
    
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
    console.error('Error POST /api/equipos:', error);
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      res.status(409).json({ error: `${campo} ya existe en la base de datos` });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// PUT actualizar equipo
app.put('/api/equipos/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      fecha_actualizacion: new Date().toISOString()
    };
    delete updateData._id;
    
    const result = await db.collection('equipos').findOneAndUpdate(
     { _id: new ObjectId(req.params.id) },
     { $set: updateData },
     { returnDocument: 'after' }
    );
    const updatedEquipo = result.value || result;
    if (!updatedEquipo) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json(updatedEquipo);
  } catch (error) {
    console.error('Error PUT /api/equipos/:id:', error);
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      res.status(409).json({ error: `${campo} ya existe en la base de datos` });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// DELETE equipo
app.delete('/api/equipos/:id', async (req, res) => {
  try {
    const result = await db.collection('equipos').deleteOne({ _id: new ObjectId(req.params.id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Equipo no encontrado',
        deletedCount: 0 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Equipo eliminado exitosamente',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error DELETE /api/equipos/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SERVICIO-EQUIPO ====================

// GET all servicio-equipo
app.get('/api/servicio-equipo', async (req, res) => {
  try {
    console.log('🔍 GET /api/servicio-equipo - Conectado a BD:', !!db);
    const servicioEquipo = await db.collection('servicio_equipo').find({}).toArray();
    console.log(`📋 GET /api/servicio-equipo: Retornando ${servicioEquipo.length} órdenes`);
    if (servicioEquipo.length === 0) {
      console.warn('⚠️ No hay órdenes de servicio en la base de datos');
    }
    res.json(servicioEquipo);
  } catch (error) {
    console.error('❌ Error GET /api/servicio-equipo:', error);
    console.error('❌ BD conectada:', !!db);
    res.status(500).json({ error: error.message });
  }
});

// POST nuevo servicio-equipo
app.post('/api/servicio-equipo', async (req, res) => {
  try {
    console.log('📥 POST /api/servicio-equipo:', req.body);
    
    // ✅ FIX: Generar numero_orden único incluyendo registros eliminados
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
    console.log('💾 Insertando:', nuevoServicioEquipo);
    const result = await db.collection('servicio_equipo').insertOne(nuevoServicioEquipo);
    res.status(201).json({ ...nuevoServicioEquipo, _id: result.insertedId });
  } catch (error) {
    console.error('❌ Error POST /api/servicio-equipo:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT actualizar servicio-equipo
app.put('/api/servicio-equipo/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      fecha_actualizacion: new Date().toISOString()
    };
    delete updateData._id;
    
    const result = await db.collection('servicio_equipo').findOneAndUpdate(
     { _id: new ObjectId(req.params.id) },
     { $set: updateData },
     { returnDocument: 'after' }
    );
    const updatedServicioEquipo = result.value || result;
    if (!updatedServicioEquipo) return res.status(404).json({ error: 'Servicio-Equipo no encontrado' });
    res.json(updatedServicioEquipo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE servicio-equipo
app.delete('/api/servicio-equipo/:id', async (req, res) => {
  try {
    const result = await db.collection('servicio_equipo').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Servicio-equipo no encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DECOLECTA API ====================

// Obtener datos de persona por DNI usando DECOLECTA
app.get('/api/decolecta/:dni', async (req, res) => {
  try {
    const { dni } = req.params;
    
    // Validar DNI
    if (!dni || !/^\d{8}$/.test(dni)) {
      return res.status(400).json({ 
        error: 'DNI inválido. Debe tener 8 dígitos' 
      });
    }

    const decolectaUrl = process.env.DECOLECTA_URL || 'https://api.decolecta.com';
    const apiKey = process.env.DECOLECTA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'API Key de DECOLECTA no configurado' 
      });
    }

    console.log(`Consultando DECOLECTA: ${decolectaUrl}/v1/reniec/dni?numero=${dni}`);

    const response = await axios.get(`${decolectaUrl}/v1/reniec/dni`, {
      params: { numero: dni },
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    const data = response.data.data || response.data;
    console.log('Raw DECOLECTA response:', JSON.stringify(data, null, 2));
    
    // Normalizar respuesta al formato esperado por frontend
    const datosNormalizados = {
      success: true,
      document_number: data.document_number || dni,
      first_name: data.first_name || '',
      first_last_name: data.first_last_name || '',
      second_last_name: data.second_last_name || '',
      full_name: data.full_name || `${data.first_last_name} ${data.second_last_name} ${data.first_name}`.trim(),
      nombres: data.first_name || '',
      apellido_paterno: data.first_last_name || '',
      apellido_materno: data.second_last_name || ''
    };

    console.log('Respuesta DECOLECTA normalizada:', datosNormalizados);
    res.json(datosNormalizados);
  } catch (error) {
    console.error('Error DECOLECTA:', error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const errorMsg = error.response?.data?.message || error.message || 'Error al consultar DECOLECTA';
    res.status(statusCode).json({ error: errorMsg });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: 'MongoDB Atlas' });
});

// ✅ NUEVO: Verificar conexión a BD
app.get('/api/status-db', async (req, res) => {
  try {
    console.log('🔍 GET /api/status-db - Verificando conexión...');
    console.log('   Base de datos inicializada:', !!db);
    
    if (!db) {
      return res.status(503).json({ 
        status: 'ERROR',
        connected: false,
        message: 'Base de datos no inicializada',
        mongodb_uri: MONGODB_URI ? 'Configurado' : 'NO CONFIGURADO'
      });
    }
    
    // Intentar una consulta simple
    const adminDb = db.admin();
    const dbStats = await db.stats();
    
    console.log('✓ Conexión a BD confirmada');
    
    res.json({
      status: 'OK',
      connected: true,
      database: DB_NAME,
      mongodb_uri: MONGODB_URI ? 'Configurado' : 'NO CONFIGURADO',
      collections: dbStats?.collections || 'N/A',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error al verificar BD:', error.message);
    res.status(503).json({
      status: 'ERROR',
      connected: false,
      error: error.message,
      mongodb_uri: MONGODB_URI ? 'Configurado' : 'NO CONFIGURADO'
    });
  }
});

// Iniciar servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📁 Base de datos: ${DB_NAME}`);
    console.log(`${'═'.repeat(50)}\n`);
  });
});

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🔌 Cerrando conexión a MongoDB...');
  await mongoClient.close();
  process.exit(0);
});
