# 🔍 Propuesta de Filtros para Gestión de Servicios

## 📋 Resumen Ejecutivo

Esta propuesta agrega un sistema de filtros avanzados a la sección de Gestión de Servicios, permitiendo búsquedas más precisas y análisis detallados de los servicios registrados.

---

## 🎯 Opciones de Filtros Propuestas

### 1. **Estado del Servicio** 🔄
**Tipo:** Select dropdown (múltiple selección)

**Opciones:**
- Todos (por defecto)
- Pendiente de evaluación
- En diagnóstico
- Diagnosticado
- En reparación
- Completado
- Entregado
- Cancelado

**Uso:** Filtrar servicios por su estado actual en el flujo de trabajo.

**Ejemplo:** Ver solo servicios "En reparación" para priorizar trabajo pendiente.

---

### 2. **Local** 🏢
**Tipo:** Select dropdown

**Opciones:**
- Todos (por defecto)
- Ferreñafe
- Chiclayo

**Uso:** Filtrar servicios por ubicación del local.

**Ejemplo:** Analizar rendimiento del local de Ferreñafe vs Chiclayo.

---

### 3. **Rango de Fechas** 📅
**Tipo:** Date pickers (desde/hasta)

**Campos:**
- Fecha Desde: `<input type="date">`
- Fecha Hasta: `<input type="date">`

**Uso:** Filtrar servicios registrados en un período específico.

**Ejemplos:**
- Servicios del mes pasado
- Servicios del primer trimestre
- Servicios de la última semana

---

### 4. **Tipo de Equipo** 💻
**Tipo:** Select dropdown

**Opciones:**
- Todos (por defecto)
- Laptop
- Desktop
- Monitor
- Impresora
- Otro

**Uso:** Filtrar por tipo de equipo en servicio.

**Ejemplo:** Ver solo servicios de laptops para análisis de demanda.

---

### 5. **Rango de Costo Total** 💰
**Tipo:** Number inputs (min/max)

**Campos:**
- Costo Mínimo: `<input type="number" min="0" step="0.01">`
- Costo Máximo: `<input type="number" min="0" step="0.01">`

**Uso:** Filtrar servicios por rango de costo del diagnóstico.

**Ejemplos:**
- Servicios económicos (< $50)
- Servicios de alto valor (> $200)
- Rango específico ($100 - $300)

---

### 6. **Incluir Cancelados** ❌
**Tipo:** Checkbox

**Opciones:**
- ☐ No mostrar cancelados (por defecto)
- ☑ Incluir servicios cancelados

**Uso:** Mantiene la funcionalidad actual del checkbox existente.

---

## 🎨 Diseño e Integración

### Ubicación en la Interfaz

```
┌─────────────────────────────────────────────────────────┐
│  Gestión de Servicios              [+ Nuevo Servicio]   │
├─────────────────────────────────────────────────────────┤
│  [🔍 Buscar...]                    [🔽 Filtros] [Limpiar]│
├─────────────────────────────────────────────────────────┤
│  ┌─ Panel de Filtros (Colapsable) ─────────────────┐   │
│  │ Estado: [Dropdown▼]  Local: [Dropdown▼]         │   │
│  │ Desde: [📅]  Hasta: [📅]                         │   │
│  │ Tipo Equipo: [Dropdown▼]  Costo: [$] - [$]      │   │
│  │ ☐ Incluir cancelados      [✓ Aplicar Filtros]   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [Tabla de Servicios...]                                │
└─────────────────────────────────────────────────────────┘
```

### Adaptación al Diseño Actual

**Mantiene:**
- ✅ Barra de búsqueda existente (búsqueda por texto libre)
- ✅ Checkbox "Mostrar cancelados" (integrado en filtros)
- ✅ Botón "Agregar Nuevo Servicio"
- ✅ Paginación existente
- ✅ Tabla responsive actual

**Agrega:**
- 🆕 Botón "Filtros" para expandir/colapsar panel
- 🆕 Panel de filtros colapsable
- 🆕 Botón "Limpiar" para resetear filtros
- 🆕 Botón "Aplicar Filtros" para ejecutar búsqueda
- 🆕 Indicador visual de filtros activos

