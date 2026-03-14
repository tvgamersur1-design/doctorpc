const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'doctorpc';

async function testPUT() {
  const mongoClient = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Conectando a MongoDB...\n');
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);
    
    // ID del cliente a actualizar
    const clienteId = '69b1f55cb80b1d535e0de387';
    
    console.log(`📋 Buscando cliente con _id: ${clienteId}\n`);
    
    // Paso 1: Verificar que existe
    console.log('Paso 1: Verificar que existe el cliente');
    const cliente = await db.collection('clientes').findOne({ _id: new ObjectId(clienteId) });
    if (!cliente) {
      console.log('❌ Cliente NO encontrado!');
      console.log('\nClientes disponibles:');
      const todos = await db.collection('clientes').find({}).toArray();
      todos.forEach(c => console.log(`  _id: ${c._id}, nombre: ${c.nombre}`));
      return;
    }
    console.log(`✓ Cliente encontrado: ${cliente.nombre}\n`);
    
    // Paso 2: Intentar actualizar
    console.log('Paso 2: Actualizar con PUT');
    const updateData = {
      telefono: '999888777',
      email: 'test@mail.com',
      fecha_actualizacion: new Date().toISOString()
    };
    
    console.log(`   Datos a actualizar:`, updateData);
    
    const result = await db.collection('clientes').findOneAndUpdate(
      { _id: new ObjectId(clienteId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result || !result.value) {
      console.log('❌ UPDATE falló!');
      return;
    }
    
    console.log(`✓ Cliente actualizado: ${result.value.nombre}`);
    console.log(`  telefono: ${result.value.telefono}`);
    console.log(`  email: ${result.value.email}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoClient.close();
    console.log('\n✓ Conexión cerrada');
  }
}

testPUT();
