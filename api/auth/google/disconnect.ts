import type { IncomingMessage, ServerResponse } from 'http';
import { handleGoogleOAuthDisconnect } from '../../../src/server/googleOAuth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await handleGoogleOAuthDisconnect(req, res);
}