---

## 💻 Especificaciones Técnicas

### HTML Structure

```html
<!-- Barra de controles -->
<div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
    <!-- Búsqueda existente -->
    <div style="flex: 1; min-width: 300px; position: relative;">
        <i class="fas fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #2192B8;"></i>
        <input type="text" id="busquedaServicios" placeholder="Buscar por número, cliente, descripción..." 
               style="width: 100%; padding: 12px 15px 12px 40px; border: 2px solid #e0e0e0; border-radius: 8px;">
    </div>
    
    <!-- Botón Filtros -->
    <button id="btnToggleFiltros" onclick="toggleFiltrosServicios()" 
            style="padding: 12px 24px; background: #2192B8; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
        <i class="fas fa-filter"></i> Filtros <span id="badgeFiltrosActivos" style="display: none; background: #FF5722; padding: 2px 6px; border-radius: 10px; font-size: 11px; margin-left: 5px;">0</span>
    </button>
    
    <!-- Botón Limpiar -->
    <button onclick="limpiarFiltrosServicios()" 
            style="padding: 12px 20px; background: #f5f5f5; color: #666; border: 1px solid #ddd; border-radius: 8px; cursor: pointer;">
        <i class="fas fa-times"></i> Limpiar
    </button>
</div>

<!-- Panel de Filtros (Colapsable) -->
<div id="panelFiltrosServicios" style="display: none; background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px dashed #ddd;">
    <h4 style="margin: 0 0 15px 0; color: #2192B8;">
        <i class="fas fa-sliders-h"></i> Filtros Avanzados
    </h4>
    
    <!-- Fila 1: Estado, Local, Fechas -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
        <div>
            <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: bold;">Estado:</label>
            <select id="filtroEstado" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                <option value="">Todos los estados</option>
                <option value="Pendiente de evaluación">Pendiente de evaluación</option>
                <option value="En diagnóstico">En diagnóstico</option>
                <option value="Diagnosticado">Diagnosticado</option>
                <option value="En reparación">En reparación</option>
                <option value="Completado">Completado</option>
                <option value="Entregado">Entregado</option>
                <option value="Cancelado">Cancelado</option>
            </select>
        </div>
        
        <div>
            <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: bold;">Local:</label>
            <select id="filtroLocal" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                <option value="">Todos</option>
                <option value="Ferreñafe">Ferreñafe</option>
                <option value="Chiclayo">Chiclayo</option>
            </select>
        </div>
        
        <div>
            <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: bold;">Fecha Desde:</label>
            <input type="date" id="filtroFechaDesde" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        
        <div>
            <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: bold;">Fecha Hasta:</label>
            <input type="date" id="filtroFechaHasta" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
    </div>
    
    <!-- Fila 2: Tipo Equipo, Costos, Checkbox -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
        <div>
            <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: bold;">Tipo de Equipo:</label>
            <select id="filtroTipoEquipo" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                <option value="">Todos los tipos</option>
                <option value="Laptop">Laptop</option>
                <option value="Desktop">Desktop</option>
                <option value="Monitor">Monitor</option>
                <option value="Impresora">Impresora</option>
                <option value="Otro">Otro</option>
            </select>
        </div>
        
        <div>
            <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: bold;">Costo Mínimo:</label>
            <input type="number" id="filtroCostoMin" min="0" step="0.01" placeholder="0.00" 
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        
        <div>
            <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: bold;">Costo Máximo:</label>
            <input type="number" id="filtroCostoMax" min="0" step="0.01" placeholder="9999.00" 
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        
        <div style="display: flex; align-items: flex-end;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px;">
                <input type="checkbox" id="filtroIncluirCancelados" style="width: 18px; height: 18px; cursor: pointer;">
                <span style="font-size: 13px;">Incluir cancelados</span>
            </label>
        </div>
    </div>
    
    <!-- Botón Aplicar -->
    <div style="text-align: right;">
        <button onclick="aplicarFiltrosServicios()" 
                style="padding: 12px 30px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">
            <i class="fas fa-check"></i> Aplicar Filtros
        </button>
    </div>
</div>
```

