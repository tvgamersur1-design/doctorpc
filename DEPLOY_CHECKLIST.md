# ✅ Checklist para Deploy a Netlify

## Antes de Subir a Git

- [x] Archivos de prueba eliminados
- [x] Archivos markdown de desarrollo eliminados
- [x] Dependencias instaladas (`@sparticuz/chromium`, `puppeteer-core`)
- [x] PDF de prueba generado exitosamente
- [x] `.gitignore` actualizado
- [x] README.md actualizado

## Variables de Entorno en Netlify

Configurar en: **Site settings → Environment variables**

### Requeridas (Obligatorias)
- [ ] `MONGODB_URI` - Tu conexión a MongoDB Atlas
- [ ] `JWT_SECRET` - Secreto para tokens JWT (mínimo 32 caracteres)
- [ ] `ADMIN_PASSWORD` - Contraseña del usuario admin

### Opcionales
- [ ] `ALLOWED_ORIGINS` - Orígenes permitidos (ej: `https://tu-app.netlify.app`)
- [ ] `WHATSAPP_TOKEN` - Token de WhatsApp (si vas a usar WhatsApp)
- [ ] `WHATSAPP_PHONE_ID` - ID del teléfono de WhatsApp
- [ ] `WHATSAPP_BUSINESS_ID` - ID del negocio de WhatsApp

## Build Settings en Netlify

- **Build command:** `npm install`
- **Publish directory:** `public`
- **Functions directory:** `functions`

## Después del Deploy

### 1. Verificar que el sitio cargue
- [ ] Abrir la URL de Netlify
- [ ] Verificar que cargue el login
- [ ] Iniciar sesión con usuario `admin`

### 2. Probar funcionalidades básicas
- [ ] Crear un cliente
- [ ] Crear un equipo
- [ ] Crear un servicio

### 3. Probar generación de PDF
- [ ] Ir a un servicio
- [ ] Hacer clic en "Ver Detalles"
- [ ] Hacer clic en "Descargar PDF"
- [ ] Esperar 5-10 segundos (primera vez)
- [ ] Verificar que el PDF se descargue

### 4. Revisar Logs (si hay errores)
- [ ] Ir a Netlify Dashboard
- [ ] Functions → Ver logs
- [ ] Buscar errores en `generar-pdf`

## Comandos Git

```bash
# Ver estado
git status

# Agregar todos los cambios
git add .

# Commit
git commit -m "feat: Sistema completo con generación de PDF en Netlify"

# Push
git push origin main
```

## Si Algo Sale Mal

### PDF no se genera
1. Revisar logs de Netlify Functions
2. Verificar que `MONGODB_URI` esté configurado
3. Probar localmente: `node test-pdf-local.js`

### Error de conexión a MongoDB
1. Verificar que `MONGODB_URI` esté en variables de entorno
2. Verificar que la IP de Netlify esté permitida en MongoDB Atlas
3. Considerar permitir acceso desde cualquier IP (0.0.0.0/0) en MongoDB

### Error 401 al hacer login
1. Verificar que `JWT_SECRET` esté configurado
2. Verificar que `ADMIN_PASSWORD` esté configurado
3. Limpiar cookies del navegador

### Función tarda mucho
1. Es normal la primera vez (cold start)
2. Las siguientes ejecuciones serán más rápidas
3. Si persiste, revisar logs de Netlify

## Recursos Útiles

- **Netlify Dashboard:** https://app.netlify.com
- **MongoDB Atlas:** https://cloud.mongodb.com
- **Documentación Netlify Functions:** https://docs.netlify.com/functions/overview/
- **Documentación Puppeteer:** https://pptr.dev/

## Contacto de Soporte

Si necesitas ayuda:
1. Revisar `GENERACION_PDF.md`
2. Revisar `RESUMEN_IMPLEMENTACION_PDF.md`
3. Revisar logs de Netlify
4. Buscar en la documentación oficial

---

**¡Listo para producción!** 🚀
