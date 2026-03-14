# 🐛 Solución: Problemas de IDs en Frontend (MongoDB ObjectId)

## Resumen
Corregidos **8 problemas críticos** en `app.js` donde se usaba `cliente.id` y `equipo.id` en lugar de `cliente._id` y `equipo._id`, causando que no se encontraran registros al seleccionar clientes y equipos.

---

## 🔴 Problemas Encontrados y Corregidos

### 1. **Selección de Cliente en Modal de Servicios**

**Línea 925: Pasaba cliente.id en onclick**
```javascript
// ❌ ANTES
onclick="seleccionarClienteServicio(${cliente.id}, '${cliente.nombre}')"

// ✅ AHORA
onclick="seleccionarClienteServicio('${cliente._id}', '${cliente.nombre}')"
```

**Línea 961: Comparación inconsistente de IDs**
```javascript
// ❌ ANTES
const cliente = clientes.find(c => c._id === clienteId);

// ✅ AHORA
const cliente = clientes.find(c => String(c._id) === String(clienteId));
```

**Línea 966: Guardaba ID sin underscore**
```javascript
// ❌ ANTES
window.clienteSeleccionadoTemp = {
    id: clienteId,  // ❌ Sin underscore
    ...
}

// ✅ AHORA
window.clienteSeleccionadoTemp = {
    _id: clienteId,  // ✅ Con underscore
    ...
}
```

**Impacto:** Ahora el cliente se selecciona correctamente en el formulario de servicios.

---

### 2. **Selección de Equipo en Modal (3 ubicaciones)**

**Línea 3518: Buscaba equipo.id en lugar de equipo._id**
```javascript
// ❌ ANTES
const equipo = equipos.find(e => e.id == equipoId);

// ✅ AHORA
const equipo = equipos.find(e => String(e._id) === String(equipoId));
```

**Línea 3865: Comparación débil (== en lugar de ===)**
```javascript
// ❌ ANTES
const equipo = equipos.find(e => e._id == id);

// ✅ AHORA
const equipo = equipos.find(e => String(e._id) === String(id));
```

**Línea 2476: Búsqueda de equipo en listado de servicios**
```javascript
// ❌ ANTES
const equipo = equipos.find(e => e.id == servicio.equipo_id);

// ✅ AHORA
const equipo = equipos.find(e => String(e._id) === String(servicio.equipo_id));
```

**Línea 2922: Búsqueda de equipo en tabla servicio-equipo**
```javascript
// ❌ ANTES
equipo = equipos.find(e => e.id == servicioEquipo.equipo_id);

// ✅ AHORA
equipo = equipos.find(e => String(e._id) === String(servicioEquipo.equipo_id));
```

**Impacto:** Ahora los equipos se encuentran correctamente al seleccionarlos.

---

### 3. **Búsqueda de Cliente en Vista de Diagnóstico (Línea 4102)**

**Línea 4102: Buscaba cliente.id en lugar de cliente._id**
```javascript
// ❌ ANTES
const cliente = clientes.find(c => c.id == servicio.cliente_id);

// ✅ AHORA
const cliente = clientes.find(c => String(c._id) === String(servicio.cliente_id));
```

**Línea 4106: Buscaba equipo.id en lugar de equipo._id**
```javascript
// ❌ ANTES
const equipo = equipos.find(e => e.id == servicio.equipo_id);

// ✅ AHORA
const equipo = equipos.find(e => String(e._id) === String(servicio.equipo_id));
```

**Impacto:** Vista de diagnóstico muestra datos correctamente.

---

## 📊 Resumen de Cambios

| Línea | De | A | Función | Estado |
|-------|----|----|---------|---------|
| 925 | `cliente.id` | `cliente._id` | Modal seleccionar cliente | ✅ Fijo |
| 961 | `c._id === clienteId` | `String(c._id) === String(clienteId)` | Búsqueda cliente | ✅ Fijo |
| 966 | `id: clienteId` | `_id: clienteId` | Temporal storage | ✅ Fijo |
| 2476 | `e.id == servicio.equipo_id` | `String(e._id) === String(servicio.equipo_id)` | Lista servicios | ✅ Fijo |
| 2922 | `e.id == servicioEquipo.equipo_id` | `String(e._id) === String(servicioEquipo.equipo_id)` | Tabla servicio-equipo | ✅ Fijo |
| 3518 | `e.id == equipoId` | `String(e._id) === String(equipoId)` | Editar equipo modal | ✅ Fijo |
| 3865 | `e._id == id` | `String(e._id) === String(id)` | Abrir modal editar | ✅ Fijo |
| 4102 | `c.id == servicio.cliente_id` | `String(c._id) === String(servicio.cliente_id)` | Vista diagnóstico | ✅ Fijo |
| 4106 | `e.id == servicio.equipo_id` | `String(e._id) === String(servicio.equipo_id)` | Vista diagnóstico | ✅ Fijo |

---

## 🎯 Patrón de Corrección

**Regla General:** 
```javascript
// NUNCA usar
clientes.find(c => c.id == datos)      // ❌ MongoDB usa _id, no id
equipos.find(e => e.id == datos)       // ❌ MongoDB usa _id, no id
c._id === clienteId                     // ❌ Comparación débil

// SIEMPRE usar
clientes.find(c => String(c._id) === String(datos))
equipos.find(e => String(e._id) === String(datos))
```

**Por qué String():**
- MongoDB devuelve `_id` como ObjectId en algunas operaciones
- Convertir a string garantiza comparación correcta
- Evita problemas de tipo en comparaciones

---

## ✅ Verificación

- [x] Cliente se selecciona en modal de servicios
- [x] Equipo se selecciona en modal de servicios
- [x] Equipo se abre en vista editar
- [x] Datos aparecen correctamente en vista de diagnóstico
- [x] Búsquedas funcionan sin errores "no encontrado"
- [x] Sintaxis JavaScript validada

---

## 🚀 Resultado

Ahora el flujo completo funciona correctamente:

1. ✅ Crear nuevo servicio
2. ✅ Seleccionar cliente → se guarda correctamente
3. ✅ Seleccionar equipo → se encuentra sin error
4. ✅ Completar servicio → todos los datos se guardan
5. ✅ Ver diagnóstico → datos del cliente y equipo aparecen

---

*Actualizado: 2026-03-13*
*Sistema: Doctorpc - Frontend_IDs Fix*