### JavaScript Functions

```javascript
// Estado global de filtros
let filtrosServiciosActivos = {
    estado: '',
    local: '',
    fechaDesde: '',
    fechaHasta: '',
    tipoEquipo: '',
    costoMin: null,
    costoMax: null,
    incluirCancelados: false
};

// Toggle panel de filtros
function toggleFiltrosServicios() {
    const panel = document.getElementById('panelFiltrosServicios');
    const btn = document.getElementById('btnToggleFiltros');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-filter"></i> Ocultar Filtros';
    } else {
        panel.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-filter"></i> Filtros';
    }
}

// Aplicar filtros
function aplicarFiltrosServicios() {
    // Recopilar valores de filtros
    filtrosServiciosActivos = {
        estado: document.getElementById('filtroEstado').value,
        local: document.getElementById('filtroLocal').value,
        fechaDesde: document.getElementById('filtroFechaDesde').value,
        fechaHasta: document.getElementById('filtroFechaHasta').value,
        tipoEquipo: document.getElementById('filtroTipoEquipo').value,
        costoMin: parseFloat(document.getElementById('filtroCostoMin').value) || null,
        costoMax: parseFloat(document.getElementById('filtroCostoMax').value) || null,
        incluirCancelados: document.getElementById('filtroIncluirCancelados').checked
    };
    
    // Actualizar badge de filtros activos
    actualizarBadgeFiltros();
    
    // Recargar servicios con filtros
    cargarServiciosConFiltros(1);
}

// Limpiar filtros
function limpiarFiltrosServicios() {
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroLocal').value = '';
    document.getElementById('filtroFechaDesde').value = '';
    document.getElementById('filtroFechaHasta').value = '';
    document.getElementById('filtroTipoEquipo').value = '';
    document.getElementById('filtroCostoMin').value = '';
    document.getElementById('filtroCostoMax').value = '';
    document.getElementById('filtroIncluirCancelados').checked = false;
    
    filtrosServiciosActivos = {
        estado: '',
        local: '',
        fechaDesde: '',
        fechaHasta: '',
        tipoEquipo: '',
        costoMin: null,
        costoMax: null,
        incluirCancelados: false
    };
    
    actualizarBadgeFiltros();
    cargarServiciosConFiltros(1);
}

// Actualizar badge de filtros activos
function actualizarBadgeFiltros() {
    const badge = document.getElementById('badgeFiltrosActivos');
    let count = 0;
    
    if (filtrosServiciosActivos.estado) count++;
    if (filtrosServiciosActivos.local) count++;
    if (filtrosServiciosActivos.fechaDesde) count++;
    if (filtrosServiciosActivos.fechaHasta) count++;
    if (filtrosServiciosActivos.tipoEquipo) count++;
    if (filtrosServiciosActivos.costoMin !== null) count++;
    if (filtrosServiciosActivos.costoMax !== null) count++;
    if (filtrosServiciosActivos.incluirCancelados) count++;
    
    if (count > 0) {
        badge.style.display = 'inline';
        badge.textContent = count;
    } else {
        badge.style.display = 'none';
    }
}

// Cargar servicios con filtros aplicados
async function cargarServiciosConFiltros(page = 1) {
    const container = document.getElementById('serviciosContainer');
    container.innerHTML = `
        <div class="loading-spinner-inline">
            <div class="loading-spinner-circle"></div>
            <p class="loading-spinner-text">Aplicando filtros...</p>
        </div>`;
    
    try {
        // Construir query params
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', serviciosLimitePorPagina);
        
        // Agregar búsqueda de texto
        const busqueda = document.getElementById('busquedaServicios').value.trim();
        if (busqueda) params.set('q', busqueda);
        
        // Agregar filtros activos
        if (filtrosServiciosActivos.estado) {
            params.set('estado', filtrosServiciosActivos.estado);
        }
        if (filtrosServiciosActivos.local) {
            params.set('local', filtrosServiciosActivos.local);
        }
        if (filtrosServiciosActivos.fechaDesde) {
            params.set('fecha_desde', filtrosServiciosActivos.fechaDesde);
        }
        if (filtrosServiciosActivos.fechaHasta) {
            params.set('fecha_hasta', filtrosServiciosActivos.fechaHasta);
        }
        if (filtrosServiciosActivos.tipoEquipo) {
            params.set('tipo_equipo', filtrosServiciosActivos.tipoEquipo);
        }
        if (filtrosServiciosActivos.costoMin !== null) {
            params.set('costo_min', filtrosServiciosActivos.costoMin);
        }
        if (filtrosServiciosActivos.costoMax !== null) {
            params.set('costo_max', filtrosServiciosActivos.costoMax);
        }
        if (filtrosServiciosActivos.incluirCancelados) {
            params.set('incluir_cancelados', 'true');
        }
        
        // Hacer request al backend
        const response = await fetch(`${API_SERVICIOS}?${params.toString()}`);
        const data = await response.json();
        
        // Renderizar resultados (usar función existente)
        renderServiciosTabla(data);
        
    } catch (error) {
        console.error('Error al aplicar filtros:', error);
        container.innerHTML = '<div class="error-message">Error al aplicar filtros</div>';
    }
}
```

