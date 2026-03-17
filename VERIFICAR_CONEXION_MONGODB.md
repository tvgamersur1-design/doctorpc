# ✅ CHECKLIST COMPLETO - VERIFICAR CONEXIÓN MONGODB CON NETLIFY

## 📋 TABLA DE CONTENIDOS
1. [Verificar MongoDB Atlas](#1-verificar-mongodb-atlas)
2. [Verificar Usuario y Credenciales](#2-verificar-usuario-y-credenciales)
3. [Verificar IP Whitelist](#3-verificar-ip-whitelist)
4. [Verificar Variables de Entorno en Netlify](#4-verificar-variables-de-entorno-en-netlify)
5. [Verificar Cluster está Activo](#5-verificar-cluster-está-activo)
6. [Test de Conexión Local](#6-test-de-conexión-local)
7. [Redeploy en Netlify](#7-redeploy-en-netlify)
8. [Verificar Logs en Netlify](#8-verificar-logs-en-netlify)
9. [Diagnosticar Errores](#9-diagnosticar-errores)

---

## 1. VERIFICAR MONGODB ATLAS

### ✓ Acceder a MongoDB Atlas
- [ ] Ir a: https://cloud.mongodb.com
- [ ] Login con tu cuenta
- [ ] Seleccionar la **organización** correcta
- [ ] Seleccionar el **proyecto** correcto

### ✓ Verificar Cluster
- [ ] Click en **Clusters**
- [ ] ¿Ves tu cluster? (debería ser algo como `Cluster0`)
- [ ] ¿El estado es **GREEN** (activo)?
- [ ] ¿NO está **PAUSED** (pausado)?

**Si está pausado:**
- [ ] Click en el cluster
- [ ] Click **Resume** para reactivar

**Si no existe:**
- [ ] Crea uno nuevo: Click **Create** → Free tier

---

## 2. VERIFICAR USUARIO Y CREDENCIALES

### ✓ Acceder a Database Access
- [ ] En MongoDB Atlas, ve a **Security** → **Database Access**

### ✓ Verificar Usuario
- [ ] ¿Ves el usuario `tvgamersur1_db_user`?
- [ ] ¿Su estado es **ACTIVE**?

**Nota la contraseña actual:**
```
Usuario: tvgamersur1_db_user
Contraseña: befuexGMp37PtEwX (¿es correcta?)
```

### ✓ Si necesitas cambiar contraseña:
- [ ] Click en el usuario → **Edit**
- [ ] Cambia la contraseña
- [ ] Click **Update User**
- [ ] **COPIA** la nueva contraseña
- [ ] Actualiza en Netlify (paso 4)

---

## 3. VERIFICAR IP WHITELIST

### ✓ Acceder a Network Access
- [ ] En MongoDB Atlas, ve a **Security** → **Network Access**
- [ ] Click en el tab **IP Access List**

### ✓ Verificar IPs permitidas
Deberías ver una entrada como:

| IP Address | Status | Comment |
|-----------|--------|---------|
| `0.0.0.0/0` | **ACTIVE** | Allow Netlify |

**Si NO existe:**
- [ ] Click **ADD IP ADDRESS**
- [ ] En el campo ingresa: `0.0.0.0/0`
- [ ] En Comment: `Allow Netlify`
- [ ] Click **CONFIRM**
- [ ] **ESPERA 5-10 MINUTOS** hasta que diga **ACTIVE**

**Si existe pero está PENDING:**
- [ ] Espera a que cambie a **ACTIVE** (puede tardar 10-15 min)
- [ ] Recarga la página (F5)

**Si existe y está ACTIVE:**
- [ ] ✅ Continúa al paso 4

---

## 4. VERIFICAR VARIABLES DE ENTORNO EN NETLIFY

### ✓ Acceder a Netlify
- [ ] Ve a: https://netlify.com
- [ ] Login con tu cuenta
- [ ] Selecciona el site: `soluciones-doctorpc`

### ✓ Ir a Environment Variables
- [ ] Click **Site settings**
- [ ] Click **Build & deploy**
- [ ] Click **Environment**

### ✓ Verificar MONGODB_URI
Deberías ver:

```
MONGODB_URI = mongodb+srv://tvgamersur1_db_user:befuexGMp37PtEwX@ac-egixggf.empucla.mongodb.net/doctorpc?retryWrites=true&w=majority
```

**Verifica cada parte:**
- [ ] Comienza con: `mongodb+srv://`
- [ ] Usuario: `tvgamersur1_db_user`
- [ ] Contraseña: `befuexGMp37PtEwX` (o la nueva si cambiaste)
- [ ] Cluster: `ac-egixggf.empucla.mongodb.net`
- [ ] Base de datos: `/doctorpc`
- [ ] Parámetros: `?retryWrites=true&w=majority`
- [ ] **SIN espacios** antes o después

**Si está mal:**
- [ ] Click **Edit** 
- [ ] Copia la URI correcta de MongoDB Atlas → Connect → Drivers
- [ ] Reemplaza
- [ ] Click **Save**

### ✓ Verificar DECOLECTA_API_KEY
- [ ] Existe y tiene valor: `sk_13753.E7wCAWLevV9z5VFni574lKcLCrDxgW03`
- [ ] ✅ Correcto

---

## 5. VERIFICAR CLUSTER ESTÁ ACTIVO

### ✓ En MongoDB Atlas
- [ ] Ve a **Clusters**
- [ ] Haz click en tu cluster
- [ ] Verifica el **Status**: debe decir "Running" o estar **GREEN**
- [ ] ¿NO dice "Paused"?

**Si está pausado:**
- [ ] Click el botón **Resume**
- [ ] Espera 2-3 minutos a que se reactive

---

## 6. TEST DE CONEXIÓN LOCAL

### ✓ Verificar que funciona en localhost
- [ ] Abre terminal en: `d:/P01-ING-SW/doctorpc02/doctorpc`
- [ ] Ejecuta:
```bash
npm start
```
- [ ] Espera a que inicie el servidor (debería ver `✅ Servidor corriendo en puerto 3000`)
- [ ] Abre en navegador: `http://localhost:3000`
- [ ] ¿Carga la página?
- [ ] ¿Ves los clientes/servicios/equipos?

**Si funciona localmente:**
- [ ] Continuamos al paso 7
- [ ] El problema está en Netlify/MongoDB network

**Si NO funciona:**
- [ ] Problema está en tu conexión local
- [ ] Verifica `.env` tiene `MONGODB_URI` correcto

---

## 7. REDEPLOY EN NETLIFY

### ✓ Opción A: Desde terminal
```bash
cd d:/P01-ING-SW/doctorpc02/doctorpc
git add -A
git commit -m "Verify MongoDB connection"
git push origin main
```
- [ ] Espera a que Netlify redeploy (2-3 minutos)

### ✓ Opción B: Manual en Netlify
- [ ] Ve a Netlify → **Deployments**
- [ ] Click el botón **Trigger deploy**
- [ ] Click **Deploy site**
- [ ] Espera a que termine (estado **Published**)

---

## 8. VERIFICAR LOGS EN NETLIFY

### ✓ Ver logs de Functions
- [ ] Netlify → **Functions**
- [ ] Click en **View logs**
- [ ] Busca mensajes de error

**Deberías ver algo como:**
```
✓ Conectado a MongoDB
Obteniendo lista de clientes...
Retornando 5 clientes
```

**Si ves errores:**
- [ ] Anota exactamente qué dice el error
- [ ] Comparte conmigo

---

## 9. DIAGNOSTICAR ERRORES

### ❌ Si ves: `MongoServerSelectionError: connection to 35.238.216.63:27017 closed`

**Significa:** IP de Netlify NO está whitelisted

**Solución:**
1. [ ] Ve a MongoDB Atlas → Network Access
2. [ ] Verifica que `0.0.0.0/0` existe y está **ACTIVE**
3. [ ] Si no existe, agrégalo (paso 3)
4. [ ] Espera 10 minutos
5. [ ] Redeploy Netlify (paso 7)

---

### ❌ Si ves: `Authentication failed`

**Significa:** Contraseña incorrecta

**Solución:**
1. [ ] Ve a MongoDB Atlas → Database Access
2. [ ] Verifica la contraseña del usuario
3. [ ] Copia la contraseña correcta
4. [ ] Actualiza en Netlify (paso 4)
5. [ ] Redeploy

---

### ❌ Si ves: `ENOTFOUND ac-egixggf.empucla.mongodb.net`

**Significa:** Nombre de cluster incorrecto

**Solución:**
1. [ ] Ve a MongoDB Atlas → Clusters
2. [ ] Haz click en tu cluster
3. [ ] Click **CONNECT**
4. [ ] Copia la URI correcta
5. [ ] Reemplaza en Netlify (paso 4)
6. [ ] Redeploy

---

### ❌ Si funciona localmente pero no en Netlify

**Posibles causas:**
- [ ] IP Netlify no whitelisted (solución: paso 3)
- [ ] Variables de entorno no guardadas (solución: paso 4)
- [ ] Deploy no se actualizó (solución: redeploy paso 7)
- [ ] Contraseña cambió (solución: paso 2)

---

## 🔄 ORDEN RECOMENDADO DE VERIFICACIÓN

```
1. ✓ Paso 1: Verificar MongoDB Atlas existe
2. ✓ Paso 5: Verificar Cluster está ACTIVO
3. ✓ Paso 2: Verificar Usuario y contraseña
4. ✓ Paso 3: Verificar IP Whitelist (0.0.0.0/0 ACTIVE)
5. ✓ Paso 4: Verificar Variables en Netlify
6. ✓ Paso 6: Test Local (npm start)
7. ✓ Paso 7: Redeploy en Netlify
8. ✓ Paso 8: Ver logs de Netlify Functions
9. ✓ Paso 9: Diagnosticar si hay errores
```

---

## 📞 INFORMACIÓN A PROPORCIONAR SI HAY ERRORES

Si aún hay problemas, comparte:

```
1. Screenshot de MongoDB Atlas → Network Access (mostrar IPs)
2. Screenshot de Netlify → Environment variables (sin exponer password)
3. Mensaje exacto del error en DevTools (F12 → Console)
4. Logs de Netlify Functions
5. ¿Funciona en localhost?
```

---

## ✅ CUANDO TODO FUNCIONA

Deberías ver:
- ✅ Página carga sin errores
- ✅ Tabla de clientes se llena con datos
- ✅ Tabla de servicios se llena con datos
- ✅ Tabla de equipos se llena con datos
- ✅ Console sin errores rojos

---

**Última verificación hecha:** 2026-03-17
**Versión:** 1.0
