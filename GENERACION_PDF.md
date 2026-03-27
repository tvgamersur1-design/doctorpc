# 📄 Generación de PDF en Netlify

## Solución Implementada

Este sistema utiliza **Puppeteer** con **@sparticuz/chromium** para generar PDFs en Netlify Functions.

## ¿Cómo funciona?

1. El frontend llama a `/.netlify/functions/generar-pdf`
2. La función serverless:
   - Obtiene los datos del servicio desde MongoDB
   - Genera HTML con estilos CSS
   - Usa Puppeteer para renderizar el HTML
   - Convierte el HTML a PDF
   - Retorna el PDF al navegador

## Ventajas

✅ Funciona en Netlify (serverless)
✅ PDFs de alta calidad con CSS completo
✅ No requiere servicios externos de pago
✅ Soporta diseños complejos y responsive

## Desventajas

⚠️ Cold start: Primera ejecución puede tardar 5-10 segundos
⚠️ Consume más memoria que jsPDF
⚠️ Límite de 10 segundos de ejecución en Netlify (plan gratuito)

## Dependencias

```json
{
  "@sparticuz/chromium": "^latest",
  "puppeteer-core": "^latest"
}
```

## Configuración en netlify.toml

```toml
[functions]
external_node_modules = ["@sparticuz/chromium"]
included_files = ["node_modules/@sparticuz/chromium/**"]
```

## Uso desde el Frontend

```javascript
// Descargar PDF
const response = await fetch('/.netlify/functions/generar-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ servicioId: 'ID_DEL_SERVICIO' })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'reporte.pdf';
a.click();
```

## Troubleshooting

### Error: Failed to launch chrome
**Causa:** Chromium no se instaló correctamente
**Solución:** 
```bash
npm install @sparticuz/chromium puppeteer-core --save
```

### PDF tarda mucho
**Causa:** Cold start de Netlify Functions
**Solución:** Es normal. La primera ejecución tarda más. Las siguientes son más rápidas.

### Error: Function timeout
**Causa:** La función tardó más de 10 segundos
**Solución:** 
- Simplifica el HTML del PDF
- Considera actualizar a Netlify Pro (26 segundos de timeout)
- Usa un servicio externo como PDFShift

## Alternativas

Si Puppeteer no funciona bien en tu caso:

1. **PDFShift** (https://pdfshift.io) - 250 PDFs gratis/mes
2. **DocRaptor** (https://docraptor.com) - 5 PDFs gratis/mes
3. **PDF.co** (https://pdf.co) - API gratuita limitada
4. **Servidor Node.js tradicional** - Heroku, Railway, DigitalOcean

## Costos

- **Netlify Free:** 125k invocaciones/mes, 100 horas de ejecución
- **Netlify Pro:** $19/mes, 1M invocaciones, 1000 horas
- **Chromium:** Gratis, open source

## Rendimiento

- Primera ejecución (cold start): 5-10 segundos
- Ejecuciones subsecuentes: 2-3 segundos
- Tamaño del PDF: ~50-200 KB
- Memoria usada: ~150-200 MB

## Notas Importantes

⚠️ **No usar en loops:** Generar múltiples PDFs en paralelo puede causar timeouts
⚠️ **Caché:** Considera cachear PDFs si se generan frecuentemente
⚠️ **Monitoreo:** Revisa los logs de Netlify para detectar errores

## Soporte

Si tienes problemas, revisa:
- Logs de Netlify Functions
- Variables de entorno configuradas
- Versión de Node.js (debe ser >=18)
