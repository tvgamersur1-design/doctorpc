# 📋 Lógica Completa: Sistema de Historial de Pagos

## 🎯 Objetivo

Registrar TODOS los pagos de un servicio en una colección separada (`historial_pagos`) para tener trazabilidad completa de cada transacción, incluyendo:
- Adelanto inicial al crear el servicio
- Pagos posteriores durante la gestión de pagos

---

## 📊 Estructura de Base de Datos

### Colección: `servicios`
Almacena el **resumen financiero** del servicio:

```javascript
{
  _id: "abc123",
  numero_servicio: "SRV-2026-005",
  cliente_id: "xyz789",
  monto: 200.00,              // Monto total del servicio
  adelanto: 150.00,           // Suma de TODOS los pagos
  saldo_pendiente: 50.00,     // monto - adelanto
  estado_pago: "parcial"      // pendiente | parcial | pagado
}
```

### Colección: `historial_pagos` (NUEVA)
Almacena **cada pago individual** con todos sus detalles:

```javascript
{
  _id: "pago001",
  servicio_id: "abc123",
  numero_servicio: "SRV-2026-005",
  cliente_id: "xyz789",
  monto: 50.00,
  metodo_pago: "efectivo",
  referencia: "",
  notas: "Adelanto inicial al registrar el servicio",
  fecha_pago: "2026-04-01T10:30:00Z",
  usuario_registro: "Admin",
  fecha_creacion: "2026-04-01T10:30:00Z"
}
```

---

## 🔄 Flujo Completo de Pagos

### 🔵 Momento 1: Al Crear el Servicio

**Ubicación:** `public/js/modules/servicios.js` → función `guardarServicioReal()`

**Escenario:**
- Cliente trae su equipo para reparación
- Llenas el formulario de servicio
- Cliente da adelanto inicial: S/ 50.00

**Proceso:**

1. **Guardar servicio en `servicios`:**
   ```javascript
   {
     numero_servicio: "SRV-2026-005",
     monto: 200.00,
     adelanto: 50.00,
     saldo_pendiente: 150.00
   }
   ```

2. **Guardar adelanto en `historial_pagos`:**
   ```javascript
   if (adelantoInicial > 0) {
     const historialPago = {
       servicio_id: servicioGuardado._id,
       numero_servicio: servicio.numero_servicio,
       cliente_id: servicio.cliente_id,
       monto: adelantoInicial,
       metodo_pago: 'efectivo',
       referencia: '',
       notas: 'Adelanto inicial al registrar el servicio',
       usuario_registro: localStorage.getItem('usuario_nombre') || 'Sistema'
     };
     
     await fetch(`${API_BASE}/api/historial-pagos`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(historialPago)
     });
   }
   ```

**Resultado:**
- ✅ Servicio creado con adelanto de S/ 50.00
- ✅ Primer pago registrado en historial

---

### 🟣 Momento 2: Durante Gestión de Pagos

**Ubicación:** `public/js/modules/pagos.js` → función `guardarPago()`

**Escenario:**
- Cliente regresa días después
- Hace pagos adicionales

**Proceso:**

1. **Actualizar servicio en `servicios`:**
   ```javascript
   const nuevoAdelanto = pago.montoPagado + monto;
   const nuevoSaldo = pago.montoTotal - nuevoAdelanto;
   
   await fetch(`${API_BASE}/api/servicios/${servicioId}`, {
     method: 'PUT',
     body: JSON.stringify({
       adelanto: nuevoAdelanto,
       saldo_pendiente: nuevoSaldo,
       estado_pago: estadoPago
     })
   });
   ```

2. **Guardar pago en `historial_pagos`:**
   ```javascript
   const historialPago = {
     servicio_id: servicioId,
     numero_servicio: pago.numero_servicio,
     cliente_id: pago.cliente_id,
     monto: monto,
     metodo_pago: metodo,
     referencia: referencia,
     notas: notas,
     usuario_registro: localStorage.getItem('usuario_nombre') || 'Sistema'
   };
   
   await fetch(`${API_BASE}/api/historial-pagos`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(historialPago)
   });
   ```

**Resultado:**
- ✅ Servicio actualizado (adelanto += monto)
- ✅ Nuevo pago registrado en historial

---

## 📋 Ejemplo Completo

### Servicio: SRV-2026-005
**Monto Total:** S/ 200.00

### Historial de Pagos:

| N° | Fecha | Monto | Método | Referencia | Notas | Origen |
|----|-------|-------|--------|------------|-------|--------|
| 1 | 01/04/2026 | S/ 50.00 | Efectivo | - | Adelanto inicial al registrar servicio | Registro Servicio |
| 2 | 05/04/2026 | S/ 100.00 | Yape | REF123456 | Segundo pago | Gestión Pagos |
| 3 | 08/04/2026 | S/ 50.00 | Transferencia | REF789012 | Pago final | Gestión Pagos |

