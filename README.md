# 🖥️ Doctor PC - Sistema de Administración

Sistema web completo para gestión de servicios técnicos de reparación de equipos informáticos.

## 📋 Descripción

Doctor PC es una aplicación web full-stack diseñada para talleres de reparación de computadoras. Permite gestionar clientes, equipos, servicios técnicos y generar reportes profesionales.

## ✨ Características Principales

- 🔐 **Autenticación JWT** con roles (admin/usuario)
- 👥 **Gestión de Clientes** con soft delete
- 💻 **Gestión de Equipos** (laptops, desktops, tablets)
- 🔧 **Órdenes de Servicio** con seguimiento de estados
- 📊 **Diagnósticos Técnicos** detallados
- 📄 **Generación de Reportes PDF** (solo en desarrollo local)
- 📱 **Diseño Responsive** para móviles y tablets
- 🔍 **Búsqueda y Filtros** avanzados
- 📈 **Estados de Servicio** (Pendiente, En diagnóstico, En reparación, Completado, etc.)

## 🛠️ Tecnologías

### Backend
- Node.js + Express
- MongoDB Atlas (base de datos en la nube)
- JWT para autenticación
- bcryptjs para encriptación de contraseñas

### Frontend
- HTML5, CSS3, JavaScript vanilla
- Font Awesome para iconos
- Diseño responsive con CSS Grid y Flexbox

### Deployment
- Netlify (Serverless Functions)
- MongoDB Atlas (Database)

## 📦 Instalación Local

### Prerrequisitos
- Node.js 18.x o superior
- Cuenta en MongoDB Atlas
- Git

### Pasos

1. Clonar el repositorio:
```bash
git clone <tu-repositorio>
cd doctorpc
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:
```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/
JWT_SECRET=tu_secreto_jwt_seguro
ADMIN_PASSWORD=tu_password_admin
ALLOWED_ORIGINS=http://localhost:3000
```

4. Inicializar la base de datos (opcional):
```bash
node init-db.js
```

5. Ejecutar en desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🚀 Deployment en Netlify

### Configuración

1. Conecta tu repositorio a Netlify
2. Configura las variables de entorno en Netlify:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `ADMIN_PASSWORD`
   - `ALLOWED_ORIGINS`

3. Build settings:
   - Build command: `npm install`
   - Publish directory: `public`
   - Functions directory: `functions`

### ✅ Generación de PDF

**Solución implementada con Puppeteer:**
- ✅ Funciona en Netlify usando `@sparticuz/chromium`
- ✅ Genera PDFs profesionales desde HTML
- ✅ Sin dependencias de jsPDF en el servidor
- ⚡ Puede tardar 3-5 segundos en la primera ejecución (cold start)

**Nota:** La primera vez que se genera un PDF después de un periodo de inactividad puede tardar más debido al cold start de Netlify Functions.

### ⚠️ WhatsApp (En Desarrollo)

- 🚧 La integración con WhatsApp Cloud API está en desarrollo
- ⚠️ Requiere configuración adicional de credenciales
- 📝 Variables necesarias: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_BUSINESS_ID`

## 📁 Estructura del Proyecto

```
doctorpc/
├── functions/              # Netlify Serverless Functions
│   ├── auth.js            # Autenticación
│   ├── clientes.js        # CRUD clientes
│   ├── equipos.js         # CRUD equipos
│   ├── servicios.js       # CRUD servicios
│   ├── servicio-equipo.js # Órdenes de servicio
│   └── usuarios.js        # Gestión usuarios
├── public/                # Frontend estático
│   ├── dashboard.html     # Interfaz principal
│   ├── app.js            # Lógica del cliente
│   ├── style.css         # Estilos principales
│   └── reporte.js        # Generación de reportes
├── diagramas/            # Diagramas de arquitectura
├── .env.example          # Plantilla de variables
├── netlify.toml          # Configuración Netlify
├── package.json          # Dependencias
└── server.js             # Servidor local (dev)
```

## 🔑 Credenciales por Defecto

Usuario administrador inicial:
- **Usuario:** `admin`
- **Contraseña:** (definida en `ADMIN_PASSWORD` del `.env`)

## 🎯 Funcionalidades Detalladas

### Gestión de Clientes
- Registro con DNI único
- Búsqueda por DNI, nombre, teléfono
- Soft delete (los clientes eliminados se pueden restaurar)
- Solo administradores pueden ver clientes eliminados

### Gestión de Equipos
- Tipos: Laptop, Desktop, Tablet, All-in-One
- Asociación con clientes
- Número de serie único
- Soft delete con restauración

### Órdenes de Servicio
- Número de orden automático (formato: SRV-2026-001)
- Estados: Pendiente, En diagnóstico, En reparación, Completado, Cancelado, Entregado
- Diagnóstico técnico con costos
- Seguimiento de adelantos y pagos
- Observaciones y notas

### Reportes
- Visualización en modal responsive
- Generación de PDF (solo local)
- Información completa: cliente, equipo, diagnóstico, costos

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt (12 rounds)
- Tokens JWT con expiración de 8 horas
- Rate limiting en login (10 intentos por 15 minutos)
- Validación de datos en backend
- CORS configurado
- Índices únicos en MongoDB

## 📱 Responsive Design

- Menú lateral colapsable en móviles
- Tablas con scroll horizontal
- Modales adaptados a pantallas pequeñas
- Botones táctiles optimizados

## 🐛 Troubleshooting

### Error de conexión a MongoDB
```
Error: MONGODB_URI no está configurado
```
Solución: Verifica que `.env` tenga `MONGODB_URI` correctamente configurado

### PDF tarda mucho en generarse
Esto es normal en Netlify debido al "cold start". La primera generación puede tardar 5-10 segundos. Las siguientes serán más rápidas.

### Error al generar PDF en Netlify
```
Error: Failed to launch chrome
```
Solución: Asegúrate de que las dependencias `@sparticuz/chromium` y `puppeteer-core` estén instaladas correctamente.

### Error 429 en login
```
Demasiados intentos fallidos
```
Solución: Espera 15 minutos o reinicia el servidor en desarrollo

## 📄 Licencia

ISC

## 👨‍💻 Autor

Sistema desarrollado para Doctor PC - Soluciones Informáticas Profesionales

---

**Nota:** Este sistema está optimizado para deployment en Netlify con MongoDB Atlas. Para producción con generación de PDF, considera usar un servidor Node.js tradicional o servicios externos de PDF.
