# Propuesta: Sincronización en Tiempo Real con Polling Inteligente

## Contexto

El sistema actualmente requiere recargar la página para ver cambios realizados por otros usuarios.
Esta propuesta implementa sincronización automática entre múltiples dispositivos/pestañas sin
necesidad de WebSockets ni servicios externos.

## Stack actual

- Frontend: HTML/JS vanilla desplegado en Netlify
- Backend: Netlify Functions (serverless)
- Base de datos: MongoDB

## Por qué no WebSockets

Netlify Functions son **serverless** — cada función vive solo durante el request y muere.
No pueden mantener conexiones persistentes, por lo tanto WebSockets no son viables sin
agregar un servidor dedicado externo.

---

## Solución: Polling Inteligente por Timestamp

En vez de recargar toda la tabla, cada cliente recuerda el momento de su última consulta
y solo pide registros **nuevos desde ese momento**.

### Flujo

```
Cliente abre la app
  → carga inicial normal (todos los registros)
  → guarda timestamp actual
  → cada 4 segundos pregunta: "¿hay registros después de [timestamp]?"
  → servidor consulta MongoDB con filtro de fecha
  → si hay nuevos → los inserta en la tabla sin recargar
  → si no hay nada → respuesta vacía, sin costo
  → actualiza timestamp
  → repite...
```

### Diagrama

```
[Cliente A]  ──crea servicio──▶  [MongoDB]
[Cliente B]  ──cada 4s pregunta──▶  [Netlify Function]  ──consulta──▶  [MongoDB]
                                                         ◀──nuevos registros──
             ◀──inserta filas en tabla──
```

---

## Implementación

### 1. Backend — Netlify Function (ejemplo: servicios)

Modificar la function existente para aceptar el parámetro `desde`:

```js
// functions/servicios.js
const { MongoClient } = require('mongodb');

exports.handler = async (event) => {
  const { desde } = event.queryStringParameters || {};

  const filtro = desde
    ? { createdAt: { $gt: new Date(Number(desde)) } }
    : {};

  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db();

  const registros = await db
    .collection('servicios')
    .find(filtro)
    .sort({ createdAt: -1 })
    .toArray();

  await client.close();

  return {
    statusCode: 200,
    body: JSON.stringify(registros),
  };
};
```

> Requisito: cada documento en MongoDB debe tener el campo `createdAt` con fecha de creación.
> Si no existe, se agrega al momento de insertar: `createdAt: new Date()`

---

### 2. Frontend — Módulo de polling

```js
// public/js/modules/sincronizacion.js

class PollingSync {
  constructor({ endpoint, intervalo = 4000, onNuevosRegistros }) {
    this.endpoint = endpoint;
    this.intervalo = intervalo;
    this.onNuevosRegistros = onNuevosRegistros;
    this.ultimaActualizacion = Date.now();
    this.timer = null;
  }

  iniciar() {
    this.timer = setInterval(() => this._consultar(), this.intervalo);
  }

  detener() {
    clearInterval(this.timer);
  }

  async _consultar() {
    try {
      const res = await fetch(`${this.endpoint}?desde=${this.ultimaActualizacion}`);
      const nuevos = await res.json();

      if (nuevos.length > 0) {
        this.ultimaActualizacion = Date.now();
        this.onNuevosRegistros(nuevos);
      }
    } catch (err) {
      console.warn('Polling error:', err);
    }
  }
}
```

### 3. Uso en el módulo de servicios

```js
// public/js/modules/servicios.js

const sync = new PollingSync({
  endpoint: '/.netlify/functions/servicios',
  intervalo: 4000,
  onNuevosRegistros: (nuevos) => {
    nuevos.forEach((servicio) => agregarFilaATabla(servicio));
  },
});

// Iniciar al cargar la vista
sync.iniciar();

// Detener al salir de la vista (evita requests innecesarios)
window.addEventListener('beforeunload', () => sync.detener());
```

---

## Comportamiento esperado

| Situación | Resultado |
|---|---|
| No hay cambios | Respuesta `[]`, sin modificar la UI |
| Usuario A crea un registro | Usuario B lo ve en máximo 4 segundos |
| Usuario cierra la pestaña | Polling se detiene, sin requests fantasma |
| Conexión lenta o error | Se reintenta en el siguiente ciclo |

---

## Costo en red

- Sin cambios: ~200 bytes por request (respuesta vacía `[]`)
- Con 1 registro nuevo: ~1-2 KB dependiendo del tamaño del documento
- Frecuencia: 1 request cada 4 segundos por usuario activo

Para un taller con 2-5 usuarios simultáneos el impacto es mínimo.

---

## Tablas candidatas para implementar

Por prioridad de uso en el sistema:

1. `servicios` — la más consultada, múltiples usuarios la ven simultáneamente
2. `pagos` — cambios de estado importantes para todos
3. `clientes` — menor prioridad, cambios menos frecuentes

---

## Limitaciones

- Delay máximo de 4 segundos (ajustable, no recomendable bajar de 2s)
- No es adecuado para chat en tiempo real o notificaciones críticas instantáneas
- Requiere que todos los documentos tengan campo `createdAt`

---

## Alternativa futura (si se necesita instantáneo)

Si en el futuro se requiere sincronización instantánea, migrar a **Ably** o **Pusher**
que son servicios de WebSockets administrados compatibles con arquitecturas serverless.
El plan gratuito de Ably soporta 200 conexiones simultáneas y 6M mensajes/mes.

---

## Estado

- [ ] Agregar `createdAt` a todas las inserciones en MongoDB
- [ ] Modificar functions para aceptar parámetro `desde`
- [ ] Crear módulo `sincronizacion.js` en el frontend
- [ ] Integrar en módulo `servicios.js`
- [ ] Integrar en módulo `pagos.js`
- [ ] Pruebas con múltiples pestañas abiertas
