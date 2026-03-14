# 📋 Caso de Uso: Gestión de Estados de Servicios

## 🎯 Objetivo
Implementar un sistema de estados que permita rastrear el ciclo de vida completo de cada servicio de reparación.

---

## 📊 Flujo de Estados

```
┌─────────────┐
│  PENDIENTE  │ (Servicio creado, esperando diagnóstico)
└──────┬──────┘
       │ [Abrir Diagnóstico]
       ↓
┌──────────────────┐
│ EN DIAGNÓSTICO   │ (Técnico está evaluando el equipo)
└──────┬───────────┘
       │ [Guardar Diagnóstico]
       ↓
┌───────────────────┐
│  EN REPARACIÓN    │ (Reparación en progreso)
└──────┬────────────┘
       │ [Marcar como Completado]
       ↓
┌──────────────┐
│  COMPLETADO  │ (Reparación terminada, listo para entregar)
└──────┬───────┘
       │ [Entregar Servicio]
       ↓
┌──────────────┐
│  ENTREGADO   │ (Fin del servicio)
└──────────────┘
```

---

## 🔄 Transiciones Permitidas

| Estado Actual | Puede cambiar a | Acción | Quién |
|---|---|---|---|
| **PENDIENTE** | EN DIAGNÓSTICO | Click "Diagnosticar" (automático) | Cualquiera |
| **EN DIAGNÓSTICO** | EN DIAGNÓSTICO | Guardar Progreso (sigue editando) | Técnico |
| **EN DIAGNÓSTICO** | EN REPARACIÓN | Finalizar Diagnóstico | Técnico |
| **EN REPARACIÓN** | COMPLETADO | Click flecha (Cambiar Estado) | Técnico/Admin |
| **COMPLETADO** | ENTREGADO | Click flecha (Cambiar Estado) | Técnico/Admin |
| **ENTREGADO** | - | Final (sin cambios) | - |

---

## 💾 Datos a Guardar por Estado

### 1. **PENDIENTE**
```javascript
{
  estado: "Pendiente",
  fecha_creacion: "2026-03-10",
  numero_servicio: "SRV-2026-001"
}
```

### 2. **EN DIAGNÓSTICO**
```javascript
{
  estado: "En diagnóstico",
  fecha_inicio_diagnostico: "2026-03-10 14:30",
  tecnico_diagnostico: "Jesus"
}
```

### 3. **EN REPARACIÓN**
```javascript
{
  estado: "En reparación",
  diagnostico: "[{descripcion: 'pantalla rota', costo: 200}]",
  fecha_inicio_reparacion: "2026-03-10 15:00"
}
```

### 4. **COMPLETADO**
```javascript
{
  estado: "Completado",
  fecha_completado: "2026-03-10 17:30",
  observaciones_finales: "..."
}
```

### 5. **ENTREGADO**
```javascript
{
  estado: "Entregado",
  fecha_entrega: "2026-03-10 18:00",
  entregado_por: "Nombre técnico"
}
```

---

## 🎨 Colores por Estado

