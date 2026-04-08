// Script para crear la colección historial_pagos en MongoDB
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function crearColeccionHistorial() {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI no está configurado en .env');
        process.exit(1);
    }

    console.log('🔌 Conectando a MongoDB...');
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Conectado a MongoDB');

        const db = client.db('doctorpc');
        
        // Verificar si la colección ya existe
        const collections = await db.listCollections({ name: 'historial_pagos' }).toArray();
        
        if (collections.length > 0) {
            console.log('ℹ️  La colección historial_pagos ya existe');
        } else {
            // Crear la colección
            await db.createCollection('historial_pagos');
            console.log('✅ Colección historial_pagos creada');
        }

        // Crear índices para mejorar el rendimiento
        await db.collection('historial_pagos').createIndex({ servicio_id: 1 });
        await db.collection('historial_pagos').createIndex({ cliente_id: 1 });
        await db.collection('historial_pagos').createIndex({ fecha_pago: -1 });
        console.log('✅ Índices creados');

        // Insertar un documento de ejemplo (opcional)
        const ejemplo = {
            servicio_id: "ejemplo_servicio_id",
            numero_servicio: "EJEMPLO-001",
            cliente_id: "ejemplo_cliente_id",
            monto: 0.01,
            metodo_pago: "ejemplo",
            referencia: "Documento de prueba",
            notas: "Este es un documento de ejemplo para verificar que la colección funciona",
            fecha_pago: new Date().toISOString(),
            usuario_registro: "Sistema",
            fecha_creacion: new Date().toISOString()
        };

        const result = await db.collection('historial_pagos').insertOne(ejemplo);
        console.log('✅ Documento de ejemplo insertado con ID:', result.insertedId);

        // Verificar que se puede leer
        const count = await db.collection('historial_pagos').countDocuments();
        console.log(`📊 Total de documentos en historial_pagos: ${count}`);

        console.log('\n✅ ¡Colección historial_pagos lista para usar!');
        console.log('Puedes eliminar el documento de ejemplo desde MongoDB Compass o Atlas');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('🔌 Conexión cerrada');
    }
}

crearColeccionHistorial();
