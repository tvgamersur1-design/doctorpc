# 📄 PROPUESTA: PDF EMPRESARIAL MEJORADO - DOCTOR PC

## 🎯 Objetivo
Rediseñar el PDF de reporte de servicio con formato empresarial profesional, incluyendo datos faltantes y evidencia fotográfica.

> **📐 Mockup visual**: Ver `PROPUESTA_PDF_EMPRESARIAL.svg` en la raíz del proyecto.

---

## 📊 DATOS NUEVOS A AGREGAR (que actualmente NO están en el PDF)

### ✅ Página 1 — Reporte Principal

| # | Dato Nuevo | ¿De dónde viene? | Justificación |
|---|-----------|-------------------|---------------|
| 1 | **RUC de la empresa** | Constante hardcoded | Obligatorio para documentos empresariales en Perú |
| 2 | **Dirección de la empresa** | Constante hardcoded | Profesionalismo y ubicación del taller |
| 3 | **Barra de estado visual** | `servicio.estado + prioridad + local` | El cliente ve de un vistazo el estado |
| 4 | **Observaciones del cliente** | `servicio.observaciones` | Contexto importante (ej: "se cayó") |
| 5 | **Color del equipo** | `equipo.color` | Ya existe en BD, falta en PDF |
| 6 | **Accesorios recibidos** | `equipo.accesorios` | Protección legal - qué se recibió |
| 7 | **Estado por ítem diagnóstico** | Nuevo campo: `diagnostico[].estado` | Muestra qué se hizo y qué no |
| 8 | **Sección "Trabajo Realizado"** | `servicio.trabajo_realizado / solucion_aplicada` | Actualmente mezclado, merece sección propia |
| 9 | **Detalle de pagos** | `servicio.adelanto, saldo_pendiente, metodo_pago` | El cliente necesita ver qué pagó y cómo |
| 10 | **Método de pago** | `entrega.metodo_pago` | Transparencia financiera |
| 11 | **N° de comprobante** | `entrega.comprobante` | Referencia fiscal |
| 12 | **Línea de tiempo visual** | Calculada de fechas de cada etapa | Muestra profesionalismo y trazabilidad |
| 13 | **Datos de entrega estructurados** | `entrega.*` (recibido_por, fecha, estado_equipo) | Actualmente solo en el modal, NO en PDF |
| 14 | **Garantía y fecha límite** | `entrega.garantia_hasta` | El cliente sabe hasta cuándo tiene cobertura |
| 15 | **Recomendaciones al cliente** | `entrega.recomendaciones` | Valor agregado y prevención |
| 16 | **Calificación del servicio** | `servicio.calificacion` | Feedback visible, genera confianza |
| 17 | **Código QR de verificación** | Generado con URL del servicio | Verificación de autenticidad del documento |

### ✅ Página 2 — Anexo Fotográfico (NUEVA)

| # | Dato Nuevo | Justificación |
|---|-----------|---------------|
| 1 | **Fotos de ingreso** con descripción | Evidencia del estado original del equipo |
| 2 | **Fotos de entrega** con verificación | Prueba de que se entregó en buen estado |
| 3 | **Comparativa antes/después** | Impacto visual del trabajo realizado |
| 4 | **Anotaciones en cada foto** | Contexto de qué muestra cada imagen |

---

## 🖼️ ¿INCLUIR FOTOS DE INGRESO Y ENTREGA? — **SÍ, RECOMENDADO**

### Argumentos a favor:
1. **Protección legal**: Evidencia de cómo se recibió y entregó el equipo
2. **Transparencia**: El cliente ve exactamente qué se hizo
3. **Profesionalismo**: Diferencia a Doctor PC de la competencia
4. **Resolución de conflictos**: Si el cliente reclama daños, hay prueba
5. **Marketing**: Muestra la calidad del trabajo (antes/después)

