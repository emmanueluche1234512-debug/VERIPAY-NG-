import type { IncomingMessage, ServerResponse } from 'http';
import { handleApiRequest } from '../src/server/apiRouter';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const handled = await handleApiRequest(req, res);
  if (!handled && !res.writableEnded) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Endpoint not found.' }));
  }
}
