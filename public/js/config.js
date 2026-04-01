// ==================== CONFIGURACIÓN GLOBAL ====================

// Detectar si estamos en local o en producción
const isLocal = window.location.hostname === 'localhost';
const API_BASE = isLocal ? 'http://localhost:3000' : window.location.origin;

// Configuración de la aplicación
export const CONFIG = {
    API_BASE: API_BASE,
    
    // Límites y paginación
    MAX_FOTOS_ENTREGA: 3,
    SERVICIOS_POR_PAGINA: 10,
    
    // Opciones de selección
    LOCALES: ['Ferreñafe', 'Chiclayo'],
    
    TIPOS_EQUIPO: ['Laptop', 'Desktop', 'Monitor', 'Impresora', 'Otro'],
    
    ESTADOS_SERVICIO: [
        'Pendiente de evaluación',
        'En diagnóstico',
        'Diagnosticado',
        'En reparación',
        'Completado',
        'Entregado',
        'Cancelado'
    ],
    
    // Problemas comunes (para atajos)
    PROBLEMAS_COMUNES: [
        'No enciende',
        'Pantalla rota',
        'Lento',
        'Teclado dañado',
        'No carga batería',
        'Ventilador ruidoso',
        'Virus/Malware',
        'Sin Internet'
    ]
};

// URLs de API (exportadas individualmente para compatibilidad)
export const API_URL = API_BASE;
export const API_CLIENTES = `${API_BASE}/api/clientes`;
export const API_EQUIPOS = `${API_BASE}/api/equipos`;
export const API_SERVICIOS = `${API_BASE}/api/servicios`;
export const API_SERVICIO_EQUIPO = `${API_BASE}/api/servicio-equipo`;
export const API_DECOLECTA = `${API_BASE}/api/decolecta`;
export const API_USUARIOS = `${API_BASE}/api/usuarios`;
export const API_AUTH = `${API_BASE}/api/auth`;
export const API_UPLOAD = `${API_BASE}/api/upload-imagen`;
export const API_PDF = `${API_BASE}/api/generar-pdf`;
export const API_WHATSAPP = `${API_BASE}/api/enviar-whatsapp-pdf`;

// También exportar como objeto para compatibilidad
export const API = {
    CLIENTES: API_CLIENTES,
    EQUIPOS: API_EQUIPOS,
    SERVICIOS: API_SERVICIOS,
    SERVICIO_EQUIPO: API_SERVICIO_EQUIPO,
    DECOLECTA: API_DECOLECTA,
    USUARIOS: API_USUARIOS,
    AUTH: API_AUTH,
    UPLOAD: API_UPLOAD,
    PDF: API_PDF,
    WHATSAPP: API_WHATSAPP
};

// Iconos por tipo de equipo
export const ICONOS_EQUIPO = {
    'Laptop': 'fas fa-laptop',
    'Desktop': 'fas fa-desktop',
    'Monitor': 'fas fa-tv',
    'Impresora': 'fas fa-print',
    'Otro': 'fas fa-cube'
};

// Colores y estilos por estado
export const ESTILOS_ESTADO = {
    'Pendiente': { bg: '#FFF3CD', color: '#856404', icon: 'fas fa-hourglass-half' },
    'Pendiente de evaluación': { bg: '#FFF3CD', color: '#856404', icon: 'fas fa-hourglass-half' },
    'En diagnóstico': { bg: '#E3F2FD', color: '#1565C0', icon: 'fas fa-stethoscope' },
    'Diagnosticado': { bg: '#D4EDDA', color: '#155724', icon: 'fas fa-check-circle' },
    'En reparación': { bg: '#FFE0B2', color: '#E65100', icon: 'fas fa-tools' },
    'Completado': { bg: '#D4EDDA', color: '#155724', icon: 'fas fa-check-circle' },
    'Entregado': { bg: '#F3E5F5', color: '#6A1B9A', icon: 'fas fa-box-open' },
    'Cancelado': { bg: '#F8D7DA', color: '#721C24', icon: 'fas fa-ban' }
};
