# 📊 Diagramas del Sistema de Historial de Pagos

Esta carpeta contiene los diagramas técnicos en formato SVG para el informe de implementación del Sistema de Historial de Pagos.

## 📁 Archivos Incluidos

### 1. antes_despues_sistema.svg
**Tipo:** Diagrama comparativo  
**Propósito:** Mostrar la evolución del sistema, comparando las limitaciones del sistema anterior con las mejoras implementadas.

**Contenido:**
- ❌ ANTES: Problemas identificados (sin trazabilidad, falta de información, imposibilidad de reportes)
- ✅ DESPUÉS: Soluciones implementadas (trazabilidad total, información completa, reportes y análisis)

**Uso en informe:** Sección "Tarea más significativa"

---

### 2. arquitectura_historial_pagos.svg
**Tipo:** Diagrama de arquitectura de software  
**Propósito:** Ilustrar las tres capas de la arquitectura del sistema y cómo se comunican.

**Contenido:**
- **Capa Frontend:** servicios.js, pagos.js, dashboard.html
- **Capa Backend:** Netlify Functions (historial-pagos.js) con endpoints POST y GET
- **Capa Database:** MongoDB con colección historial_pagos

**Uso en informe:** Sección "Diagramas del Sistema"

---

### 3. esquema_base_datos_historial.svg
**Tipo:** Diagrama de base de datos (ERD)  
**Propósito:** Mostrar la estructura de las colecciones MongoDB, relaciones y campos.

**Contenido:**
- Colección `clientes` con campos principales
- Colección `servicios` con campos financieros
- Colección `historial_pagos` (NUEVA) con todos los campos de trazabilidad
- Relaciones 1:N entre colecciones
- Índices optimizados para consultas rápidas
- Ejemplo de datos reales

**Uso en informe:** Sección "Diagramas del Sistema"

---

### 4. flujo_registro_pago.svg
**Tipo:** Diagrama de secuencia  
**Propósito:** Mostrar el flujo completo de datos desde la acción del usuario hasta el registro en base de datos.

**Contenido:**
- 15 pasos detallados del proceso
- Interacción entre Usuario, Frontend, Backend y Database
- Validaciones en cada capa
- Respuestas y notificaciones
- Leyenda con tipos de operaciones

**Uso en informe:** Sección "Diagramas del Sistema"

---

### 5. momentos_captura_pagos.svg
**Tipo:** Diagrama de proceso  
**Propósito:** Ilustrar los dos momentos críticos donde se capturan y registran pagos.

**Contenido:**
- **Momento 1:** Al crear el servicio (adelanto inicial)
  - Ubicación: servicios.js → guardarServicioReal()
  - Proceso de registro en ambas colecciones
- **Momento 2:** Durante gestión de pagos (pagos posteriores)
  - Ubicación: pagos.js → guardarPago()
  - Actualización de saldo y registro en historial

**Uso en informe:** Sección "Diagramas del Sistema"

---

## 🎨 Características de los Diagramas

- **Formato:** SVG (Scalable Vector Graphics)
- **Ventajas:** 
  - Escalables sin pérdida de calidad
  - Tamaño de archivo pequeño
  - Visualización perfecta en cualquier resolución
  - Compatibles con navegadores web y documentos PDF
  - Editables con herramientas de diseño vectorial

- **Paleta de colores:**
  - 🔵 Azul (#3498db): Frontend / Información
  - 🟢 Verde (#27ae60): Backend / Éxito
  - 🔴 Rojo (#e74c3c): Database / Problemas
  - 🟡 Amarillo (#f39c12): Advertencias / Claves primarias
  - 🟣 Morado (#9b59b6): Índices

---

## 📖 Cómo Usar los Diagramas

### En Markdown
```markdown
![Descripción](diagramas/nombre_diagrama.svg)
```

### En HTML
```html
<img src="diagramas/nombre_diagrama.svg" alt="Descripción" width="100%">
```

### En Presentaciones
- Arrastrar el archivo SVG directamente a PowerPoint, Google Slides o Keynote
- Se mantendrá la calidad vectorial

### Para Imprimir
- Los SVG se imprimen perfectamente en cualquier tamaño
- Recomendado: Imprimir en orientación horizontal (landscape) para mejor visualización

---

## 🔧 Edición de Diagramas

Los archivos SVG pueden editarse con:
- **Inkscape** (gratuito, open source)
- **Adobe Illustrator** (profesional)
- **Figma** (online, gratuito)
- **Editor de texto** (para cambios menores en código SVG)

---

## 📝 Notas Técnicas

- Todos los diagramas usan fuentes estándar (sans-serif, monospace) para compatibilidad
- Los colores siguen la paleta corporativa del proyecto
- Las dimensiones están optimizadas para visualización en pantalla y impresión A4
- Los textos son legibles incluso en tamaños reducidos

---

**Creado para:** Sistema de Administración Doctor PC  
**Fecha:** Abril 2026  
**Versión:** 1.0
