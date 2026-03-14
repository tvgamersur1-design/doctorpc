# 🔧 Solución: Error 400 al Actualizar Cliente

## Problema
```
Failed to load resource: the server responded with a status of 400 (Bad Request)
Error: Error al actualizar cliente
at guardarEdicionCliente (app.js:439:33)
```

## Causa Raíz
El backend validaba los datos de **actualización (PUT)** con la misma severidad que los de **creación (POST)**.

**Ejemplo:**
- **POST** requiere: nombre, DNI (obligatorios)
- **PUT** solo envía: teléfono, email, dirección
- Backend rechaza porque faltan nombre y DNI → Error 400

## Solución Implementada

### 1. Backend (server.js)
Se modificó la función `validarCliente()` para:

**Antes:**
```javascript
function validarCliente(data) {
  // Validación estricta siempre
  if (!data.nombre) errores.push('nombre es requerido');
  if (!data.dni) errores.push('DNI debe ser 8 dígitos');
}
```

**Después:**
```javascript
function validarCliente(data, esActualizacion = false) {
  // Validación estricta solo para POST
  if (!esActualizacion) {
    if (!data.nombre) errores.push('nombre es requerido');
    if (!data.dni) errores.push('DNI debe ser 8 dígitos');
  }
  
  // Validación parcial para POST y PUT
  if (data.nombre && typeof data.nombre !== 'string') {
    errores.push('nombre debe ser un texto no vacío');
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errores.push('Email inválido');
  }
  // ... más validaciones
}
```

### 2. Frontend (app.js - línea 203)
Se llamó `validarCliente()` con `esActualizacion = true`:

**Antes:**
```javascript
const errores = validarCliente(req.body);
```

**Después:**
```javascript
const errores = validarCliente(req.body, true); // true = es actualización
```

### 3. Mejor Manejo de Errores en Frontend
Se agregó detalles del error cuando falla (líneas 426-445):

**Antes:**
```javascript
if (!response.ok) throw new Error('Error al actualizar cliente');

// ...
catch (error) {
    console.error('Error:', error);
    alert('Error al guardar cambios');
}
```

**Después:**
```javascript
if (!response.ok) {
    const errorData = await response.json();
    const errorMsg = errorData.error || 'Error al actualizar cliente';
    const detalles = errorData.detalles ? '\n\nDetalles:\n' + errorData.detalles.join('\n') : '';
    throw new Error(errorMsg + detalles);
}

// ...
catch (error) {
    console.error('Error:', error);
    alert('❌ Error al guardar cambios:\n' + error.message);
}
```

## Validaciones Ahora Permitidas

### POST (Creación) - ESTRICTO ✅
```
nombre: OBLIGATORIO (string no vacío)
dni: OBLIGATORIO (8 dígitos)
email: Opcional (debe ser válido si se proporciona)
telefono: Opcional (7+ dígitos si se proporciona)
estado: Opcional (activo/inactivo/suspendido)
```

### PUT (Actualización) - FLEXIBLE ✅
```
nombre: Opcional (si se envía, debe ser string no vacío)
dni: Opcional (si se envía, debe ser 8 dígitos)
email: Opcional (debe ser válido si se proporciona)
telefono: Opcional (7+ dígitos si se proporciona)
estado: Opcional (activo/inactivo/suspendido)
direccion: Opcional (cualquier texto)
```

## Prueba Ahora

1. **Abre el navegador** → DevTools (F12)
2. **Edita un cliente**:
   - Cambiar teléfono → ✅ Funciona
   - Cambiar email → ✅ Funciona
   - Cambiar dirección → ✅ Funciona
3. **Click en "Guardar Cambios"**
   - Si hay error → Ve el mensaje detallado
   - Si es válido → ✅ Se guarda exitosamente

## Ejemplos de Respuestas

### ✅ Actualización Exitosa (200 OK)
```json
{
  "_id": "69b1f55cb80b1d535e0de387",
  "nombre": "Juan",
  "dni": "12345678",
  "telefono": "999888777",
  "email": "juan@mail.com",
  "estado": "activo",
  "fecha_actualizacion": "2024-03-13T16:00:00.000Z"
}
```

### ❌ Email Inválido (400 Bad Request)
```json
{
  "error": "Datos inválidos",
  "detalles": ["Email inválido"]
}
```

### ❌ Teléfono Inválido (400 Bad Request)
```json
{
  "error": "Datos inválidos",
  "detalles": ["Teléfono debe tener al menos 7 dígitos"]
}
```

## ✅ Resumen de Cambios

| Archivo | Línea | Cambio |
|---------|-------|--------|
| server.js | 75 | Agregar parámetro `esActualizacion` a `validarCliente()` |
| server.js | 79-96 | Validación condicional (POST vs PUT) |
| server.js | 206 | Pasar `true` al validar en PUT |
| app.js | 433-437 | Leer `errorData` del response 400 |
| app.js | 442 | Mostrar error detallado en alert |

---

## Notas Importantes

1. **POST (Crear cliente):** Siempre requiere nombre y DNI
2. **PUT (Editar cliente):** Puede actualizar solo algunos campos
3. **Validaciones:** Se aplican siempre (email, teléfono, etc.)
4. **Errores claros:** Ahora ves exactamente qué está mal

El error **400 Bad Request** ya no debería aparecer si envías datos válidos.