| Estado | Color | Ícono |
|---|---|---|
| PENDIENTE | 🟡 Amarillo (#FFF3CD) | ⏱️ hourglass-half |
| EN DIAGNÓSTICO | 🔵 Azul (#E3F2FD) | 🔍 stethoscope |
| EN REPARACIÓN | 🟠 Naranja (#FFE0B2) | 🔧 tools |
| COMPLETADO | 🟢 Verde (#D4EDDA) | ✅ check-circle |
| ENTREGADO | 🟣 Púrpura (#F3E5F5) | 📦 box-open |

---

## 🔌 Cambios en la Base de Datos

Agregar a tabla `servicios`:

```javascript
{
  id: 1773170846580,
  numero_servicio: "SRV-2026-001",
  estado: "Pendiente", // Cambiar de "Pendiente de evaluación" / "Diagnosticado"
  fecha_creacion: "2026-03-10 14:27",
  fecha_inicio_diagnostico: null,
  fecha_inicio_reparacion: null,
  fecha_completado: null,
  fecha_entrega: null,
  tecnico_diagnostico: null,
  tecnico_reparacion: null,
  entregado_por: null,
  // ... otros campos
}
```

---

## 🖥️ Cambios en la UI

### En la Tabla de Servicios
- Badges de estado con colores según estado actual
- Botón de "Cambiar Estado" que muestra opciones permitidas
- Desactivar botones según transiciones válidas

### En Modal de Detalles
- Mostrar toda la historia de estados (timeline)
- Fechas y técnicos responsables de cada cambio
- Botón para avanzar al siguiente estado

### Nuevo Modal: Cambiar Estado
- Selector de nuevo estado (solo opciones válidas)
- Campo de observaciones/notas
- Confirmar cambio

---

## 📝 Ejemplo de Implementación

### 1. Actualizar tabla en data.json
```json
{
  "servicios": [
    {
      "id": 1773170846580,
      "numero_servicio": "SRV-2026-001",
      "estado": "Pendiente",
      "fecha_creacion": "2026-03-10 14:27",
      "fecha_inicio_diagnostico": null,
      "tecnico_diagnostico": null,
      ...
    }
  ]
}
```

### 2. Actualizar server.js (sin cambios, acepta cualquier campo)

### 3. Agregar funciones en app.js
- `cambiarEstadoServicio(servicioId, nuevoEstado)`
- `validarTransicion(estadoActual, estadoNuevo)`
- `obtenerEstadosPermitidos(estadoActual)`
- `renderizarTimeline(servicio)`

### 4. Actualizar UI
- Modal para cambiar estado
- Colores dinámicos por estado
- Timeline de cambios

---

## ✅ Beneficios

✔️ Rastreo completo del servicio  
✔️ Historial de cambios  
✔️ Mejor gestión de reparaciones  
✔️ Reportes por estado  
✔️ Alertas de servicios atrasados  

---

## 🎯 Flujo Completo de Diagnóstico

### Fase 1: Diagnóstico en Progreso
```
1. Usuario hace click en "Diagnosticar" (estado: Pendiente)
   ↓
2. Abre modal diagnóstico
   ↓
3. Estado AUTOMÁTICO cambia a "En diagnóstico"
   ↓
4. Técnico agrega problemas y costos
   ↓
5. Elige una opción:
   
   ✓ Guardar Progreso (botón azul)
     - Guarda lo que ha hecho
     - Sigue en "En diagnóstico"
     - Puede cerrar y volver después
     - NO envía WhatsApp
      
   ✓ Finalizar Diagnóstico (botón verde)
     - Guarda y valida todos los datos
     - Cambia a "En reparación"
     - Genera mensaje WhatsApp
     - No puede volver a diagnosticar
```

### Fase 2: En Reparación
```
1. Equipo en taller reparándose
2. Técnico hace click flecha naranja → "Completado"
3. Registro automático de fecha
```

### Fase 3: Entrega
```
1. Equipo listo → Flecha naranja → "Entregado"
2. Fin del servicio
```

---

## ✨ Cambios Implementados

✅ **Dos botones en modal diagnóstico:**
- "Guardar Progreso" (azul) → Mantiene "En diagnóstico"
- "Finalizar Diagnóstico" (verde) → Cambia a "En reparación"

✅ **Cambio automático de estado:**
- Al abrir modal diagnóstico → "En diagnóstico" (automático)

✅ **Timestamps por transición:**
- fecha_inicio_diagnostico (al abrir modal)
- fecha_inicio_reparacion (al finalizar diagnóstico)
- fecha_completado (cambiar a completado)
- fecha_entrega (cambiar a entregado)

✅ **Validaciones:**
- No puedes avanzar sin requisitos
- Transiciones validadas según estado actual
- Confirmaciones antes de cambios críticos
