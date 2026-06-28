const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;

// Mercado Libre hosts
const ML_API_HOST = 'api.mercadolibre.com';
const ML_AUTH_HOST = 'auth.mercadolibre.com';

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
};

// Build target host and path from request URL
function buildTargetUrl(req) {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (reqUrl.pathname.startsWith('/api/ml')) {
    const path = reqUrl.pathname.replace('/api/ml', '') + reqUrl.search;
    return { host: ML_API_HOST, path };
  } else if (reqUrl.pathname.startsWith('/auth/ml')) {
    const path = reqUrl.pathname.replace('/auth/ml', '') + reqUrl.search;
    return { host: ML_AUTH_HOST, path };
  }

  return null;
}

// Forward request to ML API
function proxyRequest(target, req, res) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: target.host,
      port: 443,
      path: target.path,
      method: req.method,
      headers: {
        'User-Agent': 'ML-API-Proxy/1.0',
      },
    };

    // Forward Authorization header
    if (req.headers.authorization) {
      options.headers['Authorization'] = req.headers.authorization;
    }

    // Forward Content-Type for POST/PUT
    if (req.headers['content-type']) {
      options.headers['Content-Type'] = req.headers['content-type'];
    }
    if (req.headers['content-length']) {
      options.headers['Content-Length'] = req.headers['content-length'];
    }

    const proxyReq = https.request(options, (proxyRes) => {
      let body = '';
      proxyRes.on('data', (chunk) => { body += chunk; });
      proxyRes.on('end', () => {
        const responseHeaders = { ...CORS_HEADERS };
        res.writeHead(proxyRes.statusCode, responseHeaders);
        res.end(body);
        resolve();
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({
        error: 'proxy_error',
        message: 'Failed to reach Mercado Libre API',
        detail: err.message,
      }));
      reject(err);
    });

    // Forward request body (for POST/PUT)
    if (req.method === 'POST' || req.method === 'PUT') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  });
}

// Create server
const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Health check
  if (reqUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Build target URL
  const target = buildTargetUrl(req);
  if (!target) {
    res.writeHead(404, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({
      error: 'not_found',
      message: 'Use /api/ml/* for ML API or /auth/ml/* for auth endpoints',
    }));
    return;
  }

  // Forward request
  proxyRequest(target, req, res).catch((err) => {
    console.error('Request failed:', err.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ML API Proxy server running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  /api/ml/*   -> https://api.mercadolibre.com/*`);
  console.log(`  /auth/ml/*  -> https://auth.mercadolibre.com/*`);
  console.log(`  /health     -> health check`);
});
