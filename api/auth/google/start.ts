import type { IncomingMessage, ServerResponse } from 'http';
import { handleGoogleOAuthStart } from '../../../src/server/googleOAuth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  await handleGoogleOAuthStart(req, res, urlObj);
}
