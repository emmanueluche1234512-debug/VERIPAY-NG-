import type { IncomingMessage, ServerResponse } from 'http';
import { handleGoogleOAuthCallback } from '../../../src/server/googleOAuth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  await handleGoogleOAuthCallback(req, res, urlObj);
}
