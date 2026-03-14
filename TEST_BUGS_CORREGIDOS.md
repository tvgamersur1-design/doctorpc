# ✅ Tests de Validación - Bugs Corregidos

## Resumen Rápido de Cambios
Todos los bugs han sido corregidos. Aquí cómo validarlos:

---

## 1️⃣ Test: POST cliente con datos inválidos
**Intención:** Rechazar datos malos

```bash
# Falta nombre
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"dni": "12345678", "email": "test@mail.com"}'

# ❌ ANTES: Guardaba sin nombre (BUG)
# ✅ AHORA: Retorna { error: 'Datos inválidos', detalles: ['nombre es requerido'] }
```

---

## 2️⃣ Test: POST cliente con DNI duplicado
**Intención:** Rechazar DNI iguales

```bash
# Primero, crear cliente
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "dni": "12345678",
    "email": "juan@mail.com"
  }'

# Luego, intentar crear otro con mismo DNI
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Pedro",
    "dni": "12345678",
    "email": "pedro@mail.com"
  }'

# ❌ ANTES: Guardaba duplicado (BUG)
# ✅ AHORA: Retorna 409 { error: 'DNI ya registrado', cliente_existente: {...} }
```

---

## 3️⃣ Test: GET cliente por _id OR DNI
**Intención:** Buscar de dos formas

```bash
# Crear cliente (retorna con _id)
RESPONSE=$(curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "dni": "12345678",
    "email": "juan@mail.com"
  }')

# Extraer _id
ID=$(echo $RESPONSE | jq -r '._id')

# GET por _id
curl http://localhost:3000/api/clientes/$ID

# ❌ ANTES: Solo funcionaba con campo 'id' (no _id) (BUG)
# ✅ AHORA: Funciona con _id

# GET por DNI
curl http://localhost:3000/api/clientes/12345678

# ❌ ANTES: Solo funcionaba con campo 'id' (no DNI) (BUG)
# ✅ AHORA: Funciona con DNI también
```

---

## 4️⃣ Test: DELETE cliente inexistente
**Intención:** Retornar error 404

```bash
curl -X DELETE http://localhost:3000/api/clientes/000invalid000

# ❌ ANTES: Retornaba { success: true } (FALSO) (BUG)
# ✅ AHORA: Retorna 404 { success: false, error: 'Cliente no encontrado', deletedCount: 0 }
```

---

## 5️⃣ Test: Race condition en POST (concurrencia)
**Intención:** Evitar IDs duplicados

```bash
# Enviar 5 POST simultáneos
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/clientes \
    -H "Content-Type: application/json" \
    -d '{
      "nombre": "Cliente'$i'",
      "dni": "'$((10000000 + i))'",
      "email": "cliente'$i'@mail.com"
    }' &
done
wait

# Verificar que se crearon 5 clientes con IDs distintos
curl http://localhost:3000/api/clientes | jq '.[] | ._id' | sort | uniq

# ❌ ANTES: Algunos _ids duplicados (RACE CONDITION BUG)
# ✅ AHORA: Todos _ids únicos (MongoDB garantiza atomicidad)
```

---

## 6️⃣ Test: Validación de email
**Intención:** Email válido o vacio, no acepta basura

```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "dni": "12345678",
    "email": "notanemail"
  }'

# ❌ ANTES: Guardaba "notanemail" como email (BUG)
# ✅ AHORA: Retorna { error: 'Datos inválidos', detalles: ['Email inválido'] }
```

---

## 7️⃣ Test: POST equipo con numero_serie duplicado
**Intención:** Rechazar series iguales

```bash
# Crear equipo 1
curl -X POST http://localhost:3000/api/equipos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "507f1f77bcf86cd799439011",
    "tipo_equipo": "laptop",
    "numero_serie": "SN123456789"
  }'

# Intentar equipo 2 con misma serie
curl -X POST http://localhost:3000/api/equipos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "507f1f77bcf86cd799439012",
    "tipo_equipo": "desktop",
    "numero_serie": "SN123456789"
  }'

# ❌ ANTES: Guardaba duplicado (BUG)
# ✅ AHORA: Retorna 409 { error: 'Número de serie ya existe', ... }
```

---

## 8️⃣ Test: Validación en PUT
**Intención:** PUT también valida como POST

```bash
# Actualizar cliente a email inválido
curl -X PUT http://localhost:3000/api/clientes/12345678 \
  -H "Content-Type: application/json" \
  -d '{"email": "invalidmail"}'

# ✅ AHORA: Retorna { error: 'Datos inválidos', detalles: ['Email inválido'] }
```

---

## 📊 Tabla Comparativa

| Test | Antes (BUG) | Después (FIXED) | HTTP Status |
|------|-------------|-----------------|------------|
| POST sin nombre | Guardaba | Rechaza | 400 |
| POST DNI duplicado | Guardaba | Rechaza | 409 |
| GET por _id | Fallaba | Funciona | 200 |
| GET por DNI | Fallaba | Funciona | 200 |
| DELETE inexistente | success: true | error 404 | 404 |
| Race condition | IDs duplicados | IDs únicos | 201 |
| Email inválido | Guardaba | Rechaza | 400 |
| numero_serie duplicado | Guardaba | Rechaza | 409 |

---

## 🚀 Para ejecutar los tests

```bash
# Terminal 1: Iniciar servidor
npm start

# Terminal 2: Ejecutar tests
bash TEST_BUGS_CORREGIDOS.md
```

---

## ✅ Validación Final

Ejecutar:
```bash
node -c server.js
# Debe retornar sin errores
```

Si no hay output, la sintaxis está correcta ✅
