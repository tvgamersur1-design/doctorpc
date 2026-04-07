// Script para verificar variables de entorno
// Ejecutar con: node check-env.js

require('dotenv').config();

console.log('🔍 Verificando variables de entorno de Cloudinary...\n');

const variables = {
    'CLOUDINARY_CLOUD_NAME': process.env.CLOUDINARY_CLOUD_NAME,
    'CLOUDINARY_API_KEY': process.env.CLOUDINARY_API_KEY,
    'CLOUDINARY_API_SECRET': process.env.CLOUDINARY_API_SECRET
};

let todasConfiguradas = true;

for (const [nombre, valor] of Object.entries(variables)) {
    if (valor) {
        console.log(`✅ ${nombre}: ${valor.substring(0, 10)}... (configurada)`);
    } else {
        console.log(`❌ ${nombre}: NO CONFIGURADA`);
        todasConfiguradas = false;
    }
}

console.log('\n' + '='.repeat(50));

if (todasConfiguradas) {
    console.log('✅ Todas las variables de Cloudinary están configuradas');
    console.log('\nPuedes probar la función con: node test-upload.js');
} else {
    console.log('❌ Faltan variables de entorno');
    console.log('\nPasos para solucionar:');
    console.log('1. Copia .env.example a .env');
    console.log('2. Completa las variables CLOUDINARY_* con tus credenciales');
    console.log('3. Obtén credenciales en: https://console.cloudinary.com/settings/api-keys');
}

console.log('='.repeat(50) + '\n');
