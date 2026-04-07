// Cargar variables de entorno
require('dotenv').config();

const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

let cachedClient = null;

function getCloudinaryConfig() {
  if (cachedClient) {
    return cachedClient;
  }

  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Variables de Cloudinary no configuradas (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
  }

  cachedClient = { cloud_name, api_key, api_secret };
  return cachedClient;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const config = getCloudinaryConfig();

    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'JSON inválido en el body' })
        };
      }
    }

    const { imagen, carpeta } = body;

    if (!imagen) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El campo "imagen" es requerido' })
      };
    }

    if (!carpeta) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El campo "carpeta" es requerido' })
      };
    }

    // Validar tamaño máximo de 5MB en base64
    const maxSize = 5 * 1024 * 1024;
    if (Buffer.byteLength(imagen, 'utf8') > maxSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'La imagen excede el tamaño máximo de 5MB' })
      };
    }

    const folder = `doctorpc/${carpeta}`;
    const timestamp = Math.floor(Date.now() / 1000);

    console.log(`[upload-imagen] POST: Subiendo imagen a carpeta=${folder}`);

    // Generar firma SHA1: folder=doctorpc/{carpeta}&timestamp={timestamp}{api_secret}
    const signatureString = `folder=${folder}&timestamp=${timestamp}${config.api_secret}`;
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

    // Preparar data URI si no tiene prefijo
    const fileData = imagen.startsWith('data:') ? imagen : `data:image/png;base64,${imagen}`;

    // Enviar como multipart form
    const formData = new FormData();
    formData.append('file', fileData);
    formData.append('api_key', config.api_key);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloud_name}/image/upload`;

    const response = await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    console.log(`[upload-imagen] ✓ Imagen subida: ${response.data.public_id}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        url: response.data.secure_url,
        public_id: response.data.public_id
      })
    };

  } catch (error) {
    console.error('[upload-imagen] ❌ Error:', error.message);
    console.error('[upload-imagen] Stack:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Internal Server Error',
        type: error.constructor.name
      })
    };
  }
};
