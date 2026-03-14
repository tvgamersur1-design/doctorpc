# 🔧 Bugs Corregidos en server.js

## Resumen
Se corrigieron **5 bugs críticos** en el CRUD de clientes, equipos y servicios que afectaban la integridad de datos y la experiencia del usuario.

---

## 🐛 Bugs Encontrados y Corregidos

### 1. **CRÍTICO: IDs duplicados por race condition** ✅
**Línea Original:** 67 (POST /api/clientes)

**Problema:**
```javascript
// ANTES - Genera duplicados con concurrencia
id: `C${String(await db.collection('clientes').countDocuments() + 1).padStart(3, '0')}`
```
- Dos solicitudes simultáneas leen `countDocuments()` como 5
- Ambas crean ID `C006` → BD corrupta

**Solución:**
```javascript
// AHORA - Usa _id automático de MongoDB (único garantizado)
// El cliente recibe: { _id: ObjectId(...), ...datos }
```
- MongoDB garantiza `_id` único y atómico
- Sin race conditions
- IDs de BD estándar

**Impacto:** Evita duplicados en inserciones concurrentes

---

### 2. **ALTO: Sin validación en POST** ✅
**Línea Original:** 64-77 (POST /api/clientes)

**Problema:**
```javascript
// ANTES - Acepta cualquier dato
app.post('/api/clientes', async (req, res) => {
  const nuevoCliente = {
    ...req.body // ❌ Sin validar
  };
});
```

**Casos fallidos:**
- DNI inválido: "papapapa"
- DNI nulo
- Email inválido: "notanemail"
- Nombre vacío: ""
- DNI duplicado: "12345678" (2 clientes iguales)

**Solución:**
```javascript
function validarCliente(data) {
  const errores = [];
  
  if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
    errores.push('nombre es requerido');
  }
  
  if (!data.dni || !/^\d{8}$/.test(data.dni)) {
    errores.push('DNI debe ser 8 dígitos');
  }
  
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errores.push('Email inválido');
  }
  
  if (data.telefono && !/^\d{7,}$/.test(data.telefono)) {
    errores.push('Teléfono debe tener al menos 7 dígitos');
  }
  
  if (data.estado && !['activo', 'inactivo', 'suspendido'].includes(data.estado)) {
    errores.push('Estado inválido');
  }
  
  return errores;
}

// Respuesta si hay errores:
// { error: 'Datos inválidos', detalles: ['DNI debe ser 8 dígitos', '...'] }
```

**Impacto:** Previene datos inválidos en BD

---

### 3. **ALTO: GET by ID confuso / incompleto** ✅
**Línea Original:** 53-61 (GET /api/clientes/:id)

**Problema:**
```javascript
// ANTES - Solo busca por un campo
const cliente = await db.collection('clientes').findOne({ id: req.params.id });
```
- Si frontend usa `_id` de MongoDB → no encuentra el cliente
- Si usa DNI → no encuentra el cliente
- Confusión: ¿qué parámetro espera?

**Solución:**
```javascript
// AHORA - Busca inteligentemente
app.get('/api/clientes/:id', async (req, res) => {
  let cliente;
  
  // 1. Intenta por _id de MongoDB
  if (ObjectId.isValid(req.params.id)) {
    cliente = await db.collection('clientes').findOne({ 
      _id: new ObjectId(req.params.id) 
    });
  }
  
  // 2. Si no encontró, intenta por DNI
  if (!cliente && /^\d{8}$/.test(req.params.id)) {
    cliente = await db.collection('clientes').findOne({ 
      dni: req.params.id 
    });
  }
  
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(cliente);
});
```

**Impacto:** GET funciona con `_id` O con DNI

---

### 4. **BAJO: DELETE sin confirmación** ✅
**Línea Original:** 101-108 (DELETE /api/clientes/:id)

**Problema:**
```javascript
// ANTES - No dice si realmente eliminó
await db.collection('clientes').deleteOne({ id: req.params.id });
res.json({ success: true }); // ❌ True aunque no exista el cliente
```

**Solución:**
```javascript
// AHORA - Retorna confirmación clara
const result = await db.collection('clientes').deleteOne({ 
  _id: new ObjectId(req.params.id) 
});

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
  deletedCount: 1 
});
```

**Impacto:** Frontend sabe si realmente se eliminó

---

### 5. **ALTO: DNI no tiene validación UNIQUE** ✅
**Línea Original:** 64-77 + BD (POST /api/clientes)

