# 🚀 INICIO RÁPIDO - Doctor PC en 5 minutos

## ⚡ Si tienes prisa, haz esto:

### 1️⃣ Terminal - Instalar y ejecutar
```bash
cd d:\ISW-V_G01\DDAM\WEB\doctorpc
npm install
npm run dev
```

Espera a ver:
```
Servidor corriendo en puerto 3000
URL: http://localhost:3000
```

### 2️⃣ Navegador
Abre: **http://localhost:3000**

### 3️⃣ Prueba rápida
- **Tab "Clientes"** → Agrega: Nombre=Juan, Teléfono=987654321 → Guardar
- **Tab "RENIEC"** → DNI=12345678 → Consultar (si RENIEC está disponible)
- **Tab "Equipos"** → Agrega: Tipo=Laptop, Marca=Dell → Guardar

✅ **¡Listo! Tu app está funcionando**

---

## 📤 Subir a Netlify en 3 pasos

### Paso 1: GitHub
```bash
git init
git add .
git commit -m "Initial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/doctorpc.git
git push -u origin main
```
*(Reemplaza TU_USUARIO con tu usuario de GitHub)*

### Paso 2: Netlify.com
1. Ve a https://netlify.com
2. Click "New site from Git"
3. Selecciona tu repo `doctorpc`
4. Deploy automático

### Paso 3: Esperar
- Espera 2-3 minutos
- Tu URL será: `https://doctorpc-xxxxx.netlify.app`
- ¡Compartible con el mundo! 🌍

---

## 🔍 Verificar que todo funciona

**Test Checklist:**

```
☐ npm install sin errores
☐ npm run dev sin errores
☐ Navegador abre http://localhost:3000
☐ Puedo escribir en inputs
☐ Puedo agregar cliente
☐ Cliente aparece en tabla
☐ Tab RENIEC carga correctamente
```

Si todo ✅, **¡Tu proyecto está listo!**

---

## 🆘 Si algo falla

| Problema | Solución |
|----------|----------|
| `npm not found` | Instala Node.js de https://nodejs.org |
| `Port 3000 in use` | `npm run dev -- --port 3001` |
| `No internet en RENIEC` | Verifica conexión, usa API local |
| `No aparecen datos` | Abre F12 → Console → busca errores |

---

## 📚 Documentación completa

- **GUIA_PASOS.md** ← Instrucciones detalladas  
- **README.md** ← Documentación técnica  
- **RESUMEN.txt** ← Resumen visual  

---

## 🎯 Siguiente paso

Después de verificar que funciona localmente:

1. Sube código a GitHub (ver Paso 1 arriba)
2. Configura Netlify (ver Paso 2 arriba)
3. Lee GUIA_PASOS.md para entender bien todo

---

**¡Listo! Ahora tienes una aplicación web moderna desplegada en la nube.**

Cualquier duda: revisa la documentación o los logs de la terminal.