### Cómo implementarlo:
- **Página 2 separada** (no mezclar con datos en página 1)
- **Máximo 3 fotos por sección** (ingreso y entrega)
- **Con descripciones** bajo cada foto
- **Opcional**: Solo incluir página 2 si hay fotos disponibles

---

## 📐 ESTRUCTURA DEL NUEVO PDF

### PÁGINA 1 (A4 - Datos del servicio)

```
┌─────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Franja decorativa
│                                                     │
│  [LOGO]  DOCTOR PC                    ┌───────────┐ │
│          Soluciones Informáticas      │ ORDEN N°   │ │
│          Tel | Email | Web            │ ORD-0157   │ │
│          Dirección | RUC              └───────────┘ │
│                                                     │
│  ┌─ ESTADO: ✅ COMPLETADO | Alta | Sede Central ─┐  │ ← NUEVO
│                                                     │
│  ┌── DATOS CLIENTE ──┐  ┌── EQUIPO RECIBIDO ────┐  │
│  │ Nombre, DNI       │  │ Tipo, Marca, Modelo   │  │
│  │ Tel, Email, Dir   │  │ Serie, Color, Acces.  │  │ ← Color y accesorios NUEVO
│  └───────────────────┘  └───────────────────────┘  │
│                                                     │
│  ┌── PROBLEMA REPORTADO + OBS. CLIENTE ──────────┐  │ ← Obs. NUEVO
│  │ Descripción del problema                       │  │
│  │ ⚠ Observación del cliente                     │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌── DIAGNÓSTICO TÉCNICO ────────────────────────┐  │
│  │ N° │ Problema │ Solución │ Costo │ Estado     │  │ ← Estado NUEVO
│  │  1 │ HDD fail │ SSD 480  │ S/120 │ ✅ HECHO  │  │
│  │  2 │ Pasta    │ Limpieza │ S/ 35 │ ✅ HECHO  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌── TRABAJO REALIZADO ──────────────────────────┐  │ ← Sección NUEVA
│  │ ✅ Detalle de cada trabajo completado          │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌── RESUMEN FINANCIERO ─┐  ┌── DETALLE PAGOS ──┐  │ ← Pagos NUEVO
│  │ Mano obra    S/ 50    │  │ Adelanto  S/ 100   │  │
│  │ Repuestos    S/ 205   │  │ Saldo     S/ 190   │  │
│  │ Adicional    S/ 35    │  │ Método: Yape       │  │
│  │ ───────────────────── │  │ Comprobante: B001  │  │
│  │ Subtotal     S/ 245   │  │                    │  │
│  │ IGV (18%)    S/ 44    │  │ ✅ PAGADO COMPLETO │  │
│  │ TOTAL        S/ 290   │  └────────────────────┘  │
│  └───────────────────────┘                          │
│                                                     │
│  ┌── LÍNEA DE TIEMPO ────────────────────────────┐  │ ← NUEVO
│  │ ●─────●─────●─────●─────●                     │  │
│  │ Ingr  Diag  Aprob Repar Entreg                │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌── DATOS DE ENTREGA ───┐  ┌── GARANTÍA ────────┐  │ ← NUEVO
│  │ Recibido por: ...     │  │ Hasta: 25/05/2026  │  │
│  │ Fecha: 25/04 16:45    │  │ Recomendaciones:   │  │
│  │ Encargado: ...        │  │ • No bloquear vent │  │
│  │ Estado: OPERATIVO     │  │ • Limpieza c/6m    │  │
│  └───────────────────────┘  └────────────────────┘  │
│                                                     │
│  ⭐⭐⭐⭐⭐ Calificación: 5/5 Excelente              │ ← NUEVO
│                                                     │
│  _______________  [QR]  _______________             │
│  Firma Técnico          Firma Cliente               │ ← QR NUEVO
│                                                     │
│  ── TÉRMINOS Y CONDICIONES ──────────────────────── │
│  1. Garantía 30 días mano de obra...                │
│  2. Equipos no recogidos en 30 días...              │
│  3. Repuestos originales quedan en Doctor PC...     │ ← Más términos
│  4. El cliente acepta condiciones al firmar...      │
│                                                     │
│  DOCTOR PC © 2026 | ORD-0157 | Pág 1/2             │
└─────────────────────────────────────────────────────┘
```

