import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname.replace(/\/$/, '');

  // Handle CORS preflight across all fallback /api routes
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Accept, X-Requested-With'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.end();
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: `Endpoint '${pathname}' not found.` }));
}