**Total Pagado:** S/ 200.00  
**Estado:** PAGADO ✅

---

## 🖥️ Interfaz de Usuario

### Botones en Gestión de Pagos

Cada servicio tiene 3 botones:

1. **💰 Pagar** (visible si saldo > 0)
   - Abre modal para registrar nuevo pago
   - Guarda en `servicios` y `historial_pagos`

2. **📋 Ver Pagos** (siempre visible)
   - Muestra modal con historial completo del servicio
   - Lista todos los pagos con detalles

3. **📊 Historial** (siempre visible)
   - Muestra todos los servicios del cliente
   - Resumen financiero general

### Modal: Historial de Pagos del Servicio

**Función:** `verHistorialPagosServicio(servicioId)`

**Muestra:**
- Información del servicio (número, cliente)
- Resumen financiero (total, pagado, saldo)
- Tabla con todos los pagos:
  - N°, Fecha, Monto, Método, Referencia, Notas

---

## 🔧 Archivos Modificados/Creados

### Backend
- ✅ `functions/historial-pagos.js` - Endpoint para gestionar historial
- ✅ `netlify.toml` - Rutas agregadas

### Frontend
- ✅ `public/js/modules/servicios.js` - Registra adelanto inicial
- ✅ `public/js/modules/pagos.js` - Registra pagos posteriores
- ✅ `public/dashboard.html` - Modal de historial de pagos
- ✅ `public/css/pagos.css` - Estilos para botón "Ver Pagos"
- ✅ `public/js/main.js` - Exportar funciones

### Utilidades
- ✅ `crear-coleccion-historial.js` - Script para crear colección

---

## 🚀 Instalación y Configuración

### 1. Crear la colección en MongoDB

**Opción A - Automática:**
```bash
node crear-coleccion-historial.js
```

**Opción B - Manual:**
1. Abrir MongoDB Compass/Atlas
2. Conectar a base de datos `doctorpc`
3. Crear colección: `historial_pagos`

### 2. Reiniciar el servidor

```bash
# Detener (Ctrl + C)
# Reiniciar:
netlify dev
```

### 3. Verificar funcionamiento

1. Crear un servicio con adelanto
2. Abrir consola del navegador (F12)
3. Verificar mensajes:
   - `💰 Registrando adelanto inicial en historial`
   - `✅ Adelanto inicial registrado en historial`

4. Ir a "Gestión de Pagos"
5. Click en "📋 Ver Pagos"
6. Verificar que aparece el adelanto inicial

---

## ✅ Ventajas del Sistema

### 🔍 Trazabilidad Total
- Cada pago tiene fecha exacta
- Método de pago registrado
- Referencias para auditoría
- Origen del pago identificado
- Usuario que registró

### 📊 Reportes Detallados
- Historial por servicio
- Historial por cliente
- Pagos por fecha
- Pagos por método
- Análisis de cobros

### 💼 Control Financiero
- Saber cuándo se pagó cada monto
- Verificar referencias bancarias
- Generar comprobantes individuales
- Auditoría completa de pagos
- Transparencia con el cliente

---

## 🔍 Verificación y Debugging

### Consola del Navegador (F12)

**Al crear servicio con adelanto:**
```
💰 Registrando adelanto inicial en historial: 50
✅ Adelanto inicial registrado en historial
```

**Al registrar pago:**
```
💰 Registrando pago: { servicioId, monto, ... }
📝 Guardando en historial: { servicio_id, ... }
✅ Historial guardado: { _id: "...", ... }
```

### MongoDB

**Verificar colecciones:**
```
doctorpc
├── clientes
├── equipos
├── servicios
├── historial_pagos ← NUEVA
└── usuarios
```

**Consultar historial de un servicio:**
```javascript
db.historial_pagos.find({ servicio_id: "abc123" }).sort({ fecha_pago: -1 })
```

---

## 📝 Notas Importantes

1. **El adelanto inicial se registra automáticamente** al crear el servicio
2. **Cada pago posterior se registra automáticamente** al usar "Gestión de Pagos"
3. **No se pueden eliminar pagos** del historial (solo consultar)
4. **Si falla el registro en historial**, el pago se guarda igual en `servicios`
5. **El método de pago del adelanto inicial** es "efectivo" por defecto

---

## 🎯 Próximas Mejoras (Opcional)

- [ ] Permitir editar método de pago del adelanto inicial
- [ ] Generar comprobantes PDF por cada pago
- [ ] Enviar comprobante por WhatsApp/Email
- [ ] Reportes de pagos por fecha/método
- [ ] Exportar historial a Excel
- [ ] Gráficos de análisis de cobros

---

## 📞 Soporte

Si tienes problemas:
1. Verifica que la colección `historial_pagos` existe
2. Revisa la consola del navegador (F12)
3. Verifica que el servidor esté corriendo
4. Revisa los logs del backend en Netlify

---

**Última actualización:** Abril 2026  
**Versión:** 1.0
