# Diseño de Base de Datos MongoDB - DoctorPC

## Información General
- **Base de Datos:** doctorpc
- **Motor:** MongoDB Atlas (versión gratuita)
- **Colecciones:** 4 principales
- **Relaciones:** One-to-Many y Many-to-Many

---

## 1. COLECCIÓN: clientes

### Propósito
Almacenar información de clientes que contratan servicios de reparación.

### Estructura
```javascript
{
  _id: ObjectId(),
  id: Number (timestamp),
  nombre: String,
  apellido_paterno: String,
  apellido_materno: String,
  dni: String (8 dígitos, único),
  email: String,
  telefono: String,
  telefono_secundario: String,
  direccion: String,
  ciudad: String,
  distrito: String,
  empresa: String,
  cargo: String,
  fecha_creacion: String (ISO 8601),
  fecha_actualizacion: String (ISO 8601),
  estado: String (enum: "activo", "inactivo", "suspendido"),
  notas: String
}
```

### Ejemplo de Documento
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "id": 1710000000000,
  "nombre": "Juan",
  "apellido_paterno": "García",
  "apellido_materno": "López",
  "dni": "12345678",
  "email": "juan.garcia@email.com",
  "telefono": "987654321",
  "telefono_secundario": "981234567",
  "direccion": "Av. Principal 123, Apt 4B",
  "ciudad": "Lima",
  "distrito": "San Isidro",
  "empresa": "Tech Solutions Peru",
  "cargo": "Gerente de TI",
  "fecha_creacion": "2024-03-10T14:30:00Z",
  "fecha_actualizacion": "2024-03-10T14:30:00Z",
  "estado": "activo",
  "notas": "Cliente VIP - Prioridad alta"
}
```

### Índices Recomendados
```javascript
db.clientes.createIndex({ dni: 1 }, { unique: true })
db.clientes.createIndex({ email: 1 })
db.clientes.createIndex({ estado: 1 })
db.clientes.createIndex({ fecha_creacion: -1 })
```

---

## 2. COLECCIÓN: equipos

### Propósito
Registrar equipos informáticos que requieren servicio (computadoras, impresoras, etc.).

### Estructura
```javascript
{
  _id: ObjectId(),
  id: Number (timestamp),
  cliente_id: Number (referencia a clientes.id),
  tipo_equipo: String (enum: "desktop", "laptop", "impresora", "monitor", "servidor", "otro"),
  marca: String,
  modelo: String,
  numero_serie: String,
  descripcion: String,
  especificaciones: {
    procesador: String,
    memoria_ram: String,
    almacenamiento: String,
    sistema_operativo: String,
    edad_equipo: String
  },
  estado: String (enum: "operativo", "falla", "reparación", "retirado"),
  fecha_compra: String (ISO 8601),
  fecha_creacion: String (ISO 8601),
  fecha_actualizacion: String (ISO 8601),
  ubicacion: String,
  responsable: String,
  notas: String
}
```

### Ejemplo de Documento
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "id": 1710000001000,
  "cliente_id": 1710000000000,
  "tipo_equipo": "laptop",
  "marca": "Dell",
  "modelo": "Latitude 5520",
  "numero_serie": "SN123456789",
  "descripcion": "Laptop corporativa para trabajo diario",
  "especificaciones": {
    "procesador": "Intel Core i7 12th Gen",
    "memoria_ram": "16GB DDR4",
    "almacenamiento": "512GB SSD",
    "sistema_operativo": "Windows 11 Pro",
    "edad_equipo": "2 años"
  },
  "estado": "operativo",
  "fecha_compra": "2022-03-10T00:00:00Z",
  "fecha_creacion": "2024-03-10T14:30:00Z",
  "fecha_actualizacion": "2024-03-10T14:30:00Z",
  "ubicacion": "Oficina Gerencia",
  "responsable": "Juan García",
  "notas": "Requiere actualización de drivers"
}
```

### Índices Recomendados
```javascript
db.equipos.createIndex({ cliente_id: 1 })
db.equipos.createIndex({ numero_serie: 1 }, { unique: true })
db.equipos.createIndex({ estado: 1 })
db.equipos.createIndex({ tipo_equipo: 1 })
db.equipos.createIndex({ fecha_creacion: -1 })
```

---

## 3. COLECCIÓN: servicios

### Propósito
Definir los tipos de servicios que se ofrecen (diagnóstico, reparación, mantenimiento, etc.).

