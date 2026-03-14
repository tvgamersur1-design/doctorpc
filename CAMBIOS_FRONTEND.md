# 🔧 Cambios en Frontend - Migración a ObjectId de MongoDB

## Problema Identificado
El frontend estaba usando `cliente.id` y `equipo.id` (IDs personalizados tipo "C001", "E001"), pero el backend ahora usa `_id` de MongoDB (ObjectId).

Esto causaba error `400 Bad Request` al intentar guardar cambios del cliente.

## Solución Aplicada
Se cambiaron todas las referencias de:
- `cliente.id` → `cliente._id`
- `equipo.id` → `equipo._id`
- `servicio.id` → `servicio._id`
- `equipo.serie` → `equipo.numero_serie`

## Cambios Realizados en app.js

### 1. Tabla de Clientes - Botones Ver/Eliminar
**Líneas 233, 236, 292, 295**
```javascript
// ANTES
onclick="abrirModalVerCliente('${cliente.id}')"
onclick="confirmarEliminarCliente('${cliente.id}')"

// AHORA
onclick="abrirModalVerCliente('${cliente._id}')"
onclick="confirmarEliminarCliente('${cliente._id}')"
```

### 2. Modal de Detalles Cliente - Botones Guardar/Eliminar
**Líneas 331, 382, 385**
```javascript
// ANTES
window.clienteEnEdicion = { id: cliente.id, ...cliente }
onclick="guardarEdicionCliente('${cliente.id}')"
onclick="confirmarEliminarClienteDesdeModal('${cliente.id}')"

// AHORA
window.clienteEnEdicion = { _id: cliente._id, ...cliente }
onclick="guardarEdicionCliente('${cliente._id}')"
onclick="confirmarEliminarClienteDesdeModal('${cliente._id}')"
```

### 3. Búsqueda de Cliente en Modal
**Línea 324**
```javascript
// ANTES
cliente = clientes.find(c => c.id == id);

// AHORA
cliente = clientes.find(c => c._id == id);
```

### 4. Select de Clientes en Servicios
**Línea 491**
```javascript
// ANTES
option.value = cliente.id;

// AHORA
option.value = cliente._id;
```

### 5. Validación y Selección de Cliente
**Líneas 931, 948, 950**
```javascript
// ANTES
const response = await fetch(`${API_URL}/clientes/${cliente.id}`, ...);
document.getElementById('cliente_id').value = cliente.id;
window.clienteIdActual = cliente.id;

// AHORA
const response = await fetch(`${API_URL}/clientes/${cliente._id}`, ...);
document.getElementById('cliente_id').value = cliente._id;
window.clienteIdActual = cliente._id;
```

### 6. Búsqueda en Servicios (Modal)
**Línea 872**
```javascript
// ANTES
const cliente = clientes.find(c => c.id === clienteId);

// AHORA
const cliente = clientes.find(c => c._id === clienteId);
```

### 7. Selección de Equipo en Servicios
**Línea 1018**
```javascript
// ANTES
onclick="seleccionarEquipo('${equipo.id}', ...)"
${equipo.serie ? ... : ''}

// AHORA
onclick="seleccionarEquipo('${equipo._id}', ...)"
${equipo.numero_serie ? ... : ''}
```

### 8. Guardar Cliente Nuevo en Servicios
**Líneas 1260, 1262**
```javascript
// ANTES
document.getElementById('cliente_id').value = clienteGuardado.id;
window.clienteIdActual = clienteGuardado.id;

// AHORA
document.getElementById('cliente_id').value = clienteGuardado._id;
window.clienteIdActual = clienteGuardado._id;
```

### 9. Tabla de Servicios - Buscar Clientes y Equipos
**Líneas 1626, 1631, 1634, 1636**
```javascript
// ANTES
const cliente = clientes.find(c => c.id == srv.cliente_id);
equipo = equipos.find(e => e.id == srv.equipo_id);
const servicioEquipo = serviciosEquipo.find(se => se.servicio_id == srv.id);
equipo = equipos.find(e => e.id == servicioEquipo.equipo_id);

// AHORA
const cliente = clientes.find(c => c._id == srv.cliente_id);
equipo = equipos.find(e => e._id == srv.equipo_id);
const servicioEquipo = serviciosEquipo.find(se => se.servicio_id == srv._id);
equipo = equipos.find(e => e._id == servicioEquipo.equipo_id);
```

