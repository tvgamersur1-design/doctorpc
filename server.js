const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'doctorpc';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET no está configurado en .env');
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI no está configurado en .env');
  process.exit(1);
}

let db;
const mongoClient = new MongoClient(MONGODB_URI);

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (ej: Postman, apps móviles) o si está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public'));

// Rate limiting para login (máx 10 intentos por 15 minutos por IP)
const MAX_LOGIN_INTENTOS = 10;
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: MAX_LOGIN_INTENTOS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = req.rateLimit.resetTime
      ? new Date(req.rateLimit.resetTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
      : '15 minutos';
    res.status(429).json({
      error: 'Demasiados intentos fallidos. Acceso bloqueado.',
      intentos_usados: req.rateLimit.used,
      limite: req.rateLimit.limit,
      intentos_restantes: 0,
      disponible_a_las: resetTime
    });
  }
});

// Middleware de autenticación JWT
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
}

// Middleware solo para administradores
function soloAdmin(req, res, next) {
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    }
    next();
}

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
    await seedAdminUser();
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
    
    // Índices para usuarios
    await db.collection('usuarios').createIndex({ usuario: 1 }, { unique: true });
    await db.collection('usuarios').createIndex({ correo: 1 }, { unique: true });
    
    console.log('✓ Índices creados exitosamente');
  } catch (error) {
    console.warn('⚠️ Advertencia al crear índices:', error.message);
    // No es error crítico si los índices ya existen
  }
}

