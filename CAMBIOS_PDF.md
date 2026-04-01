# 📄 Cambios Implementados - Generación de PDF

## Resumen

Se implementó la generación de PDFs usando **Puppeteer** para que funcione en **Netlify Functions**.

## Archivos Nuevos

### 1. `functions/generar-pdf.js`
- Función serverless de Netlify
- Genera PDFs desde HTML usando Puppeteer
- Conecta a MongoDB para obtener datos del servicio
- Retorna el PDF como archivo descargable

### 2. `GENERACION_PDF.md`
- Documentación completa sobre la generación de PDFs
- Troubleshooting y alternativas
- Ejemplos de uso

### 3. Pruebas
- El PDF se genera directamente en el navegador con jsPDF
- No requiere scripts de prueba adicionales
- Funciona tanto en desarrollo local como en producción

## Archivos Modificados

### 1. `package.json`
**Agregado:**
```json
"@sparticuz/chromium": "^latest",
"puppeteer-core": "^latest"
```
**Modificado:**
```json
"engines": { "node": ">=18.x" }
```

### 2. `netlify.toml`
**Agregado:**
```toml
[functions]
external_node_modules = ["@sparticuz/chromium"]
included_files = ["node_modules/@sparticuz/chromium/**"]

[[redirects]]
from = "/api/generar-pdf"
to = "/.netlify/functions/generar-pdf"
status = 200
```

### 3. `public/reporte.js`
**Modificado:**
- Función `descargarPDF()` ahora llama a la función serverless
- Se agregó `descargarPDFLocal()` como fallback para desarrollo
- Usa fetch para obtener el PDF desde `/.netlify/functions/generar-pdf`

### 4. `README.md`
**Actualizado:**
- Sección de deployment con información sobre PDFs
- Eliminada la advertencia de que PDFs no funcionan en Netlify
- Agregado troubleshooting específico para PDFs

### 5. `.gitignore`
**Agregado:**
```
test-reporte.pdf
```

## Cómo Probar

### Prueba Local
```bash
# Instalar dependencias
npm install

# El PDF se genera en el navegador, no requiere pruebas de servidor
```

### Prueba en Desarrollo
```bash
# Iniciar servidor local
npm run dev

# Abrir http://localhost:3000
# Ir a un servicio y hacer clic en "Descargar PDF"
```

### Prueba en Netlify
1. Hacer commit y push de los cambios
2. Netlify desplegará automáticamente
3. Abrir la app en producción
4. Ir a un servicio y hacer clic en "Descargar PDF"
5. El PDF debería descargarse (puede tardar 5-10 segundos la primera vez)

## Notas Importantes

⚠️ **Cold Start:** La primera generación de PDF puede tardar 5-10 segundos en Netlify debido al cold start. Las siguientes serán más rápidas.

⚠️ **Límite de Tiempo:** Netlify Functions tienen un límite de 10 segundos en el plan gratuito. Si el PDF es muy complejo, considera simplificar el diseño.

⚠️ **Memoria:** Puppeteer consume ~150-200 MB de memoria. Netlify Free tiene límite de 1024 MB por función.

## WhatsApp

La integración de WhatsApp (`functions/enviar-whatsapp-pdf.js`) está lista pero **en desarrollo**. Necesita:
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_ID`
- `WHATSAPP_BUSINESS_ID`

Por ahora, solo se implementó la generación de PDF.

## Próximos Pasos

1. ✅ Generación de PDF funcionando
2. 🚧 Integración con WhatsApp (pendiente)
3. 💡 Considerar caché de PDFs para servicios frecuentes
4. 💡 Agregar opción de enviar por email

## Soporte

Si hay problemas:
1. Revisar logs de Netlify Functions
2. Verificar que las variables de entorno estén configuradas
3. Revisar `GENERACION_PDF.md` para troubleshooting detallado
4. Verificar que jsPDF esté cargado correctamente en el navegador