### 10. Modal Diagnóstico
**Líneas 2341, 2345**
```javascript
// ANTES
const servicio = servicios.find(s => s.id === servicioId);
const cliente = clientes.find(c => c.id == servicio.cliente_id);

// AHORA
const servicio = servicios.find(s => s._id === servicioId);
const cliente = clientes.find(c => c._id == servicio.cliente_id);
```

### 11. Modal Editar Servicio
**Líneas 2816, 2824**
```javascript
// ANTES
const cliente = clientes.find(c => c.id == servicio.cliente_id);
equipo = equipos.find(e => e.id == servicio.equipo_id);

// AHORA
const cliente = clientes.find(c => c._id == servicio.cliente_id);
equipo = equipos.find(e => e._id == servicio.equipo_id);
```

### 12. Tabla de Servicios Diagnosticados
**Líneas 3975, 3976**
```javascript
// ANTES
const cliente = clientes.find(c => c.id == srv.cliente_id);
const equipo = equipos.find(e => e.id == srv.equipo_id);

// AHORA
const cliente = clientes.find(c => c._id == srv.cliente_id);
const equipo = equipos.find(e => e._id == srv.equipo_id);
```

### 13. Modal Confirmar Equipo
**Línea 3363, 3375**
```javascript
// ANTES
onclick="abrirModalConfirmarEquipo('${equipo.id}')"
Serie: ${equipo.serie || 'N/A'}

// AHORA
onclick="abrirModalConfirmarEquipo('${equipo._id}')"
Serie: ${equipo.numero_serie || 'N/A'}
```

### 14. Modal Editar Equipo
**Líneas 3776, 3784, 3788**
```javascript
// ANTES
const equipo = equipos.find(e => e.id == id);
document.getElementById('editEquipoId').value = equipo.id;
document.getElementById('editSerie').value = equipo.serie;

// AHORA
const equipo = equipos.find(e => e._id == id);
document.getElementById('editEquipoId').value = equipo._id;
document.getElementById('editSerie').value = equipo.numero_serie;
```

---

## Resumen de Cambios

| Línea(s) | Campo | Cambio |
|----------|-------|--------|
| 233, 236, 292, 295 | Cliente ID | `id` → `_id` |
| 324 | Search | `id` → `_id` |
| 331 | Edit | `id` → `_id` |
| 382, 385 | Buttons | `id` → `_id` |
| 491 | Select | `id` → `_id` |
| 872 | Find | `id` → `_id` |
| 931, 948, 950 | Validation | `id` → `_id` |
| 1018, 1020 | Equipo Select | `id` → `_id`, `serie` → `numero_serie` |
| 1260, 1262 | New Client | `id` → `_id` |
| 1626, 1631, 1634, 1636 | Services Table | `id` → `_id` |
| 2341, 2345 | Diagnosis | `id` → `_id` |
| 2816, 2824 | Edit Service | `id` → `_id` |
| 3363, 3375 | Equipo Modal | `id` → `_id`, `serie` → `numero_serie` |
| 3776, 3784, 3788 | Edit Equipo | `id` → `_id`, `serie` → `numero_serie` |
| 3975, 3976 | Diagnosticados | `id` → `_id` |

---

## Prueba de Cambios

Después de estos cambios:
1. ✅ Guardar cambios de cliente debe funcionar (PUT 200 OK)
2. ✅ Crear nuevo cliente debe funcionar (POST 201)
3. ✅ Eliminar cliente debe funcionar (DELETE 200 OK)
4. ✅ Seleccionar clientes en servicios debe funcionar
5. ✅ Seleccionar equipos debe funcionar
6. ✅ Todas las búsquedas deben funcionar

---

## Nota Importante
Estos cambios son necesarios porque MongoDB usa `_id` como identificador único, no campos personalizados como `id`. Esto es más robusto y evita conflictos.
