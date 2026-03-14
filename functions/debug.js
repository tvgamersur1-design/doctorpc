exports.handler = async (event, context) => {
  console.log('=== DEBUG INFO ===');
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Env vars:', {
    MONGODB_URI: process.env.MONGODB_URI ? '✓ EXISTS (length: ' + process.env.MONGODB_URI.length + ')' : '✗ MISSING',
    DECOLECTA_API_KEY: process.env.DECOLECTA_API_KEY ? '✓ EXISTS' : '✗ MISSING',
    NODE_ENV: process.env.NODE_ENV || 'undefined'
  });
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'OK',
      mongodb_configured: !!process.env.MONGODB_URI,
      decolecta_configured: !!process.env.DECOLECTA_API_KEY,
      mongodb_uri_length: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
      timestamp: new Date().toISOString()
    })
  };
};