### Estructura
```javascript
{
  _id: ObjectId(),
  id: Number (timestamp),
  nombre_servicio: String,
  descripcion: String,
  categoria: String (enum: "diagnóstico", "reparación", "mantenimiento", "instalación", "consultoría"),
  costo_base: Number (en soles),
  tiempo_estimado: Number (en horas),
  estado: String (enum: "activo", "inactivo"),
  fecha_creacion: String (ISO 8601),
  fecha_actualizacion: String (ISO 8601),
  notas: String
}
```

### Ejemplo de Documento
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "id": 1710000002000,
  "nombre_servicio": "Diagnóstico Completo",
  "descripcion": "Evaluación exhaustiva de hardware y software",
  "categoria": "diagnóstico",
  "costo_base": 50,
  "tiempo_estimado": 1.5,
  "estado": "activo",
  "fecha_creacion": "2024-03-10T14:30:00Z",
  "fecha_actualizacion": "2024-03-10T14:30:00Z",
  "notas": "Incluye reporte detallado"
}
```

### Índices Recomendados
```javascript
db.servicios.createIndex({ categoria: 1 })
db.servicios.createIndex({ estado: 1 })
db.servicios.createIndex({ fecha_creacion: -1 })
```

---

## 4. COLECCIÓN: servicio_equipo

### Propósito
Registrar la relación entre servicios prestados y equipos (orden de servicio).
Esta es la colección central que vincula todo el sistema.

### Estructura
```javascript
{
  _id: ObjectId(),
  id: Number (timestamp),
  cliente_id: Number (referencia a clientes.id),
  equipo_id: Number (referencia a equipos.id),
  servicio_id: Number (referencia a servicios.id),
  numero_orden: String (ej: "ORD-2024-001"),
  descripcion_problema: String,
  observaciones_tecnicas: String,
  fecha_inicio: String (ISO 8601),
  fecha_final_estimada: String (ISO 8601),
  fecha_cierre: String (ISO 8601, nullable),
  estado: String (enum: "pendiente", "en_progreso", "completado", "cancelado"),
  prioridad: String (enum: "baja", "media", "alta", "urgente"),
  costo_final: Number (nullable, hasta completarse),
  costo_adicional: Number (default: 0),
  tecnico_asignado: String,
  repuestos_utilizados: Array,
  diagnostico: String,
  solucion_aplicada: String,
  feedback_cliente: String,
  calificacion: Number (1-5, nullable),
  fecha_creacion: String (ISO 8601),
  fecha_actualizacion: String (ISO 8601)
}
```

### Ejemplo de Documento
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439014"),
  "id": 1710000003000,
  "cliente_id": 1710000000000,
  "equipo_id": 1710000001000,
  "servicio_id": 1710000002000,
  "numero_orden": "ORD-2024-0001",
  "descripcion_problema": "Laptop no enciende, posible problema con batería",
  "observaciones_tecnicas": "Se detectó falla en el circuito de carga",
  "fecha_inicio": "2024-03-10T10:00:00Z",
  "fecha_final_estimada": "2024-03-12T17:00:00Z",
  "fecha_cierre": null,
  "estado": "en_progreso",
  "prioridad": "alta",
  "costo_final": null,
  "costo_adicional": 0,
  "tecnico_asignado": "Carlos Mendez",
  "repuestos_utilizados": [
    {
      "nombre": "Batería Lithium 52.5Wh",
      "costo": 150,
      "cantidad": 1
    }
  ],
  "diagnostico": "Batería agotada y circuito de carga dañado",
  "solucion_aplicada": null,
  "feedback_cliente": null,
  "calificacion": null,
  "fecha_creacion": "2024-03-10T10:00:00Z",
  "fecha_actualizacion": "2024-03-10T14:30:00Z"
}
```

### Índices Recomendados
```javascript
db.servicio_equipo.createIndex({ cliente_id: 1 })
db.servicio_equipo.createIndex({ equipo_id: 1 })
db.servicio_equipo.createIndex({ servicio_id: 1 })
db.servicio_equipo.createIndex({ numero_orden: 1 }, { unique: true })
db.servicio_equipo.createIndex({ estado: 1 })
db.servicio_equipo.createIndex({ prioridad: 1 })
db.servicio_equipo.createIndex({ fecha_inicio: -1 })
db.servicio_equipo.createIndex({ tecnico_asignado: 1 })
```

---

## 5. INTEGRACIÓN EXTERNA: DECOLECTA API

