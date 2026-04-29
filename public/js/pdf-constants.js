/**
 * Constantes Unificadas para Generación de PDF
 * Centraliza colores, tamaños y configuraciones
 */

// ===== PALETA DE COLORES UNIFICADA — IGUAL AL SISTEMA =====
export const COLORES_PDF = {
  // Primarios — exactamente los del sistema (#2192B8 / #1976a2)
  primario:        [33, 146, 184],  // #2192B8
  primarioDark:    [25, 118, 162],  // #1976a2
  primarioLight:   [33, 146, 184],  // mismo, para consistencia
  primarioLighter: [179, 229, 252], // #B3E5FC

  // Secundario más oscuro para jerarquía (tabla headers, total)
  secundario:      [21, 101, 144],  // #156590

  // Texto
  texto:           [51, 51, 51],    // #333333
  textoClaro:      [102, 102, 102], // #666666
  textoMuyClaro:   [153, 153, 153], // #999999
  textoBlanco:     [255, 255, 255], // #FFFFFF

  // Fondos
  fondo:           [255, 255, 255], // #FFFFFF
  fondoClaro:      [245, 247, 250], // #F5F7FA — fondo del sistema
  fondoGris:       [240, 240, 240], // #F0F0F0

  // Acento (TOTAL, badges)
  acento:          [21, 101, 144],  // #156590 — azul oscuro del sistema
};

// ===== TAMAÑOS DE FUENTE =====
export const FUENTES = {
  xs: 6.5,
  sm: 7.5,
  base: 8.5,
  md: 9,
  lg: 10,
  xl: 12,
  xl2: 14,
  xl3: 16,
  xl4: 18
};

// ===== ESPACIADO =====
export const ESPACIADO = {
  xs: 2,
  sm: 4,
  md: 6,
  base: 8,
  lg: 10,
  xl: 12,
  xl2: 16,
  xl3: 20,
  xl4: 24,
  xl5: 30
};

// ===== CONFIGURACIÓN DE PÁGINA =====
export const PAGINA = {
  margen: 20,
  margenReducido: 15,
  anchoA4: 210, // mm
  altoA4: 297   // mm
};

// ===== COLORES DE ESTADO — adaptados a la paleta del sistema =====
export const COLORES_ESTADO = {
  'Pendiente':              [33, 146, 184],  // #2192B8 celeste
  'Pendiente de evaluac':   [33, 146, 184],
  'Pendiente de evaluacion':[33, 146, 184],
  'En diagnostico':         [25, 118, 162],  // #1976a2 azul medio
  'Diagnosticado':          [21, 101, 144],  // #156590 azul oscuro
  'En reparacion':          [33, 146, 184],  // #2192B8 celeste
  'Completado':             [25, 118, 162],  // #1976a2 azul medio
  'Entregado':              [21, 101, 144],  // #156590 azul oscuro
  'Cancelado':              [120, 144, 156], // gris azulado neutro
};

// ===== HELPER: Validar valor con fallback descriptivo =====
export const validarValor = (valor, fallback = 'Sin datos') => {
  if (!valor) return fallback;
  const valorStr = String(valor).trim();
  if (!valorStr || valorStr === 'N/A' || valorStr === 'undefined' || valorStr === 'null' || valorStr === '--------') {
    return fallback;
  }
  return valorStr;
};

// ===== HELPER: Formatear fecha =====
export const formatearFecha = (fecha, opciones = {}) => {
  if (!fecha) return '--------';
  try {
    const d = new Date(fecha);
    const opcionesDefault = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      ...opciones
    };
    return d.toLocaleDateString('es-PE', opcionesDefault);
  } catch (e) {
    return String(fecha);
  }
};

// ===== HELPER: Formatear hora =====
export const formatearHora = (fecha) => {
  if (!fecha) return '';
  try {
    const d = new Date(fecha);
    return d.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return '';
  }
};

// ===== HELPER: Formatear moneda =====
export const formatearMoneda = (monto) => {
  const valor = parseFloat(monto || 0);
  return `S/. ${valor.toFixed(2)}`;
};

// ===== CONFIGURACIÓN DE EMPRESA =====
export const EMPRESA = {
  nombre: 'DOCTOR PC',
  slogan: 'Soluciones Informáticas Profesionales',
  telefono: '961 509 941',
  email: 'contacto@doctorpc.pe',
  ubicacion: 'Lima - Perú',
  logo: '/images/logo-doctorpc.png'
};

// ===== TÉRMINOS Y CONDICIONES =====
export const TERMINOS = [
  'La garantía de 30 días cubre únicamente defectos en mano de obra. No incluye daños por mal uso, golpes, caídas o líquidos derramados.',
  'Los equipos no recogidos en un plazo máximo de 30 días calendario después de la notificación no serán sujeto de reclamo.',
  'Los repuestos reemplazados originales quedan en propiedad de DOCTOR PC salvo acuerdo previo por escrito.',
  'El cliente acepta haber recibido el equipo en las condiciones descritas en el presente documento al momento de firmar.'
];
