const { ObjectId } = require('mongodb');

const testIds = [
  '69b1f55cb80b1d535e0de387',
  '507f1f77bcf86cd799439011',
  '507f1f77bcf86cd799439012',
  'C002',
  '12345678',
  'invalid-id'
];

console.log('🧪 Prueba de validación de ObjectId\n');

testIds.forEach(id => {
  const isValid = ObjectId.isValid(id);
  console.log(`ObjectId.isValid('${id}'): ${isValid}`);
  
  if (isValid) {
    try {
      const obj = new ObjectId(id);
      console.log(`  → Convertido a: ${obj}`);
    } catch (error) {
      console.log(`  → Error al convertir: ${error.message}`);
    }
  }
  console.log();
});