### Propósito
Validar datos de personas usando DNI. Esta integración se realiza en tiempo real desde el endpoint `/api/decolecta/:dni`

### Campos Retornados
```javascript
{
  success: Boolean,
  document_number: String,
  first_name: String,
  first_last_name: String,
  second_last_name: String,
  full_name: String,
  nombres: String,
  apellido_paterno: String,
  apellido_materno: String
}
```

### Uso en la Aplicación
Se utiliza para auto-llenar datos de clientes nuevos basándose en su DNI.

---

## 6. DIAGRAMA DE RELACIONES

```
┌─────────────────┐
│   CLIENTES      │
│  (id: PK)       │
└────────┬────────┘
         │
         ├─────────────────────┬──────────────────┐
         │                     │                  │
         ▼                     ▼                  ▼
    ┌────────────┐      ┌──────────────┐   ┌────────────────┐
    │  EQUIPOS   │      │  SERVICIOS   │   │ SERVICIO_EQUIPO│
    │ cliente_id─┼──────►   (id: PK)    │   │ (id: PK)       │
    │ (id: PK)   │      │              │   │                │
    └────────────┘      └──────────────┘   │ cliente_id  ───┼──┐
         ▲                     ▲             │ equipo_id   ───┼──┼──┐
         │                     │             │ servicio_id ───┼──┼──┼──┐
         │                     │             │ estado         │  │  │  │
         │                     │             │ estado: en_progreso,
         └─────────────────────┴─────────────┤ completado, etc
                                             │ tecnico_asignado
                                             │ calificacion
                                             └────────────────┘
```

---

## 7. REGLAS DE NEGOCIO

### Creación de Clientes
- DNI debe ser único (8 dígitos)
- Email debe ser válido
- Estado por defecto: "activo"

### Creación de Equipos
- Un equipo pertenece a un solo cliente
- Número de serie debe ser único
- Estado por defecto: "operativo"

### Creación de Servicios
- Son catálogos reutilizables
- Costo base es indicativo (puede variar en cada orden)
- Necesarios al menos los 5 tipos básicos

### Órdenes de Servicio (servicio_equipo)
- Vincula cliente, equipo y servicio
- Número de orden única
- Solo puede estar en un estado a la vez
- Costo final se calcula: `costo_base + costo_adicional + repuestos`
- Feedback solo se registra después de completada

---

## 8. CICLO DE VIDA DE UNA ORDEN DE SERVICIO

```
PENDIENTE (nueva orden)
    ↓
EN_PROGRESO (técnico asignado)
    ├─→ COMPLETADO (trabajo terminado)
    │      ├─→ Feedback del cliente
    │      └─→ Calificación (1-5 estrellas)
    │
    └─→ CANCELADO (por cliente o técnico)
```

---

## 9. QUERIES ÚTILES

### Obtener todas las órdenes de un cliente
```javascript
db.servicio_equipo.find({ cliente_id: 1710000000000 })
```

### Órdenes pendientes del sistema
```javascript
db.servicio_equipo.find({ estado: "pendiente" }).sort({ fecha_inicio: -1 })
```

### Equipos de un cliente específico
```javascript
db.equipos.find({ cliente_id: 1710000000000 })
```

### Órdenes por técnico asignado
```javascript
db.servicio_equipo.find({ tecnico_asignado: "Carlos Mendez" })
```

### Órdenes completadas en un rango de fechas
```javascript
db.servicio_equipo.find({
  estado: "completado",
  fecha_cierre: { 
    $gte: ISODate("2024-03-01"),
    $lte: ISODate("2024-03-31")
  }
})
```

### Ingresos totales por mes
```javascript
db.servicio_equipo.aggregate([
  { $match: { estado: "completado" } },
  { $group: { 
    _id: { $dateToString: { format: "%Y-%m", date: "$fecha_cierre" } },
    total_ingresos: { $sum: "$costo_final" }
  }},
  { $sort: { _id: -1 } }
])
```

---

## 10. CONSIDERACIONES DE SEGURIDAD

- DNI y datos personales sensibles
- No compartir números de serie originales
- Auditoría de cambios en órdenes críticas
- Restricción de acceso a datos de clientes
- Encriptación de contraseñas de conexión

---

## 11. ESCALABILIDAD FUTURA

- Agregar colección de usuarios (técnicos, admin)
- Historial de auditoría de cambios
- Reportes y analytics
- Seguimiento de inventario de repuestos
- Sistema de pagos integrado
- Notificaciones por correo/SMS

