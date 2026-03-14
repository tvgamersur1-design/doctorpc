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
    
    const clienteId = '69b1f55cb80b1d535e0de387';
    
    console.log(`📝 Intentando actualizar cliente: ${clienteId}\n`);
    
    // Probar diferentes opciones
    console.log('Opción 1: updateOne (sin returnDocument)');
    const result1 = await db.collection('clientes').updateOne(
      { _id: new ObjectId(clienteId) },
      { $set: { telefono: '999888777' } }
    );
    console.log(`  modifiedCount: ${result1.modifiedCount}`);
    console.log(`  matchedCount: ${result1.matchedCount}`);
    
    console.log('\nOpción 2: findOneAndUpdate (como en el servidor)');
    const result2 = await db.collection('clientes').findOneAndUpdate(
      { _id: new ObjectId(clienteId) },
      { $set: { email: 'test@mail.com' } },
      { returnDocument: 'after' }
    );
    console.log(`  result:`, result2);
    console.log(`  result.value:`, result2.value);
    console.log(`  result.ok:`, result2.ok);
    console.log(`  result.lastErrorObject:`, result2.lastErrorObject);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoClient.close();
  }
}

testPUT();
