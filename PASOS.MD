PASO 1️⃣: GIT - SUBE TU CÓDIGO
A. Verificar estado actual:
cd d:/P01-ING-SW/doctorpc02/doctorpc
git status
Qué verás:

On branch main
Changes not staged for commit:
  modified:   netlify.toml
  
Untracked files:
  functions/api.js
B. Agregar cambios:
git add .
Esto suma:

✅ functions/api.js (NUEVA)
✅ netlify.toml (MODIFICADA)
⏭️ .env NO se sube (está en .gitignore por seguridad)
C. Crear commit:
git commit -m "Setup Netlify serverless functions y configuración de despliegue"
D. Enviar a GitHub:
git push origin main
Resultado esperado:

[main abc1234] Setup Netlify serverless functions
 2 files changed, 150 insertions(+), 2 deletions(-)
 create mode 100644 functions/api.js
PASO 2️⃣: EN NETLIFY.COM - CONFIGURACIÓN DETALLADA
A. Acceder a Netlify:
Ir a https://app.netlify.com
Sign up con GitHub (si no tienes cuenta)
Autorizar acceso a tus repositorios GitHub
B. Crear nuevo sitio:
New site from Git
  ↓
Choose Git provider → GitHub
  ↓
Select repository → doctorpc
  ↓
Configure build settings
C. Configuración de Build:
Pantalla de configuración:

Build command:           npm install
Base directory:          (dejar vacío)
Publish directory:       public
Functions directory:     functions
Explicación:

npm install → Instala dependencias (Express, MongoDB, etc.)
public → Carpeta con HTML/CSS/JS (frontend)
functions → Carpeta con serverless (backend API)
D. Variables de Entorno (CRÍTICO):
Click en Environment o Site settings → Build & deploy → Environment

Agregar variables:

Variable	Valor	Ejemplo
MONGODB_URI	Tu connection string MongoDB Atlas	mongodb+srv://user:pass@cluster.mongodb.net/doctorpc
DECOLECTA_API_KEY	Tu API key DECOLECTA	tu_api_key_aqui
NODE_ENV	production	production
⚠️ IMPORTANTE:

NO copiar del .env local directamente
Ir a MongoDB Atlas → Copy connection string
Copiar DECOLECTA API key del panel
E. Deploy:
Click en Deploy site

Consola de Netlify mostrará:

✓ Build succeeded
✓ Functions deployed
✓ Site published

Your site is live at: https://your-site-name.netlify.app
URLs resultantes:

Frontend: https://your-site-name.netlify.app
API: https://your-site-name.netlify.app/.netlify/functions/api
PASO 3️⃣: VERIFICA EN CONSOLA - PRUEBAS LOCALES
A. Test local antes de desplegar:
npm start
Esperado:

==================================================
✅ Servidor corriendo en puerto 3000
🌐 URL: http://localhost:3000
📁 Base de datos: doctorpc
==================================================
B. Prueba los endpoints:
En otra terminal (PowerShell):

# Test 1: Health Check
curl http://localhost:3000/api/health

# Respuesta esperada:
# {"status":"OK","database":"MongoDB Atlas"}
# Test 2: Obtener clientes
curl http://localhost:3000/api/clientes

# Respuesta esperada:
# [{"_id":"...","nombre":"...","dni":"..."}]
# Test 3: Crear cliente
$body = @{
    nombre = "Juan Pérez"
    dni = "12345678"
    email = "juan@example.com"
    telefono = "987654321"
} | ConvertTo-Json

curl -X POST `
  -H "Content-Type: application/json" `
  -d $body `
  http://localhost:3000/api/clientes

# Respuesta esperada:
# {"_id":"...","nombre":"Juan Pérez","dni":"12345678",...}
C. Verificar en navegador:
Ir a: http://localhost:3000

Debe mostrar tu página principal (index.html)

D. Test POST con Postman/Thunder Client:
Descargar Thunder Client (VS Code extension)
Crear request:
Método: POST
URL: http://localhost:3000/api/clientes
Body (JSON):
{
  "nombre": "Carlos López",
  "dni": "87654321",
  "email": "carlos@example.com",
  "telefono": "991234567"
}
Click Send
RESUMEN - CHECKLIST FINAL:
✅ Git:
   □ git add .
   □ git commit -m "mensaje"
   □ git push origin main

✅ Netlify.com:
   □ Conectar GitHub
   □ Seleccionar repo
   □ Build command: npm install
   □ Publish dir: public
   □ MONGODB_URI en env vars
   □ DECOLECTA_API_KEY en env vars
   □ Click Deploy

✅ Tests:
   □ npm start (local)
   □ curl /api/health (verificar conexión)
   □ curl /api/clientes (obtener datos)
   □ POST test (crear cliente)
   □ Abrir http://localhost:3000 en navegador
¿Ya tienes GitHub conectado a Netlify, o necesitas ayuda con eso?