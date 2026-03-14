# 📡 Ejemplos de Requests y Responses

Ejemplos de cómo usar los endpoints después de las correcciones.

---

## 🟢 POST /api/clientes - CASO EXITOSO

### Request
```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido_paterno": "García",
    "apellido_materno": "López",
    "dni": "12345678",
    "email": "juan.garcia@mail.com",
    "telefono": "987654321",
    "direccion": "Av. Principal 123",
    "ciudad": "Lima",
    "distrito": "San Isidro",
    "estado": "activo"
  }'
```

### Response (201 Created)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "nombre": "Juan",
  "apellido_paterno": "García",
  "apellido_materno": "López",
  "dni": "12345678",
  "email": "juan.garcia@mail.com",
  "telefono": "987654321",
  "telefono_secundario": "",
  "direccion": "Av. Principal 123",
  "ciudad": "Lima",
  "distrito": "San Isidro",
  "empresa": "",
  "cargo": "",
  "estado": "activo",
  "notas": "",
  "fecha_creacion": "2024-03-13T15:30:00.000Z",
  "fecha_actualizacion": "2024-03-13T15:30:00.000Z"
}
```

---

## 🔴 POST /api/clientes - DNI INVÁLIDO

### Request
```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "dni": "123",
    "email": "juan@mail.com"
  }'
```

### Response (400 Bad Request)
```json
{
  "error": "Datos inválidos",
  "detalles": [
    "DNI debe ser 8 dígitos"
  ]
}
```

---

## 🔴 POST /api/clientes - SIN NOMBRE

### Request
```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "dni": "12345678",
    "email": "juan@mail.com"
  }'
```

### Response (400 Bad Request)
```json
{
  "error": "Datos inválidos",
  "detalles": [
    "nombre es requerido"
  ]
}
```

---

## 🔴 POST /api/clientes - DNI DUPLICADO

### Request (segundo cliente con mismo DNI)
```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Pedro",
    "dni": "12345678",
    "email": "pedro@mail.com"
  }'
```

### Response (409 Conflict)
```json
{
  "error": "DNI ya registrado",
  "cliente_existente": {
    "_id": "507f1f77bcf86cd799439011",
    "nombre": "Juan",
    "dni": "12345678",
    "email": "juan.garcia@mail.com",
    "estado": "activo"
  }
}
```

---

## 🔴 POST /api/clientes - EMAIL INVÁLIDO

### Request
```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "dni": "12345678",
    "email": "notanemail"
  }'
```

### Response (400 Bad Request)
```json
{
  "error": "Datos inválidos",
  "detalles": [
    "Email inválido"
  ]
}
```

---

## 🟢 GET /api/clientes (todos)

### Request
```bash
curl http://localhost:3000/api/clientes
```

### Response (200 OK)
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "nombre": "Juan",
    "dni": "12345678",
    "email": "juan.garcia@mail.com",
    "estado": "activo",
    "fecha_creacion": "2024-03-13T15:30:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "nombre": "Maria",
    "dni": "87654321",
    "email": "maria@mail.com",
    "estado": "activo",
    "fecha_creacion": "2024-03-13T15:35:00.000Z"
  }
]
```

---

## 🟢 GET /api/clientes/:id - POR ObjectId

### Request
```bash
curl http://localhost:3000/api/clientes/507f1f77bcf86cd799439011
```

### Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "nombre": "Juan",
  "apellido_paterno": "García",
  "dni": "12345678",
  "email": "juan.garcia@mail.com",
  "estado": "activo",
  "fecha_creacion": "2024-03-13T15:30:00.000Z"
}
```

---

## 🟢 GET /api/clientes/:id - POR DNI

### Request
```bash
curl http://localhost:3000/api/clientes/12345678
```

### Response (200 OK) - Mismo cliente de arriba
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "nombre": "Juan",
  "dni": "12345678",
  "email": "juan.garcia@mail.com",
  "estado": "activo"
}
```

---

## 🔴 GET /api/clientes/:id - NO EXISTE

### Request
```bash
curl http://localhost:3000/api/clientes/000invalid000
```

### Response (404 Not Found)
```json
{
  "error": "Cliente no encontrado"
}
```

---

## 🟢 PUT /api/clientes/:id - ACTUALIZACIÓN EXITOSA

### Request
```bash
curl -X PUT http://localhost:3000/api/clientes/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.nuevo@mail.com",
    "telefono": "999888777"
  }'
```

### Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "nombre": "Juan",
  "dni": "12345678",
  "email": "juan.nuevo@mail.com",
  "telefono": "999888777",
  "estado": "activo",
  "fecha_actualizacion": "2024-03-13T15:40:00.000Z"
}
```

---

## 🔴 PUT /api/clientes/:id - EMAIL INVÁLIDO

### Request
```bash
curl -X PUT http://localhost:3000/api/clientes/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid"}'
```

### Response (400 Bad Request)
```json
{
  "error": "Datos inválidos",
  "detalles": [
    "Email inválido"
  ]
}
```

---

## 🟢 DELETE /api/clientes/:id - EXITOSO

### Request
```bash
curl -X DELETE http://localhost:3000/api/clientes/507f1f77bcf86cd799439011
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Cliente eliminado exitosamente",
  "deletedCount": 1
}
```

---

## 🔴 DELETE /api/clientes/:id - NO EXISTE

### Request
```bash
curl -X DELETE http://localhost:3000/api/clientes/000invalid000
```

### Response (404 Not Found)
```json
{
  "success": false,
  "error": "Cliente no encontrado",
  "deletedCount": 0
}
```

---

## 🟢 POST /api/equipos - EXITOSO

### Request
```bash
curl -X POST http://localhost:3000/api/equipos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "507f1f77bcf86cd799439011",
    "tipo_equipo": "laptop",
    "marca": "Dell",
    "modelo": "Latitude 5520",
    "numero_serie": "SN123456789",
    "descripcion": "Laptop corporativa",
    "estado": "operativo",
    "ubicacion": "Oficina Gerencia",
    "responsable": "Juan García"
  }'
```

### Response (201 Created)
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "cliente_id": "507f1f77bcf86cd799439011",
  "tipo_equipo": "laptop",
  "marca": "Dell",
  "modelo": "Latitude 5520",
  "numero_serie": "SN123456789",
  "descripcion": "Laptop corporativa",
  "estado": "operativo",
  "ubicacion": "Oficina Gerencia",
  "responsable": "Juan García",
  "fecha_creacion": "2024-03-13T15:45:00.000Z",
  "fecha_actualizacion": "2024-03-13T15:45:00.000Z"
}
```

---

## 🔴 POST /api/equipos - numero_serie DUPLICADO

### Request (segundo equipo con mismo numero_serie)
```bash
curl -X POST http://localhost:3000/api/equipos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "507f1f77bcf86cd799439012",
    "tipo_equipo": "desktop",
    "numero_serie": "SN123456789"
  }'
```

### Response (409 Conflict)
```json
{
  "error": "Número de serie ya existe",
  "equipo_existente": {
    "_id": "507f1f77bcf86cd799439012",
    "cliente_id": "507f1f77bcf86cd799439011",
    "numero_serie": "SN123456789"
  }
}
```

---

## 🟢 POST /api/servicios - EXITOSO

### Request
```bash
curl -X POST http://localhost:3000/api/servicios \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_servicio": "Diagnóstico Completo",
    "descripcion": "Evaluación exhaustiva de hardware y software",
    "categoria": "diagnóstico",
    "costo_base": 50,
    "tiempo_estimado": 1.5
  }'
```

### Response (201 Created)
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "nombre_servicio": "Diagnóstico Completo",
  "descripcion": "Evaluación exhaustiva de hardware y software",
  "categoria": "diagnóstico",
  "costo_base": 50,
  "tiempo_estimado": 1.5,
  "estado": "activo",
  "notas": "",
  "fecha_creacion": "2024-03-13T15:50:00.000Z",
  "fecha_actualizacion": "2024-03-13T15:50:00.000Z"
}
```

---

## 🔴 POST /api/servicios - FALTA nombre_servicio

### Request
```bash
curl -X POST http://localhost:3000/api/servicios \
  -H "Content-Type: application/json" \
  -d '{
    "categoria": "diagnóstico",
    "costo_base": 50
  }'
```

### Response (400 Bad Request)
```json
{
  "error": "Datos inválidos",
  "detalles": [
    "nombre_servicio, categoria y costo_base son requeridos"
  ]
}
```

---

## HTTP Status Codes Retornados

| Código | Significado | Ejemplo |
|--------|------------|---------|
| 200 | OK | GET/PUT exitoso |
| 201 | Created | POST exitoso |
| 400 | Bad Request | Datos inválidos |
| 404 | Not Found | Cliente/equipo no existe |
| 409 | Conflict | DNI/numero_serie duplicado |
| 500 | Server Error | Error en servidor |

---

## 💡 Notas Importantes

1. **Usar `_id` para búsquedas**: Siempre guardar el `_id` retornado en POST
2. **DNI como alternativa**: Puedes usar DNI en GET/DELETE si no tienes `_id`
3. **Validación en backend**: No confiar en validación del frontend
4. **Índices UNIQUE**: MongoDB rechaza automáticamente duplicados
5. **Status HTTP**: Siempre revisar status code, no solo la respuesta JSON
