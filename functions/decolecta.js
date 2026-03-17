const axios = require('axios');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const method = event.httpMethod;
    const path = event.path.replace('/.netlify/functions/decolecta', '');
    const dni = path.split('/')[1];

    // GET /decolecta/:dni
    if (method === 'GET' && dni) {
      // Validar DNI
      if (!dni || !/^\d{8}$/.test(dni)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'DNI inválido. Debe tener 8 dígitos' 
          }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      const decolectaUrl = process.env.DECOLECTA_URL || 'https://api.decolecta.com';
      const apiKey = process.env.DECOLECTA_API_KEY;

      if (!apiKey) {
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'API Key de DECOLECTA no configurado' 
          }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      console.log(`Consultando DECOLECTA: ${decolectaUrl}/v1/reniec/dni?numero=${dni}`);

      const response = await axios.get(`${decolectaUrl}/v1/reniec/dni`, {
        params: { numero: dni },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      const data = response.data.data || response.data;
      
      // Normalizar respuesta al formato esperado por frontend
      const datosNormalizados = {
        success: true,
        document_number: data.document_number || dni,
        first_name: data.first_name || '',
        first_last_name: data.first_last_name || '',
        second_last_name: data.second_last_name || '',
        full_name: data.full_name || `${data.first_last_name} ${data.second_last_name} ${data.first_name}`.trim(),
        nombres: data.first_name || '',
        apellido_paterno: data.first_last_name || '',
        apellido_materno: data.second_last_name || ''
      };

      console.log('Respuesta DECOLECTA normalizada:', datosNormalizados);
      
      return {
        statusCode: 200,
        body: JSON.stringify(datosNormalizados),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Método no soportado' }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Error DECOLECTA:', error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const errorMsg = error.response?.data?.message || error.message || 'Error al consultar DECOLECTA';
    
    return {
      statusCode: statusCode,
      body: JSON.stringify({ error: errorMsg }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
