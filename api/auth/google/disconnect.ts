import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const CIPHER_ALGORITHM = 'aes-256-gcm';
const KDF_SALT = 'veripay_gmail_oauth_token_kdf_salt_v1';

function resolveEncryptionKey(): Buffer {
  const secret =
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'veripay_default_sec_encryption_key_32b!';
  return crypto.scryptSync(secret, KDF_SALT, 32);
}

function decryptToken(encryptedPayload: string): string {
  if (!encryptedPayload) {
    throw new Error('Encrypted payload cannot be empty.');
  }
  const parts = encryptedPayload.split(':');
  if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new Error('Unsupported or corrupted token ciphertext format.');
  }

  const iv = Buffer.from(parts[2], 'hex');
  const authTag = Buffer.from(parts[3], 'hex');
  const ciphertext = Buffer.from(parts[4], 'hex');

  const key = resolveEncryptionKey();
  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

function getServerSupabaseClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!url || !serviceKey) {
    throw new Error('Supabase configuration is missing on the server.');
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, Accept, X-Requested-With'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.end(JSON.stringify(data));
}

async function hashSecret(secret: string): Promise<string> {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

async function authenticateAndVerifyProjectAccess(
  req: IncomingMessage,
  projectId: string,
  explicitToken?: string
): Promise<{ isAuthorized: boolean; userId?: string; error?: string }> {
  if (!projectId) {
    return { isAuthorized: false, error: 'Target project_id is required.' };
  }

  const authHeader = req.headers['authorization'] || '';
  let token = explicitToken || '';
  if (!token && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace(/^Bearer\s+/, '').trim();
  }

  if (!token) {
    return {
      isAuthorized: false,
      error: 'Unauthorized: Authentication token or Bearer header is required.'
    };
  }

  const serverSupabase = getServerSupabaseClient();

  // If token is a project-scoped API key (vpay_live_... / vpay_test_...)
  if (token.startsWith('vpay_')) {
    const secretHash = await hashSecret(token);
    const { data: keyRecord } = await serverSupabase
      .from('project_api_keys')
      .select('id, project_id, scopes, revoked_at, expires_at')
      .eq('secret_hash', secretHash)
      .maybeSingle();

    if (
      keyRecord &&
      keyRecord.project_id === projectId &&
      !keyRecord.revoked_at &&
      (!keyRecord.expires_at || new Date(keyRecord.expires_at).getTime() > Date.now())
    ) {
      return { isAuthorized: true };
    }

    return {
      isAuthorized: false,
      error: 'Forbidden: Invalid, revoked, or unauthorized project API key.'
    };
  }

  // Supabase Auth JWT token verification
  try {
    const { data: { user }, error: userErr } = await serverSupabase.auth.getUser(token);
    if (userErr || !user) {
      return {
        isAuthorized: false,
        error: 'Unauthorized: Invalid or expired Supabase user session token.'
      };
    }

    // Check project ownership
    const { data: project } = await serverSupabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .maybeSingle();

    if (project && project.owner_id === user.id) {
      return { isAuthorized: true, userId: user.id };
    }

    // Check project membership
    const { data: membership } = await serverSupabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership) {
      return { isAuthorized: true, userId: user.id };
    }

    return {
      isAuthorized: false,
      error: 'Forbidden: You are not authorized to manage this project.'
    };
  } catch (err: any) {
    return {
      isAuthorized: false,
      error: err?.message || 'Authentication error verifying project access.'
    };
  }
}

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // CORS Preflight
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

  try {
    const body = await parseJsonBody(req);
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const projectId =
      body.projectId ||
      body.project_id ||
      urlObj.searchParams.get('project_id') ||
      '';

    const authCheck = await authenticateAndVerifyProjectAccess(req, projectId);
    if (!authCheck.isAuthorized) {
      sendJson(res, 403, { error: authCheck.error || 'Unauthorized to disconnect this project.' });
      return;
    }

    const serverSupabase = getServerSupabaseClient();

    // 1. Fetch current connection record
    const { data: connection } = await serverSupabase
      .from('gmail_connections')
      .select('id, email, encrypted_refresh_token, encrypted_access_token')
      .eq('project_id', projectId)
      .maybeSingle();

    // 2. Best-effort Google token revocation
    if (connection) {
      let rawTokenToRevoke = '';
      try {
        if (connection.encrypted_refresh_token) {
          rawTokenToRevoke = decryptToken(connection.encrypted_refresh_token);
        } else if (connection.encrypted_access_token) {
          rawTokenToRevoke = decryptToken(connection.encrypted_access_token);
        }
      } catch (decErr) {
        // Safe ignore: if decryption fails (e.g. key changed), proceed with database disconnection
      }

      if (rawTokenToRevoke) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(rawTokenToRevoke)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
        } catch {
          // Non-blocking: Google token may already be expired or revoked
        }
      }

      // 3. Clear sensitive token material and update status
      const now = new Date().toISOString();
      await serverSupabase
        .from('gmail_connections')
        .update({
          status: 'disconnected',
          encrypted_access_token: null,
          encrypted_refresh_token: null,
          token_expires_at: null,
          updated_at: now
        })
        .eq('project_id', projectId);

      // 4. Record audit log
      await serverSupabase.from('audit_logs').insert({
        project_id: projectId,
        action: 'gmail_connection.disconnected',
        details: {
          previousEmail: connection.email,
          timestamp: now
        }
      });

      console.log(`[Google OAuth Disconnect] Project ${projectId} disconnected successfully.`);
    }

    sendJson(res, 200, {
      success: true,
      status: 'disconnected',
      message: 'Gmail connection disconnected successfully.'
    });
  } catch (err: any) {
    console.error('[Google OAuth Disconnect] Exception in disconnect endpoint:', err);
    sendJson(res, 500, { error: err?.message || 'Internal server error disconnecting Gmail.' });
  }
}
