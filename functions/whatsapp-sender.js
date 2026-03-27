/**
 * Función para enviar PDF por WhatsApp usando WhatsApp Cloud API
 * Requiere configuración en .env:
 * - WHATSAPP_TOKEN: Token de acceso de Meta
 * - WHATSAPP_PHONE_ID: ID del número de teléfono de WhatsApp Business
 * - WHATSAPP_BUSINESS_ID: ID de la cuenta de WhatsApp Business
 */

const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`;

/**
 * Enviar mensaje de texto por WhatsApp
 */
async function enviarMensajeTexto(telefono, mensaje) {
  try {
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: 'whatsapp',
        to: telefono,
        type: 'text',
        text: { body: mensaje }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error al enviar mensaje:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Subir archivo a WhatsApp Cloud API
 */
async function subirArchivo(pdfBuffer, nombreArchivo) {
  try {
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: nombreArchivo,
      contentType: 'application/pdf'
    });
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'application/pdf');
    
    const uploadUrl = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/media`;
    
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        ...formData.getHeaders()
      }
    });
    
    return response.data.id; // Retorna el media_id
  } catch (error) {
    console.error('Error al subir archivo:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Enviar documento PDF por WhatsApp
 */
async function enviarDocumento(telefono, mediaId, caption, nombreArchivo) {
  try {
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: 'whatsapp',
        to: telefono,
        type: 'document',
        document: {
          id: mediaId,
          caption: caption,
          filename: nombreArchivo
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error al enviar documento:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Función principal: Enviar PDF por WhatsApp
 */
async function enviarPDFPorWhatsApp(telefono, pdfBuffer, nombreArchivo, mensaje) {
  try {
    // Validar configuración
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      throw new Error('Configuración de WhatsApp incompleta. Verifica WHATSAPP_TOKEN y WHATSAPP_PHONE_ID en .env');
    }
    
    // Limpiar número de teléfono
    const telefonoLimpio = telefono.replace(/\D/g, '');
    const telefonoCompleto = telefonoLimpio.startsWith('51') ? telefonoLimpio : '51' + telefonoLimpio;
    
    console.log('📤 Subiendo PDF a WhatsApp Cloud...');
    const mediaId = await subirArchivo(pdfBuffer, nombreArchivo);
    
    console.log('📨 Enviando documento por WhatsApp...');
    const resultado = await enviarDocumento(telefonoCompleto, mediaId, mensaje, nombreArchivo);
    
    console.log('✅ PDF enviado exitosamente');
    return {
      success: true,
      messageId: resultado.messages[0].id,
      telefono: telefonoCompleto
    };
    
  } catch (error) {
    console.error('❌ Error al enviar PDF por WhatsApp:', error);
    throw error;
  }
}

module.exports = {
  enviarMensajeTexto,
  enviarPDFPorWhatsApp
};