async function seedAdminUser() {
    try {
        const adminExists = await db.collection('usuarios').findOne({ usuario: 'admin' });
        if (!adminExists) {
            const adminPassword = process.env.ADMIN_PASSWORD;
            if (!adminPassword) {
                console.error('❌ ERROR: ADMIN_PASSWORD no está configurado en .env');
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
            console.log('✓ Usuario admin creado exitosamente');
        } else {
            console.log('✓ Usuario admin ya existe');
        }
    } catch (error) {
        console.warn('⚠️ Error al crear usuario admin:', error.message);
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

// ==================== AUTENTICACIÓN ====================

// POST login
app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
        const { usuario, clave } = req.body;
        
        if (!usuario || !clave) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
        }
        
        const user = await db.collection('usuarios').findOne({ usuario: usuario });
        
        // Calcular intentos restantes (el middleware ya contó este intento)
        const intentosUsados = req.rateLimit ? req.rateLimit.used : 1;
        const intentosRestantes = req.rateLimit ? req.rateLimit.remaining : MAX_LOGIN_INTENTOS - 1;

        if (!user) {
            return res.status(401).json({
                error: 'Usuario o contraseña incorrectos',
                intentos_restantes: intentosRestantes,
                limite: MAX_LOGIN_INTENTOS
            });
        }
        
        const claveValida = await bcrypt.compare(clave, user.clave);
        
        if (!claveValida) {
            return res.status(401).json({
                error: 'Usuario o contraseña incorrectos',
                intentos_restantes: intentosRestantes,
                limite: MAX_LOGIN_INTENTOS
            });
        }
        
        const token = jwt.sign(
            { id: user._id, usuario: user.usuario, rol: user.rol },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        
        res.json({
            token,
            usuario: {
                id: user._id,
                usuario: user.usuario,
                correo: user.correo,
                rol: user.rol
            }
        });
    } catch (error) {
        console.error('Error POST /api/auth/login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET verificar token
app.get('/api/auth/verificar', autenticarToken, (req, res) => {
    res.json({ valido: true, usuario: req.usuario });
});

// ==================== USUARIOS (Solo Admin) ====================

// GET all usuarios
app.get('/api/usuarios', autenticarToken, soloAdmin, async (req, res) => {
    try {
        const usuarios = await db.collection('usuarios').find({}, { projection: { clave: 0 } }).toArray();
        res.json(usuarios);
    } catch (error) {
        console.error('Error GET /api/usuarios:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST crear usuario
app.post('/api/usuarios', autenticarToken, soloAdmin, async (req, res) => {
    try {
        const { usuario, correo, clave, rol } = req.body;
        
        if (!usuario || !correo || !clave) {
            return res.status(400).json({ error: 'Usuario, correo y contraseña son requeridos' });
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            return res.status(400).json({ error: 'Correo electrónico inválido' });
        }
        
        if (clave.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        
        const existente = await db.collection('usuarios').findOne({ 
            $or: [{ usuario }, { correo }] 
        });
        if (existente) {
            return res.status(409).json({ error: 'El usuario o correo ya existe' });
        }
        
        const salt = await bcrypt.genSalt(12);
        const claveHash = await bcrypt.hash(clave, salt);
        
        const nuevoUsuario = {
            usuario: usuario.trim(),
            correo: correo.trim().toLowerCase(),
            clave: claveHash,
            rol: rol || 'usuario',
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
        };
        
        const result = await db.collection('usuarios').insertOne(nuevoUsuario);
        
        const { clave: _, ...usuarioSinClave } = nuevoUsuario;
        res.status(201).json({ ...usuarioSinClave, _id: result.insertedId });
    } catch (error) {
        console.error('Error POST /api/usuarios:', error);
        if (error.code === 11000) {
            res.status(409).json({ error: 'El usuario o correo ya existe' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// PUT actualizar usuario
app.put('/api/usuarios/:id', autenticarToken, soloAdmin, async (req, res) => {
    try {
        const { usuario, correo, rol, clave_nueva, clave_admin } = req.body;
        
        if (!usuario || !correo) {
            return res.status(400).json({ error: 'Usuario y correo son requeridos' });
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            return res.status(400).json({ error: 'Correo electrónico inválido' });
        }
        
        // Verificar que el usuario a editar existe
        const usuarioExistente = await db.collection('usuarios').findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        if (!usuarioExistente) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Verificar duplicados (excluir al usuario actual)
        const duplicado = await db.collection('usuarios').findOne({
            _id: { $ne: new ObjectId(req.params.id) },
            $or: [{ usuario }, { correo: correo.trim().toLowerCase() }]
        });
        if (duplicado) {
            return res.status(409).json({ error: 'El usuario o correo ya está en uso por otra cuenta' });
        }
        
        const updateData = {
            usuario: usuario.trim(),
            correo: correo.trim().toLowerCase(),
            rol: rol || usuarioExistente.rol,
            fecha_actualizacion: new Date().toISOString()
        };
        
        // Si se quiere cambiar la contraseña, verificar clave del admin
        if (clave_nueva) {
            if (clave_nueva.length < 6) {
                return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
            }
            if (!clave_admin) {
                return res.status(400).json({ error: 'Debes ingresar tu contraseña de administrador para cambiar la clave' });
            }
            
            // Verificar contraseña del admin que hace la petición
            const adminUser = await db.collection('usuarios').findOne({ 
                _id: new ObjectId(req.usuario.id) 
            });
            const claveAdminValida = await bcrypt.compare(clave_admin, adminUser.clave);
            if (!claveAdminValida) {
                return res.status(403).json({ error: 'Contraseña de administrador incorrecta' });
            }
            
            const salt = await bcrypt.genSalt(12);
            updateData.clave = await bcrypt.hash(clave_nueva, salt);
        }
        
        await db.collection('usuarios').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        
        const { clave: _, ...resultado } = { ...usuarioExistente, ...updateData, _id: usuarioExistente._id };
        res.json(resultado);
    } catch (error) {
        console.error('Error PUT /api/usuarios/:id:', error);
        if (error.code === 11000) {
            res.status(409).json({ error: 'El usuario o correo ya existe' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// DELETE eliminar usuario (no puede eliminarse a sí mismo)
app.delete('/api/usuarios/:id', autenticarToken, soloAdmin, async (req, res) => {
    try {
        if (req.params.id === req.usuario.id.toString()) {
            return res.status(403).json({ error: 'No puedes eliminar tu propio usuario' });
        }
        
        const result = await db.collection('usuarios').deleteOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({ success: true, message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error DELETE /api/usuarios/:id:', error);
        res.status(500).json({ error: error.message });
    }
});

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

// ==================== REPORTE SERVICIO ====================

// GET reporte del servicio (para mostrar en modal)
app.get('/api/reporte/:servicioId', async (req, res) => {
  try {
    const { servicioId } = req.params;
    
    console.log(`🔍 Buscando reporte para ID: ${servicioId}`);
    
    // Validar que es un ObjectId válido
    if (!ObjectId.isValid(servicioId)) {
      console.error(`❌ ID inválido: ${servicioId}`);
      return res.status(400).json({ error: 'ID de servicio inválido' });
    }
    
    // Buscar primero en servicio_equipo, luego en servicios
    let servicio = await db.collection('servicio_equipo').findOne({ 
      _id: new ObjectId(servicioId) 
    });
    
    // Si no se encuentra en servicio_equipo, buscar en servicios
    if (!servicio) {
      console.log(`⚠️ No encontrado en servicio_equipo, buscando en servicios...`);
      servicio = await db.collection('servicios').findOne({ 
        _id: new ObjectId(servicioId) 
      });
    }
    
    console.log(`📊 Servicio encontrado:`, !!servicio);
    
    if (!servicio) {
      console.warn(`⚠️ No se encontró servicio con ID: ${servicioId}`);
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    // Obtener datos del cliente (buscar por _id si cliente_id es ObjectId, o por id)
    let cliente = null;
    if (ObjectId.isValid(servicio.cliente_id)) {
      cliente = await db.collection('clientes').findOne({ 
        _id: new ObjectId(servicio.cliente_id) 
      });
    }
    if (!cliente && servicio.cliente_id) {
      cliente = await db.collection('clientes').findOne({ 
        id: servicio.cliente_id 
      });
    }
    console.log(`👤 Cliente encontrado:`, !!cliente);
    
    // Obtener datos del equipo (buscar por _id si equipo_id es ObjectId, o por id)
    let equipo = null;
    if (ObjectId.isValid(servicio.equipo_id)) {
      equipo = await db.collection('equipos').findOne({ 
        _id: new ObjectId(servicio.equipo_id) 
      });
    }
    if (!equipo && servicio.equipo_id) {
      equipo = await db.collection('equipos').findOne({ 
        id: servicio.equipo_id 
      });
    }
    console.log(`💻 Equipo encontrado:`, !!equipo);
    
    // Obtener datos del tipo de servicio
    let servicioInfo = null;
    if (ObjectId.isValid(servicio.servicio_id)) {
      servicioInfo = await db.collection('servicios').findOne({ 
        _id: new ObjectId(servicio.servicio_id) 
      });
    }
    if (!servicioInfo && servicio.servicio_id) {
      servicioInfo = await db.collection('servicios').findOne({ 
        id: servicio.servicio_id 
      });
    }
    console.log(`🔧 Tipo de servicio encontrado:`, !!servicioInfo);
    
    // Construir reporte
    const reporte = {
      numero_orden: servicio.numero_orden || servicio.numero_servicio || `OS${servicio._id.toString().substring(0, 8).toUpperCase()}`,
      cliente: {
        nombre: cliente?.nombre || 'N/A',
        apellido_paterno: cliente?.apellido_paterno || '',
        apellido_paterno: cliente?.apellido_paterno || '',
        apellido_materno: cliente?.apellido_materno || '',
        dni: cliente?.dni || '',
        email: cliente?.email || '',
        telefono: cliente?.telefono || ''
      },
      equipo: {
        tipo_equipo: equipo?.tipo_equipo || 'N/A',
        marca: equipo?.marca || '',
        modelo: equipo?.modelo || '',
        numero_serie: equipo?.numero_serie || ''
      },
      servicio: {
        descripcion_problema: servicio.descripcion_problema || '',
        observaciones_tecnicas: servicio.observaciones_tecnicas || '',
        diagnostico: servicio.diagnostico ? (
          typeof servicio.diagnostico === 'string' && servicio.diagnostico.startsWith('[')
            ? JSON.parse(servicio.diagnostico)
            : servicio.diagnostico
        ) : [],
        solucion_aplicada: servicio.solucion_aplicada || ''
      },
      costos: {
        costo_base: servicio.costo_base || 0,
        repuestos: servicio.repuestos_utilizados ? 
          servicio.repuestos_utilizados.reduce((sum, r) => sum + (r.costo || 0), 0) : 0,
        costo_adicional: servicio.costo_adicional || 0,
        total: servicio.costo_final || 0
      },
      datos_tecnicos: {
        tecnico_asignado: servicio.tecnico_asignado || '',
        estado: servicio.estado || '',
        fecha_inicio: servicio.fecha_inicio || '',
        fecha_cierre: servicio.fecha_cierre || '',
        prioridad: servicio.prioridad || '',
        calificacion: servicio.calificacion || 0
      }
    };
    
    res.json(reporte);
  } catch (error) {
    console.error('Error GET /api/reporte:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST generar PDF del reporte
app.post('/api/generar-pdf', async (req, res) => {
  try {
    const { servicioId } = req.body;
    
    // Obtener reporte
    const reporteRes = await new Promise((resolve, reject) => {
      res.on('error', reject);
      // Reutilizar lógica de /api/reporte/:servicioId
    });
    
    // Por ahora, retornar instrucción para que frontend genere PDF
    res.json({ 
      success: true, 
      message: 'PDF generado correctamente',
      filename: `reporte-${servicioId}.pdf`
    });
  } catch (error) {
    console.error('Error POST /api/generar-pdf:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST enviar reporte por WhatsApp
app.post('/api/enviar-whatsapp', async (req, res) => {
  try {
    const { servicioId } = req.body;
    
    // Buscar primero en servicio_equipo, luego en servicios
    let servicio = await db.collection('servicio_equipo').findOne({ 
      _id: new ObjectId(servicioId) 
    });
    if (!servicio) {
      servicio = await db.collection('servicios').findOne({ 
        _id: new ObjectId(servicioId) 
      });
    }
    
    if (!servicio) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    // Obtener cliente con número de WhatsApp
    let cliente = null;
    if (ObjectId.isValid(servicio.cliente_id)) {
      cliente = await db.collection('clientes').findOne({ 
        _id: new ObjectId(servicio.cliente_id) 
      });
    }
    if (!cliente && servicio.cliente_id) {
      cliente = await db.collection('clientes').findOne({ 
        id: servicio.cliente_id 
      });
    }
    
    if (!cliente || !cliente.telefono) {
      return res.status(400).json({ error: 'Cliente sin número de WhatsApp' });
    }
    
    // Obtener equipo
    const equipo = await db.collection('equipos').findOne({ 
      id: servicio.equipo_id 
    });
    
    // Construir mensaje para WhatsApp (sin caracteres especiales que causen problemas)
    const costoRepuestos = servicio.repuestos_utilizados ? 
      servicio.repuestos_utilizados.reduce((sum, r) => sum + (r.costo || 0), 0) : 0;
    
    const mensaje = `
📋 REPORTE DE SERVICIO

Orden: ${servicio.numero_orden}
Cliente: ${cliente.nombre} ${cliente.apellido_paterno} ${cliente.apellido_materno}

EQUIPO:
${equipo?.tipo_equipo || 'N/A'} - ${equipo?.marca || ''} ${equipo?.modelo || ''}

PROBLEMA:
${servicio.descripcion_problema || 'N/A'}

DIAGNOSTICO:
${servicio.diagnostico || 'N/A'}

SOLUCION:
${servicio.solucion_aplicada || 'N/A'}

COSTOS:
• Servicio: S/. ${(servicio.costo_base || 0).toFixed(2)}
• Repuestos: S/. ${costoRepuestos.toFixed(2)}
• Adicional: S/. ${(servicio.costo_adicional || 0).toFixed(2)}
Total: S/. ${(servicio.costo_final || 0).toFixed(2)}

Estado: ${servicio.estado}
Tecnico: ${servicio.tecnico_asignado || 'N/A'}

✅ Gracias por confiar en nosotros
    `.trim();
    
    // Configuración de Twilio (opcional, comentado por ahora)
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    // Formatear teléfono (agregar +51 para Perú si es necesario)
    let telefonoFormato = cliente.telefono.replace(/\D/g, '');
    if (!telefonoFormato.startsWith('51')) {
      telefonoFormato = '51' + telefonoFormato;
    }
    const numeroWhatsApp = '+' + telefonoFormato;
    
    console.log(`📱 Preparando envío WhatsApp a ${numeroWhatsApp}`);
    console.log(`Orden: ${servicio.numero_orden}`);
    
    // Si está configurado Twilio, enviar mensaje real
    if (twilioAccountSid && twilioAuthToken && twilioWhatsAppNumber) {
      try {
        const twilio = require('twilio');
        const twilioClient = twilio(twilioAccountSid, twilioAuthToken);
        
        const result = await twilioClient.messages.create({
          body: mensaje,
          from: twilioWhatsAppNumber,
          to: `whatsapp:${numeroWhatsApp}`
        });
        
        console.log(`✅ WhatsApp enviado exitosamente. SID: ${result.sid}`);
        
        res.json({ 
          success: true, 
          message: 'Mensaje enviado a WhatsApp correctamente',
          telefono: cliente.telefono,
          orden: servicio.numero_orden,
          messageSid: result.sid
        });
      } catch (twilioError) {
        console.error('❌ Error al enviar con Twilio:', twilioError.message);
        // Si falla Twilio, retornar error pero informativo
        res.status(500).json({ 
          error: 'Error al enviar WhatsApp: ' + twilioError.message,
          configurar: 'Configura TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_WHATSAPP_NUMBER en .env'
        });
      }
    } else {
      // Modo desarrollo: simular envío
      console.log(`⚠️ MODO SIMULACION (configura Twilio en .env para envío real)`);
      console.log(`Mensaje que se enviaría:\n${mensaje}`);
      
      res.json({ 
        success: true, 
        message: 'Mensaje simulado (configura Twilio en .env para envío real)',
        telefono: cliente.telefono,
        orden: servicio.numero_orden,
        modo: 'simulacion'
      });
    }
  } catch (error) {
    console.error('❌ Error POST /api/enviar-whatsapp:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🔌 Cerrando conexión a MongoDB...');
  await mongoClient.close();
  process.exit(0);
});
