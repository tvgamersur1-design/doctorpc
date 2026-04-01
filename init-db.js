/**
 * SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS MONGODB
 * Este script crea las colecciones, índices e inserta datos iniciales
 * 
 * USO: node init-db.js
 * NOTA: Requiere MONGODB_URI en .env
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'doctorpc';

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI no está configurado en .env');
  process.exit(1);
}

async function initializeDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    // Conectar a MongoDB
    console.log('🔗 Conectando a MongoDB Atlas...');
    await client.connect();
    console.log('✓ Conectado exitosamente');

    const db = client.db(DB_NAME);

    // ============ LIMPIAR COLECCIONES EXISTENTES ============
    console.log('\n🗑️  Limpiando colecciones existentes...');
    await db.collection('clientes').deleteMany({});
    await db.collection('equipos').deleteMany({});
    await db.collection('servicios').deleteMany({});
    await db.collection('servicio_equipo').deleteMany({});
    console.log('✓ Colecciones limpiadas');

    // ============ CREAR COLECCIONES ============
    console.log('\n📦 Creando colecciones...');

    // Colección: clientes
    await createCollection(db, 'clientes');
    console.log('✓ Colección clientes creada');

    // Colección: equipos
    await createCollection(db, 'equipos');
    console.log('✓ Colección equipos creada');

    // Colección: servicios
    await createCollection(db, 'servicios');
    console.log('✓ Colección servicios creada');

    // Colección: servicio_equipo
    await createCollection(db, 'servicio_equipo');
    console.log('✓ Colección servicio_equipo creada');

    // ============ CREAR ÍNDICES ============
    console.log('\n🔑 Creando índices...');

    // Índices para clientes
    await db.collection('clientes').createIndex({ dni: 1 }, { unique: true });
    await db.collection('clientes').createIndex({ email: 1 });
    await db.collection('clientes').createIndex({ estado: 1 });
    await db.collection('clientes').createIndex({ fecha_creacion: -1 });
    console.log('✓ Índices de clientes creados');

    // Índices para equipos
    await db.collection('equipos').createIndex({ cliente_id: 1 });
    await db.collection('equipos').createIndex({ numero_serie: 1 }, { unique: true });
    await db.collection('equipos').createIndex({ estado: 1 });
    await db.collection('equipos').createIndex({ tipo_equipo: 1 });
    await db.collection('equipos').createIndex({ fecha_creacion: -1 });
    console.log('✓ Índices de equipos creados');

    // Índices para servicios
    await db.collection('servicios').createIndex({ categoria: 1 });
    await db.collection('servicios').createIndex({ estado: 1 });
    await db.collection('servicios').createIndex({ fecha_creacion: -1 });
    console.log('✓ Índices de servicios creados');

    // Índices para servicio_equipo
    await db.collection('servicio_equipo').createIndex({ cliente_id: 1 });
    await db.collection('servicio_equipo').createIndex({ equipo_id: 1 });
    await db.collection('servicio_equipo').createIndex({ servicio_id: 1 });
    await db.collection('servicio_equipo').createIndex({ numero_orden: 1 }, { unique: true });
    await db.collection('servicio_equipo').createIndex({ estado: 1 });
    await db.collection('servicio_equipo').createIndex({ prioridad: 1 });
    await db.collection('servicio_equipo').createIndex({ fecha_inicio: -1 });
    await db.collection('servicio_equipo').createIndex({ tecnico_asignado: 1 });
    await db.collection('servicio_equipo').createIndex({ estado: 1, fecha_creacion: -1 });
    await db.collection('servicio_equipo').createIndex({ cliente_id: 1, estado: 1 });
    console.log('✓ Índices de servicio_equipo creados');

    // ============ INSERTAR DATOS INICIALES ============
    console.log('\n📝 Insertando datos iniciales...');

    // Datos de clientes (IDs formato: C001, C002, C003...)
    const clientesData = [
      {
        id: 'C001',
        nombre: 'Juan',
        apellido_paterno: 'García',
        apellido_materno: 'López',
        dni: '12345678',
        email: 'juan.garcia@email.com',
        telefono: '987654321',
        telefono_secundario: '981234567',
        direccion: 'Av. Principal 123, Apt 4B',
        ciudad: 'Lima',
        distrito: 'San Isidro',
        empresa: 'Tech Solutions Peru',
        cargo: 'Gerente de TI',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        estado: 'activo',
        notas: 'Cliente VIP - Prioridad alta'
      },
      {
        id: 'C002',
        nombre: 'María',
        apellido_paterno: 'Rodríguez',
        apellido_materno: 'Martinez',
        dni: '87654321',
        email: 'maria.rodriguez@email.com',
        telefono: '956789123',
        telefono_secundario: '912345678',
        direccion: 'Calle Los Pinos 456',
        ciudad: 'Lima',
        distrito: 'Miraflores',
        empresa: 'Consultora ABC',
        cargo: 'Directora de Sistemas',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        estado: 'activo',
        notas: 'Contrato anual de mantenimiento'
      },
      {
        id: 'C003',
        nombre: 'Carlos',
        apellido_paterno: 'Pérez',
        apellido_materno: 'Sánchez',
        dni: '11223344',
        email: 'carlos.perez@email.com',
        telefono: '923456789',
        telefono_secundario: null,
        direccion: 'Jr. Comercio 789',
        ciudad: 'Lima',
        distrito: 'La Victoria',
        empresa: 'Empresa Propia',
        cargo: 'Propietario',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        estado: 'activo',
        notas: 'Cliente recurrente'
      }
    ];

    await db.collection('clientes').insertMany(clientesData);
    console.log(`✓ ${clientesData.length} clientes insertados`);

    // Datos de equipos (IDs formato: E001, E002, E003...)
    const equiposData = [
      {
        id: 'E001',
        cliente_id: 'C001',
        tipo_equipo: 'laptop',
        marca: 'Dell',
        modelo: 'Latitude 5520',
        numero_serie: 'SN001',
        descripcion: 'Laptop corporativa para trabajo diario',
        especificaciones: {
          procesador: 'Intel Core i7 12th Gen',
          memoria_ram: '16GB DDR4',
          almacenamiento: '512GB SSD',
          sistema_operativo: 'Windows 11 Pro',
          edad_equipo: '2 años'
        },
        estado: 'operativo',
        fecha_compra: '2022-03-10T00:00:00Z',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        ubicacion: 'Oficina Gerencia',
        responsable: 'Juan García',
        notas: 'Requiere actualización de drivers'
      },
      {
        id: 'E002',
        cliente_id: 'C001',
        tipo_equipo: 'desktop',
        marca: 'HP',
        modelo: 'EliteDesk 800',
        numero_serie: 'SN002',
        descripcion: 'Computadora de escritorio para oficina',
        especificaciones: {
          procesador: 'Intel Core i5 10th Gen',
          memoria_ram: '8GB DDR4',
          almacenamiento: '256GB SSD',
          sistema_operativo: 'Windows 10 Pro',
          edad_equipo: '3 años'
        },
        estado: 'operativo',
        fecha_compra: '2021-06-15T00:00:00Z',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        ubicacion: 'Área de Contabilidad',
        responsable: 'Personal Administrativo',
        notas: 'Requiere limpieza de polvo'
      },
      {
        id: 'E003',
        cliente_id: 'C002',
        tipo_equipo: 'impresora',
        marca: 'Canon',
        modelo: 'imageRUNNER 2520',
        numero_serie: 'SN003',
        descripcion: 'Impresora multifunción a color',
        especificaciones: {
          procesador: 'N/A',
          memoria_ram: '2GB',
          almacenamiento: 'N/A',
          sistema_operativo: 'N/A',
          edad_equipo: '1 año'
        },
        estado: 'falla',
        fecha_compra: '2023-03-01T00:00:00Z',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        ubicacion: 'Departamento de Comunicaciones',
        responsable: 'Jefe de Área',
        notas: 'Problema con módulo de escaneo'
      }
    ];

    await db.collection('equipos').insertMany(equiposData);
    console.log(`✓ ${equiposData.length} equipos insertados`);

    // Datos de servicios (IDs formato: S001, S002, S003...)
    const serviciosData = [
      {
        id: 'S001',
        nombre_servicio: 'Diagnóstico Completo',
        descripcion: 'Evaluación exhaustiva de hardware y software',
        categoria: 'diagnóstico',
        costo_base: 50,
        tiempo_estimado: 1.5,
        estado: 'activo',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        notas: 'Incluye reporte detallado'
      },
      {
        id: 'S002',
        nombre_servicio: 'Reparación de Hardware',
        descripcion: 'Reparación de componentes defectuosos',
        categoria: 'reparación',
        costo_base: 100,
        tiempo_estimado: 3,
        estado: 'activo',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        notas: 'No incluye repuestos'
      },
      {
        id: 'S003',
        nombre_servicio: 'Mantenimiento Preventivo',
        descripcion: 'Limpieza, actualización de SO y drivers',
        categoria: 'mantenimiento',
        costo_base: 75,
        tiempo_estimado: 2,
        estado: 'activo',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        notas: 'Incluye respaldo de datos'
      },
      {
        id: 'S004',
        nombre_servicio: 'Instalación de Software',
        descripcion: 'Instalación y configuración de aplicaciones',
        categoria: 'instalación',
        costo_base: 40,
        tiempo_estimado: 1,
        estado: 'activo',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        notas: 'Costo adicional si requiere licencias'
      },
      {
        id: 'S005',
        nombre_servicio: 'Consultoría Técnica',
        descripcion: 'Asesoría sobre infraestructura y tecnología',
        categoria: 'consultoría',
        costo_base: 150,
        tiempo_estimado: 2,
        estado: 'activo',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        notas: 'Requiere coordinación previa'
      }
    ];

    await db.collection('servicios').insertMany(serviciosData);
    console.log(`✓ ${serviciosData.length} servicios insertados`);

    // Datos de servicio_equipo (órdenes de servicio, IDs formato: OS001, OS002...)
    const servicioEquipoData = [
      {
        id: 'OS001',
        cliente_id: 'C001',
        equipo_id: 'E001',
        servicio_id: 'S001',
        numero_orden: 'ORD-2024-0001',
        descripcion_problema: 'Laptop no enciende, posible problema con batería',
        observaciones_tecnicas: 'Se detectó falla en el circuito de carga',
        fecha_inicio: new Date().toISOString(),
        fecha_final_estimada: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        fecha_cierre: null,
        estado: 'en_progreso',
        prioridad: 'alta',
        costo_final: null,
        costo_adicional: 0,
        tecnico_asignado: 'Carlos Mendez',
        repuestos_utilizados: [
          {
            nombre: 'Batería Lithium 52.5Wh',
            costo: 150,
            cantidad: 1
          }
        ],
        diagnostico: 'Batería agotada y circuito de carga dañado',
        solucion_aplicada: null,
        feedback_cliente: null,
        calificacion: null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      },
      {
        id: 'OS002',
        cliente_id: 'C002',
        equipo_id: 'E003',
        servicio_id: 'S002',
        numero_orden: 'ORD-2024-0002',
        descripcion_problema: 'Impresora no escanea documentos correctamente',
        observaciones_tecnicas: 'Módulo de escaneo con problema de calibración',
        fecha_inicio: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        fecha_final_estimada: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        fecha_cierre: null,
        estado: 'en_progreso',
        prioridad: 'media',
        costo_final: null,
        costo_adicional: 50,
        tecnico_asignado: 'Ana Silva',
        repuestos_utilizados: [],
        diagnostico: 'Sensor de escaneo requiere calibración',
        solucion_aplicada: null,
        feedback_cliente: null,
        calificacion: null,
        fecha_creacion: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        fecha_actualizacion: new Date().toISOString()
      },
      {
        id: 'OS003',
        cliente_id: 'C001',
        equipo_id: 'E002',
        servicio_id: 'S004',
        numero_orden: 'ORD-2024-0003',
        descripcion_problema: 'Necesita instalación de software contable',
        observaciones_tecnicas: 'Cliente requiere capacitación básica',
        fecha_inicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        fecha_final_estimada: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        fecha_cierre: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        estado: 'completado',
        prioridad: 'media',
        costo_final: 40,
        costo_adicional: 0,
        tecnico_asignado: 'Roberto López',
        repuestos_utilizados: [],
        diagnostico: 'Requerimiento de instalación',
        solucion_aplicada: 'Software instalado y configurado correctamente. Capacitación básica proporcionada.',
        feedback_cliente: 'Excelente trabajo, muy profesional',
        calificacion: 5,
        fecha_creacion: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        fecha_actualizacion: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    await db.collection('servicio_equipo').insertMany(servicioEquipoData);
    console.log(`✓ ${servicioEquipoData.length} órdenes de servicio insertadas`);

    // ============ RESUMEN ============
    console.log('\n');
    console.log('═'.repeat(50));
    console.log('✅ BASE DE DATOS INICIALIZADA EXITOSAMENTE');
    console.log('═'.repeat(50));
    console.log('\n📊 Resumen:');
    console.log(`  • Clientes:           ${clientesData.length}`);
    console.log(`  • Equipos:            ${equiposData.length}`);
    console.log(`  • Servicios:          ${serviciosData.length}`);
    console.log(`  • Órdenes de Servicio: ${servicioEquipoData.length}`);
    console.log('\n📚 Base de datos: doctorpc');
    console.log('🔗 Conexión: MongoDB Atlas\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

/**
 * Crear colección si no existe
 */
async function createCollection(db, collectionName) {
  const collections = await db.listCollections().toArray();
  const exists = collections.some(col => col.name === collectionName);
  
  if (!exists) {
    await db.createCollection(collectionName);
  }
}

// Ejecutar inicialización
initializeDatabase();