### PÁGINA 2 (A4 - Anexo Fotográfico) — NUEVA

```
┌─────────────────────────────────────────────────────┐
│  DOCTOR PC | Anexo Fotográfico        ORD-0157      │
│                                                     │
│  ┌── 📸 FOTOS DE INGRESO (15/04/2026) ──────────┐  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                │  │
│  │  │ FOTO │  │ FOTO │  │ FOTO │                │  │
│  │  │  1   │  │  2   │  │  3   │                │  │
│  │  └──────┘  └──────┘  └──────┘                │  │
│  │  Vista     Pantalla   Base del                │  │
│  │  frontal   con error  equipo                  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌── 📸 FOTOS DE ENTREGA (25/04/2026) ──────────┐  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                │  │
│  │  │ FOTO │  │ FOTO │  │ FOTO │                │  │
│  │  │  4   │  │  5   │  │  6   │                │  │
│  │  └──────┘  └──────┘  └──────┘                │  │
│  │  Equipo    SSD nuevo  Limpieza                │  │
│  │  encendido instalado  completa                │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌── 🔄 COMPARATIVA ANTES / DESPUÉS ────────────┐  │
│  │  ❌ ANTES          →          ✅ DESPUÉS      │  │
│  │  ┌──────┐                    ┌──────┐         │  │
│  │  │ FOTO │        →           │ FOTO │         │  │
│  │  └──────┘                    └──────┘         │  │
│  │  HDD errores                 SSD nuevo        │  │
│  │  CPU 95°C                    CPU 42°C         │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  DOCTOR PC © 2026 | ORD-0157 | Pág 2/2             │
└─────────────────────────────────────────────────────┘
```

---

## 🆚 COMPARACIÓN: PDF ACTUAL vs PDF PROPUESTO

| Característica | PDF Actual | PDF Propuesto |
|---|:---:|:---:|
| Páginas | 1 | 1-2 (pág 2 opcional) |
| Datos empresa (RUC, dirección) | ❌ | ✅ |
| Barra de estado visual | ❌ | ✅ |
| Observaciones del cliente | ❌ | ✅ |
| Color/Accesorios equipo | ❌ | ✅ |
| Estado por ítem diagnóstico | ❌ | ✅ |
| Trabajo realizado (sección) | ❌ | ✅ |
| Detalle de pagos | ❌ | ✅ |
| Método de pago / Comprobante | ❌ | ✅ |
| Línea de tiempo | ❌ | ✅ |
| Datos de entrega | ⚠️ Parcial | ✅ Completo |
| Garantía y recomendaciones | ❌ | ✅ |
| Calificación del servicio | ❌ | ✅ |
| Código QR verificación | ❌ | ✅ |
| Fotos de ingreso | ❌ | ✅ (Pág 2) |
| Fotos de entrega | ❌ | ✅ (Pág 2) |
| Comparativa antes/después | ❌ | ✅ (Pág 2) |
| Términos y condiciones | ✅ (2 puntos) | ✅ (4 puntos) |

---

## 🛠️ IMPACTO TÉCNICO

### Archivos a modificar:
1. **`public/reporte.js`** — Función `descargarPDFLocal()` (generador jsPDF)
2. **`functions/generar-pdf.js`** — Agregar datos de entrega al response
3. **`functions/enviar-whatsapp-pdf.js`** — Actualizar generador server-side

### Librerías necesarias:
- **jsPDF** (ya existe) — Para generar el PDF
- **QRCode.js** (nueva, opcional) — Para generar código QR

### Consideraciones:
- La página 2 solo se genera si existen fotos
- Las fotos se convierten a base64 desde las URLs de Cloudinary/Firebase
- El QR puede codificar una URL de verificación del servicio
