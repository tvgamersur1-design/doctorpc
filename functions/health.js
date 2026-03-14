exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'OK',
      mongodb_uri: process.env.MONGODB_URI ? '✓ Configurado' : '✗ NO CONFIGURADO',
      decolecta_key: process.env.DECOLECTA_API_KEY ? '✓ Configurado' : '✗ NO CONFIGURADO',
      timestamp: new Date().toISOString()
    })
  };
};