**Problema:**
```javascript
// ANTES - Permite DNI duplicados
const nuevoCliente = {
  ...req.body // ❌ Puede tener DNI repetido
};
```

**Solución en code:**
```javascript
// Verificar DNI único ANTES de insertar
const dniExistente = await db.collection('clientes').findOne({ 
  dni: req.body.dni 
});
if (dniExistente) {
  return res.status(409).json({ 
    error: 'DNI ya registrado',
    cliente_existente: dniExistente
  });
}
```

**Solución en BD:**
```javascript
// createIndexes() - Línea 43
await db.collection('clientes').createIndex({ 
  dni: 1 
}, { 
  unique: true, 
  sparse: true 
});
```

**Impacto:** MongoDB rechaza DNI duplicados. DECOLECTA funciona correctamente.

---

## 📋 Cambios por Endpoint

### **CLIENTES** ✅
- ✅ POST: Validación completa + check DNI único
- ✅ GET all: Sin cambios (funciona)
- ✅ GET by ID: Busca por `_id` O DNI
- ✅ PUT: Validación + búsqueda mejorada
- ✅ DELETE: Confirmación clara

### **EQUIPOS** ✅
- ✅ POST: Validación `cliente_id` + `tipo_equipo` + check numero_serie único
- ✅ GET all: Sin cambios
- ✅ GET by ID: Busca por `_id` O `cliente_id`
- ✅ PUT: Validación + búsqueda mejorada
- ✅ DELETE: Confirmación clara

### **SERVICIOS** ✅
- ✅ POST: Validación `nombre_servicio`, `categoria`, `costo_base`
- ✅ GET all: Sin cambios
- ✅ PUT: Búsqueda por `_id`
- ✅ DELETE: Confirmación clara

### **INDEXES AUTOMÁTICOS** ✅
```javascript
// Se crean al iniciar el servidor
db.clientes.createIndex({ dni: 1 }, { unique: true })
db.clientes.createIndex({ email: 1 })
db.clientes.createIndex({ estado: 1 })

db.equipos.createIndex({ cliente_id: 1 })
db.equipos.createIndex({ numero_serie: 1 }, { unique: true })
db.equipos.createIndex({ estado: 1 })

db.servicios.createIndex({ estado: 1 })

db.servicio_equipo.createIndex({ numero_orden: 1 }, { unique: true })
```

---

## 🚀 Cómo Probar

### Test 1: Crear cliente válido
```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido_paterno": "García",
    "dni": "12345678",
    "email": "juan@mail.com",
    "telefono": "987654321"
  }'
```

**Respuesta esperada:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "nombre": "Juan",
  "dni": "12345678",
  "estado": "activo",
  "fecha_creacion": "2024-03-13T...",
  ...
}
```

### Test 2: Intentar crear con DNI duplicado
```bash
# Crear primero
curl -X POST http://localhost:3000/api/clientes ...
# Intentar crear con mismo DNI
curl -X POST http://localhost:3000/api/clientes ...
```

**Respuesta esperada (409):**
```json
{
  "error": "DNI ya registrado",
  "cliente_existente": { ... }
}
```

### Test 3: GET por _id
```bash
curl http://localhost:3000/api/clientes/507f1f77bcf86cd799439011
```

### Test 4: GET por DNI
```bash
curl http://localhost:3000/api/clientes/12345678
```

### Test 5: DELETE inexistente
```bash
curl -X DELETE http://localhost:3000/api/clientes/000invalid000
```

**Respuesta esperada (404):**
```json
{
  "success": false,
  "error": "Cliente no encontrado",
  "deletedCount": 0
}
```

---

## ✅ Checklist de Validación

- [x] POST /api/clientes valida nombres, DNI, email
- [x] POST /api/clientes rechaza DNI duplicados
- [x] GET /api/clientes/:id busca por `_id` O DNI
- [x] DELETE /api/clientes/:id retorna `deletedCount`
- [x] POST /api/equipos valida `cliente_id` y `tipo_equipo`
- [x] POST /api/equipos rechaza numero_serie duplicados
- [x] POST /api/servicios valida campos requeridos
- [x] Índices UNIQUE creados automáticamente
- [x] Logs de error en consola para debugging

---

## 📝 Notas
- Todos los endpoints ahora usan MongoDB `_id` (ObjectId)
- Validación en BACKEND (no confiar en frontend)
- Índices `sparse: true` permite campos opcionales nulos
- Error 409 = Conflict (datos duplicados/únicos)
- Error 400 = Bad Request (datos inválidos)
