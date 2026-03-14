/**
 * Script de prueba para verificar que DECOLECTA API funciona
 * Ejecutar: node test-api.js
 */

const axios = require('axios');
require('dotenv').config();

async function testDecolecta() {
  try {
    console.log('🧪 Testing DECOLECTA API...\n');

    const apiKey = process.env.DECOLECTA_API_KEY;
    const apiUrl = process.env.DECOLECTA_URL || 'https://api.decolecta.com';

    console.log(`📝 Configuración:`);
    console.log(`   URL: ${apiUrl}`);
    console.log(`   API Key: ${apiKey ? '✓ Configurado' : '✗ NO CONFIGURADO'}\n`);

    if (!apiKey) {
      console.error('❌ ERROR: DECOLECTA_API_KEY no está configurado en .env');
      process.exit(1);
    }

    const dni = '46027897'; // DNI de prueba
    console.log(`🔍 Consultando DNI: ${dni}\n`);

    // Intentar diferentes endpoints
    const endpoints = [
      `${apiUrl}/v1/dni/${dni}`,
      `${apiUrl}/dni/${dni}`,
      `${apiUrl}/personas/${dni}`,
      `${apiUrl}/api/dni/${dni}`
    ];

    let response = null;
    for (const endpoint of endpoints) {
      try {
        console.log(`   Intentando: ${endpoint}`);
        response = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 3000
        });
        console.log(`   ✓ Exitoso!\n`);
        break;
      } catch (e) {
        continue;
      }
    }

    if (!response) {
      throw new Error('Ninguno de los endpoints funcionó. Verifica la documentación de DECOLECTA.');
    }

    console.log('✅ Respuesta exitosa!\n');
    console.log('📊 Datos obtenidos:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n✨ DECOLECTA API está funcionando correctamente!');

  } catch (error) {
    console.error('\n❌ ERROR en consulta:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Mensaje: ${error.response.data?.message || error.response.data}`);
    } else if (error.request) {
      console.error(`   No se recibió respuesta del servidor`);
      console.error(`   URL: ${error.config?.url}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }

    console.error('\n💡 Posibles causas:');
    console.error('   1. API Key inválido o expirado');
    console.error('   2. Sin conexión a internet');
    console.error('   3. DECOLECTA API no disponible');
    console.error('   4. DNI no válido');

    process.exit(1);
  }
}

testDecolecta();
