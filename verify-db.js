const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'doctorpc';

async function verificarBD() {
  const mongoClient = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);
    
    console.log('\n📋 ===== VERIFICACIÓN DE CLIENTES =====\n');
    const clientes = await db.collection('clientes').find({}).toArray();
    
    if (clientes.length === 0) {
      console.log('⚠️  No hay clientes en la BD');
      console.log('\nCrea un cliente primero ejecutando la aplicación.\n');
      return;
    }
    
    console.log(`✓ Total de clientes: ${clientes.length}\n`);
    
    clientes.forEach((cliente, index) => {
      console.log(`Cliente ${index + 1}:`);
      console.log(`  _id: ${cliente._id}`);
      console.log(`  nombre: ${cliente.nombre}`);
      console.log(`  dni: ${cliente.dni}`);
      console.log(`  email: ${cliente.email || 'N/A'}`);
      console.log(`  telefono: ${cliente.telefono || 'N/A'}`);
      console.log(`  estado: ${cliente.estado}`);
      console.log(`  fecha_creacion: ${cliente.fecha_creacion}`);
      console.log();
    });
    
    // Verificar índices
    console.log('\n🔑 ===== VERIFICACIÓN DE ÍNDICES =====\n');
    const indexes = await db.collection('clientes').getIndexes();
    console.log('Índices en colección clientes:');
    Object.keys(indexes).forEach(indexName => {
      const index = indexes[indexName];
      console.log(`  ${indexName}:`, index.key);
    });
    
    // Verificar DNI duplicados
    console.log('\n⚠️  ===== VERIFICACIÓN DE DUPLICADOS =====\n');
    const dnis = clientes.map(c => c.dni);
    const dnisDuplicados = dnis.filter((dni, index) => dnis.indexOf(dni) !== index);
    
    if (dnisDuplicados.length > 0) {
      console.log(`❌ Se encontraron DNIs duplicados: ${[...new Set(dnisDuplicados)].join(', ')}`);
    } else {
      console.log('✓ No hay DNIs duplicados');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoClient.close();
    console.log('\n✓ Conexión cerrada\n');
  }
}

verificarBD();