---

## 🔧 Modificaciones en el Backend

### Endpoint: `GET /api/servicios`

**Query Parameters Adicionales:**

```javascript
// functions/servicios.js

router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            q = '',              // Búsqueda de texto (existente)
            estado,              // NUEVO: Filtro por estado
            local,               // NUEVO: Filtro por local
            fecha_desde,         // NUEVO: Fecha desde
            fecha_hasta,         // NUEVO: Fecha hasta
            tipo_equipo,         // NUEVO: Tipo de equipo
            costo_min,           // NUEVO: Costo mínimo
            costo_max,           // NUEVO: Costo máximo
            incluir_cancelados   // Existente
        } = req.query;
        
        // Construir filtro base
        let filtro = {};
        
        // Filtro de cancelados (existente)
        if (incluir_cancelados !== 'true') {
            filtro.estado = { $ne: 'Cancelado' };
        }
        
        // NUEVO: Filtro por estado específico
        if (estado) {
            filtro.estado = estado;
        }
        
        // NUEVO: Filtro por local
        if (local) {
            filtro.local = local;
        }
        
        // NUEVO: Filtro por rango de fechas
        if (fecha_desde || fecha_hasta) {
            filtro.fecha = {};
            if (fecha_desde) {
                filtro.fecha.$gte = new Date(fecha_desde);
            }
            if (fecha_hasta) {
                // Agregar 23:59:59 para incluir todo el día
                const fechaHastaFin = new Date(fecha_hasta);
                fechaHastaFin.setHours(23, 59, 59, 999);
                filtro.fecha.$lte = fechaHastaFin;
            }
        }
        
        // Búsqueda de texto (existente)
        if (q) {
            filtro.$or = [
                { numero_servicio: { $regex: q, $options: 'i' } },
                { problemas_reportados: { $regex: q, $options: 'i' } },
                { local: { $regex: q, $options: 'i' } }
            ];
        }
        
        // Ejecutar query
        const servicios = await Servicio.find(filtro)
            .sort({ fecha: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Servicio.countDocuments(filtro);
        
        // NUEVO: Filtros adicionales en memoria (tipo_equipo, costo)
        let serviciosFiltrados = servicios;
        
        if (tipo_equipo || costo_min || costo_max) {
            // Cargar equipos para filtrar por tipo
            const equipos = await Equipo.find();
            const equiposMap = {};
            equipos.forEach(e => equiposMap[e._id] = e);
            
            serviciosFiltrados = servicios.filter(srv => {
                // Filtro por tipo de equipo
                if (tipo_equipo) {
                    const equipo = equiposMap[srv.equipo_id];
                    if (!equipo || equipo.tipo_equipo !== tipo_equipo) {
                        return false;
                    }
                }
                
                // Filtro por rango de costo
                if (costo_min !== undefined || costo_max !== undefined) {
                    let costoTotal = 0;
                    if (srv.diagnostico) {
                        try {
                            const diagnostico = JSON.parse(srv.diagnostico);
                            costoTotal = diagnostico.reduce((sum, p) => sum + (p.costo || 0), 0);
                        } catch (e) {
                            costoTotal = 0;
                        }
                    }
                    
                    if (costo_min && costoTotal < parseFloat(costo_min)) {
                        return false;
                    }
                    if (costo_max && costoTotal > parseFloat(costo_max)) {
                        return false;
                    }
                }
                
                return true;
            });
        }
        
        res.json({
            data: serviciosFiltrados,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error al obtener servicios:', error);
        res.status(500).json({ error: 'Error al obtener servicios' });
    }
});
```

