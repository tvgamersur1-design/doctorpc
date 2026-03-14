# Flujo de Reparación - Doctor PC

## Resumen de Estados y Datos Capturados

### 1. **Estado: En Reparación** 🔧
Cuando pasas un servicio de "Diagnosticado" a "En reparación", se abre un modal donde debes completar:

**Campos Obligatorios:**
- 👤 **Técnico Asignado**: Nombre del técnico que realizará la reparación
- ⏱️ **Tiempo Estimado**: Cuánto tiempo tomará (ej: 2 horas, 1 día)

**Campos Opcionales:**
- 📝 **Observaciones Iniciales**: Notas sobre el estado del equipo o reparación

**Datos Guardados:** 
- `datos_inicio_reparacion` (JSON con: tecnicoReparacion, tiempoEstimado, observacionesInicio)

**Visibilidad:** Los datos se muestran en el modal de detalles en la sección "Datos de Reparación"

---

### 2. **Estado: Completado** ✅
Cuando terminas la reparación y cambias a "Completado", aparece un modal donde debes:

**Campos Opcionales:**
- 💬 **Comentario**: Tu opinión/notas sobre la reparación realizada

**Datos Guardados:**
- `datos_reparacion_completa` (JSON con: comentariosReparacion, estadoFinal, fechaCompletado)

**Visibilidad:** Se muestra en la sección "Reparación Completada" del modal de detalles

---

### 3. **Estado: Entregado** 📦
Cuando entregas el equipo, se abre un modal con:

**Campos Obligatorios:**
- 📅 **Fecha Entrega**: Cuándo se entregó
- ⏰ **Hora Entrega**: A qué hora
- 👤 **Encargado de Entrega**: Quién entregó
- ✓ **Estado del Equipo**: Si funciona correctamente o tiene observaciones

**Campos Opcionales:**
- 📝 **Observaciones de Entrega**: Detalles de la entrega
- 💵 **Monto Cobrado Hoy**: Dinero recibido en la entrega
- 💳 **Método de Pago**: Efectivo, Transferencia, Tarjeta, etc.
- 📄 **Comprobante**: Número o referencia del comprobante
- 🛡️ **Garantía Hasta**: Fecha de vencimiento de la garantía
- 💡 **Recomendaciones**: Cuidados o mantenimiento sugerido

**Datos Guardados:**
- `datos_entrega` (JSON con todos los campos anteriores)

**Visibilidad:** Se muestra en la sección "Datos de Entrega" del modal de detalles

---

## Estructura de Datos en la Base de Datos

```json
{
  "id": 1773258204769,
  "numero_servicio": "SRV-2026-001",
  "estado": "Entregado",
  
  "datos_inicio_reparacion": "{\"tecnicoReparacion\":\"juan\",\"tiempoEstimado\":\"2 horas\",\"observacionesInicio\":\"equipo con polvo\"}",
  
  "datos_reparacion_completa": "{\"comentariosReparacion\":\"se cambió ventilador\",\"estadoFinal\":\"Completado\",\"fechaCompletado\":\"11/3/2026, 2:48 p. m.\"}",
  
  "datos_entrega": "{\"fechaEntrega\":\"2026-03-11\",\"horaEntrega\":\"14:48\",\"encargadoEntrega\":\"jesuus\",\"estadoEquipo\":\"Funcionando correctamente\",\"montoCobraHoy\":30,\"metodoPago\":\"Efectivo\"}"
}
```

---

## Visualización en Modal de Detalles

Cuando abres un servicio, verás las secciones en este orden:

1. ✅ **Orden de Servicio** - Número, fecha, estado
2. 👤 **Información del Cliente** - Datos del cliente
3. 💻 **Equipo Ingresado** - Tipo, marca, modelo, serie
4. ⚠️ **Problemas Reportados** - Qué se reportó
5. 💰 **Resumen Financiero** - Adelanto, total, saldo
6. 📝 **Observaciones Adicionales** (si existen)
7. 🔧 **Datos de Reparación** (si estado >= En reparación)
   - Técnico asignado
   - Tiempo estimado
   - Observaciones iniciales
8. ✅ **Reparación Completada** (si estado >= Completado)
   - Estado
   - Fecha de completación
   - Comentarios
9. 🩺 **Diagnóstico Realizado** - Problemas y soluciones
10. 📦 **Datos de Entrega** (si estado = Entregado)
    - Fecha y hora
    - Encargado
    - Estado del equipo
    - Observaciones
    - Monto cobrado
    - Método de pago
    - Comprobante
    - Garantía
    - Recomendaciones

---

## Flujo Completo de un Servicio

```
Pendiente → En diagnóstico → Diagnosticado → En reparación 
   └─ Sin datos         └─ Sin datos    └─ Con diagnóstico
                                                    ↓
                                            Agregar:
                                            • Técnico
                                            • Tiempo est.
                                            • Observaciones
                                                    ↓
                                              Completado
                                            └─ Con reparación
                                                    ↓
                                            Agregar:
                                            • Comentarios
                                                    ↓
                                              Entregado
                                            └─ Con entrega
                                                    ↓
                                            Agregar:
                                            • Fecha/Hora
                                            • Encargado
                                            • Estado equipo
                                            • Monto cobrado
                                            • etc.
```

---

## Notas Importantes

- ✅ Todos los datos se guardan automáticamente en formato JSON
- ✅ Los datos son visibles en el modal de detalles
- ✅ Se puede editar un servicio después de cambiar estado
- ✅ Los timestamps se registran automáticamente
- ⚠️ Los campos obligatorios previenen que continúes sin completarlos

