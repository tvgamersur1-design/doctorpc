/**
 * Script de prueba para generar PDF localmente
 * Ejecutar: node test-pdf-local.js
 */

const fs = require('fs');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

async function testPDF() {
  console.log('🧪 Iniciando prueba de generación de PDF...');
  
  let browser;
  
  try {
    // HTML de prueba
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { background: #2196F3; color: white; padding: 20px; border-radius: 8px; }
    h1 { margin: 0; }
    .content { margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🖥️ DOCTOR PC - Test PDF</h1>
    <p>Sistema de Administración</p>
  </div>
  <div class="content">
    <h2>Prueba de Generación de PDF</h2>
    <p>Este es un PDF de prueba generado con Puppeteer.</p>
    <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-PE')}</p>
    <p><strong>Estado:</strong> ✅ Funcionando correctamente</p>
  </div>
</body>
</html>
    `;
    
    console.log('🚀 Lanzando navegador...');
    
    // Detectar Chrome en Windows
    let executablePath;
    let args = [];
    
    if (process.platform === 'win32') {
      // Windows: usar Chrome local
      const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
      ];
      
      executablePath = possiblePaths.find(path => {
        try {
          return fs.existsSync(path);
        } catch (e) {
          return false;
        }
      });
      
      if (!executablePath) {
        throw new Error('Chrome no encontrado. Por favor instala Google Chrome.');
      }
      
      console.log('✅ Usando Chrome local de Windows');
      args = ['--no-sandbox', '--disable-setuid-sandbox'];
    } else {
      // Linux/Mac: usar Chromium de @sparticuz/chromium
      try {
        executablePath = await chromium.executablePath();
        args = chromium.args;
        console.log('✅ Usando Chromium de @sparticuz/chromium');
      } catch (e) {
        executablePath = '/usr/bin/google-chrome';
        args = ['--no-sandbox', '--disable-setuid-sandbox'];
        console.log('✅ Usando Chrome del sistema');
      }
    }
    
    browser = await puppeteer.launch({
      args: args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: true,
    });
    
    console.log('📄 Generando PDF...');
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    
    await browser.close();
    
    // Guardar PDF
    const filename = 'test-reporte.pdf';
    fs.writeFileSync(filename, pdfBuffer);
    
    console.log('✅ PDF generado exitosamente:', filename);
    console.log('📊 Tamaño:', (pdfBuffer.length / 1024).toFixed(2), 'KB');
    console.log('');
    console.log('🎉 ¡Prueba completada! El sistema está listo para generar PDFs.');
    
  } catch (error) {
    console.error('❌ Error al generar PDF:', error.message);
    console.error('');
    console.error('💡 Soluciones:');
    console.error('1. Verifica que las dependencias estén instaladas:');
    console.error('   npm install @sparticuz/chromium puppeteer-core');
    console.error('2. Si estás en Windows, instala Google Chrome');
    console.error('3. Revisa los logs completos arriba');
    
    if (browser) await browser.close();
    process.exit(1);
  }
}

testPDF();