---

## 📱 Diseño Responsive

### Desktop (> 768px)
- Panel de filtros en 2 filas
- 4 columnas por fila
- Botones alineados horizontalmente

### Tablet (481px - 768px)
- Panel de filtros en 3 filas
- 2 columnas por fila
- Botones apilados

### Mobile (< 480px)
- Panel de filtros en columna única
- Cada filtro ocupa ancho completo
- Botones apilados verticalmente

```css
@media (max-width: 768px) {
    #panelFiltrosServicios > div {
        grid-template-columns: 1fr !important;
    }
    
    #btnToggleFiltros {
        width: 100%;
    }
}
```

---

## ✅ Checklist de Implementación

### Frontend
- [ ] Agregar HTML del panel de filtros
- [ ] Implementar función `toggleFiltrosServicios()`
- [ ] Implementar función `aplicarFiltrosServicios()`
- [ ] Implementar función `limpiarFiltrosServicios()`
- [ ] Implementar función `actualizarBadgeFiltros()`
- [ ] Modificar función `cargarServicios()` para soportar filtros
- [ ] Agregar estilos CSS responsive
- [ ] Agregar animaciones de transición

### Backend
- [ ] Modificar endpoint `GET /api/servicios`
- [ ] Agregar soporte para filtro por estado
- [ ] Agregar soporte para filtro por local
- [ ] Agregar soporte para rango de fechas
- [ ] Agregar soporte para tipo de equipo
- [ ] Agregar soporte para rango de costo
- [ ] Optimizar queries de base de datos
- [ ] Agregar índices en MongoDB si es necesario

### Testing
- [ ] Probar cada filtro individualmente
- [ ] Probar combinación de filtros
- [ ] Probar con datos vacíos
- [ ] Probar paginación con filtros
- [ ] Probar búsqueda de texto + filtros
- [ ] Probar en diferentes navegadores
- [ ] Probar responsive en móvil/tablet

---

## 🚀 Beneficios Esperados

### Para el Usuario
✅ Búsqueda 5x más rápida de servicios específicos  
✅ Análisis de servicios por período  
✅ Identificación rápida de servicios por costo  
✅ Comparación entre locales  
✅ Mejor seguimiento de estados  

### Para el Negocio
✅ Mejor control de inventario de servicios  
✅ Análisis de rentabilidad por tipo  
✅ Identificación de servicios más comunes  
✅ Optimización de tiempos de respuesta  
✅ Toma de decisiones basada en datos  

---

## 📊 Métricas de Éxito

- **Tiempo de búsqueda:** Reducción del 70% en tiempo para encontrar servicios específicos
- **Uso de filtros:** 60% de usuarios utilizan al menos un filtro por sesión
- **Satisfacción:** Aumento del 40% en satisfacción de usuario
- **Eficiencia:** 50% menos clics para encontrar información

---

## 🎯 Próximos Pasos

1. **Fase 1:** Implementar filtros básicos (Estado, Local, Fechas)
2. **Fase 2:** Agregar filtros avanzados (Tipo Equipo, Costo)
3. **Fase 3:** Optimizar rendimiento y UX
4. **Fase 4:** Agregar exportación de resultados filtrados (PDF/Excel)

---

**Fecha de Propuesta:** Abril 2026  
**Estado:** Pendiente de Aprobación  
**Prioridad:** Alta
