import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_OAUTH_CALLBACK_URL =
  'https://veripay-ng.vercel.app/api/auth/google/callback';

const GMAIL_READONLY_SCOPE =
  'https://www.googleapis.com/auth/gmail.readonly';

const CIPHER_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KDF_SALT = 'veripay_gmail_oauth_token_kdf_salt_v1';

function resolveEncryptionKey(): Buffer {
  const secret =
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'veripay_default_sec_encryption_key_32b!';
  return crypto.scryptSync(secret, KDF_SALT, 32);
}

function encryptToken(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Token string cannot be empty.');
  }
  const key = resolveEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
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

function sendRedirect(res: ServerResponse, location: string) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  try {
    const errorParam = urlObj.searchParams.get('error');
    const state = urlObj.searchParams.get('state');
    const code = urlObj.searchParams.get('code');

    // 1. Check if user or Google denied authorization
    if (errorParam) {
      console.log(`[Google OAuth Callback] User denied or Google reported error: ${errorParam}`);
      sendRedirect(
        res,
        `/merchant-admin?gmail_status=denied&error_msg=${encodeURIComponent(errorParam)}`
      );
      return;
    }

    // 2. Reject missing state
    if (!state) {
      console.warn('[Google OAuth Callback] Callback rejected: missing state token');
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=missing_state&error_msg=Missing+state+parameter'
      );
      return;
    }

    // 3. Reject missing authorization code
    if (!code) {
      console.warn('[Google OAuth Callback] Callback rejected: missing authorization code');
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=missing_code&error_msg=Missing+authorization+code'
      );
      return;
    }

    const serverSupabase = getServerSupabaseClient();

    // 4. Look up state in public.oauth_states
    const { data: stateRecord, error: stateFetchErr } = await serverSupabase
      .from('oauth_states')
      .select('*')
      .eq('state_token', state)
      .maybeSingle();

    if (stateFetchErr || !stateRecord) {
      console.warn('[Google OAuth Callback] Invalid or unrecorded OAuth state received');
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=invalid_state&error_msg=Invalid+OAuth+state'
      );
      return;
    }

    // 5. Verify state has not already been used (Single-use CSRF/Replay protection)
    if (stateRecord.used_at) {
      console.warn('[Google OAuth Callback] Rejected replayed OAuth state token');
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=state_already_used&error_msg=OAuth+state+already+used'
      );
      return;
    }

    // 6. Verify state has not expired
    if (new Date(stateRecord.expires_at).getTime() < Date.now()) {
      console.warn('[Google OAuth Callback] Rejected expired OAuth state token');
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=state_expired&error_msg=OAuth+state+has+expired'
      );
      return;
    }

    // 7. Mark state as used IMMEDIATELY to prevent concurrent replay
    await serverSupabase
      .from('oauth_states')
      .update({ used_at: new Date().toISOString() })
      .eq('id', stateRecord.id);

    // 8. Resolve project_id strictly from the trusted stored OAuth state
    const projectId = stateRecord.project_id;
    console.log(`[Google OAuth Callback] State validated successfully for project ID ${projectId}`);

    // 9. Exchange authorization code with Google OAuth 2.0 token endpoint
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error(
        '[Google OAuth Callback] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET server environment variable'
      );
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=missing_credentials&error_msg=Server+credentials+missing'
      );
      return;
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: GOOGLE_OAUTH_CALLBACK_URL,
        grant_type: 'authorization_code'
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error(
        `[Google OAuth Callback] Token exchange failed with status ${tokenResponse.status}:`,
        errText
      );
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=token_exchange_failed&error_msg=Failed+to+exchange+authorization+code'
      );
      return;
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = Number(tokenData.expires_in) || 3600;

    if (!accessToken) {
      console.error('[Google OAuth Callback] Token endpoint did not return an access_token');
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=no_access_token&error_msg=Google+did+not+return+access+token'
      );
      return;
    }

    // 10. Determine the authenticated Gmail account address using Google's API
    let connectedEmail = '';

    try {
      const profileRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        connectedEmail = (profileData.emailAddress || '').trim().toLowerCase();
      }
    } catch (profileErr: any) {
      console.warn('[Google OAuth Callback] Notice querying Gmail profile:', profileErr?.message);
    }

    // Fallback: If Gmail profile endpoint didn't provide email, try Google userinfo endpoint
    if (!connectedEmail) {
      try {
        const userInfoRes = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          connectedEmail = (userInfo.email || '').trim().toLowerCase();
        }
      } catch (userErr: any) {
        console.warn('[Google OAuth Callback] Notice querying userinfo:', userErr?.message);
      }
    }

    if (!connectedEmail) {
      console.error('[Google OAuth Callback] Could not determine connected Gmail email address');
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=email_resolution_failed&error_msg=Could+not+resolve+Gmail+address'
      );
      return;
    }

    // 11. Encrypt tokens server-side with AES-256-GCM before database write
    let encryptedAccessToken: string;
    let encryptedRefreshToken: string | null = null;

    try {
      encryptedAccessToken = encryptToken(accessToken);
      if (refreshToken) {
        encryptedRefreshToken = encryptToken(refreshToken);
      }
    } catch (cryptErr: any) {
      console.error('[Google OAuth Callback] Token encryption failed safely:', cryptErr?.message);
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=encryption_failure&error_msg=Server+token+encryption+failed'
      );
      return;
    }

    // 12. Check if a Gmail connection already exists for this project
    const { data: existingConn } = await serverSupabase
      .from('gmail_connections')
      .select('id, encrypted_refresh_token')
      .eq('project_id', projectId)
      .maybeSingle();

    // Preserve existing encrypted refresh token if Google did not return a new one on re-auth
    if (!encryptedRefreshToken && existingConn?.encrypted_refresh_token) {
      encryptedRefreshToken = existingConn.encrypted_refresh_token;
    }

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const now = new Date().toISOString();

    if (existingConn) {
      // Safely update/reconnect existing record
      const { error: updateErr } = await serverSupabase
        .from('gmail_connections')
        .update({
          email: connectedEmail,
          status: 'connected',
          encrypted_access_token: encryptedAccessToken,
          encrypted_refresh_token: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          connected_at: now,
          updated_at: now
        })
        .eq('project_id', projectId);

      if (updateErr) {
        console.error(
          '[Google OAuth Callback] Failed to update existing gmail_connections record:',
          updateErr.message
        );
        sendRedirect(
          res,
          '/merchant-admin?gmail_status=error&error_code=db_update_failed&error_msg=Failed+to+update+connection'
        );
        return;
      }
    } else {
      // Insert new record for this project
      const { error: insertErr } = await serverSupabase
        .from('gmail_connections')
        .insert({
          project_id: projectId,
          email: connectedEmail,
          status: 'connected',
          encrypted_access_token: encryptedAccessToken,
          encrypted_refresh_token: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          connected_at: now,
          updated_at: now
        });

      if (insertErr) {
        console.error(
          '[Google OAuth Callback] Failed to insert gmail_connections record:',
          insertErr.message
        );
        sendRedirect(
          res,
          '/merchant-admin?gmail_status=error&error_code=db_insert_failed&error_msg=Failed+to+save+connection'
        );
        return;
      }
    }

    // 13. Audit log for connection event
    await serverSupabase.from('audit_logs').insert({
      project_id: projectId,
      action: 'gmail_connection.connected',
      details: {
        email: connectedEmail,
        scope: GMAIL_READONLY_SCOPE,
        timestamp: now
      }
    });

    console.log(
      `[Google OAuth Callback] Gmail connection updated successfully for project ID ${projectId}`
    );

    // 14. Redirect user back to Merchant Admin with success status
    sendRedirect(res, '/merchant-admin?gmail_status=connected');
  } catch (err: any) {
    console.error('[Google OAuth Callback] Unexpected exception in callback endpoint:', err);
    sendRedirect(
      res,
      '/merchant-admin?gmail_status=error&error_code=internal_error&error_msg=Internal+server+error'
    );
  }
}
