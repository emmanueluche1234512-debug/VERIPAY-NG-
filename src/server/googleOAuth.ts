import { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { encryptToken, decryptToken } from './crypto';
import { apiKeysService } from '../services/apiKeys';

/**
 * Standard production Google OAuth Callback URL
 * Configured in Google Cloud Console Credentials.
 */
export const GOOGLE_OAUTH_CALLBACK_URL =
  'https://veripay-ng.vercel.app/api/auth/google/callback';

export const GMAIL_READONLY_SCOPE =
  'https://www.googleapis.com/auth/gmail.readonly';

/**
 * Trusted Server-Side Supabase Client
 * Uses SUPABASE_SERVICE_ROLE_KEY to perform privileged writes
 * on `public.gmail_connections` and `public.oauth_states`.
 */
export function getServerSupabaseClient() {
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

  if (url && serviceKey) {
    return createClient<Database>(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  throw new Error('Supabase configuration is missing on the server.');
}

/**
 * Helper to parse JSON body from incoming HTTP request stream
 */
export async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Helper to send JSON responses with CORS headers
 */
export function sendJson(res: ServerResponse, statusCode: number, data: any) {
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

/**
 * Helper to perform an HTTP 302 redirect
 */
export function sendRedirect(res: ServerResponse, location: string) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end();
}

/**
 * Resolves and verifies the authenticated user/credential and validates
 * that the actor has legitimate owner or member access to `projectId`.
 */
export async function authenticateAndVerifyProjectAccess(
  req: IncomingMessage,
  projectId: string,
  explicitToken?: string
): Promise<{ isAuthorized: boolean; userId?: string; error?: string }> {
  if (!projectId) {
    return { isAuthorized: false, error: 'Target project_id is required.' };
  }

  // 1. Extract Bearer token from header or query string
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

  // 2. Check if token is a project-scoped API key (vpay_live_... / vpay_test_...)
  if (token.startsWith('vpay_')) {
    const keyAuth = await apiKeysService.authenticateToken(token, 'gmail_connection:manage');
    if (keyAuth.isValid && keyAuth.projectId === projectId) {
      return { isAuthorized: true };
    }
    return {
      isAuthorized: false,
      error: keyAuth.error || 'Forbidden: Project API key does not have access to this project.'
    };
  }

  // 3. Otherwise treat as Supabase Auth JWT token
  try {
    const { data: { user }, error: userErr } = await serverSupabase.auth.getUser(token);
    if (userErr || !user) {
      return {
        isAuthorized: false,
        error: 'Unauthorized: Invalid or expired Supabase user session token.'
      };
    }

    // Verify project ownership in `public.projects`
    const { data: project } = await serverSupabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .maybeSingle();

    if (project && project.owner_id === user.id) {
      return { isAuthorized: true, userId: user.id };
    }

    // Verify team membership in `public.project_members`
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

/**
 * Handler for GET /api/auth/google/start
 *
 * 1. Authenticates caller & validates authorized project membership
 * 2. Generates cryptographically secure state token (no Math.random())
 * 3. Binds state to project_id in public.oauth_states with 15-minute expiry
 * 4. Stored redirect_uri is strictly https://veripay-ng.vercel.app/api/auth/google/callback
 * 5. Returns JSON authUrl (if JSON requested) or redirects browser to Google
 */
export async function handleGoogleOAuthStart(
  req: IncomingMessage,
  res: ServerResponse,
  urlObj: URL
) {
  try {
    const projectId = urlObj.searchParams.get('project_id') || '';
    const queryToken =
      urlObj.searchParams.get('token') ||
      urlObj.searchParams.get('access_token') ||
      urlObj.searchParams.get('auth_token') ||
      '';

    const wantsJson =
      req.headers['accept']?.includes('application/json') ||
      urlObj.searchParams.get('format') === 'json';

    // 1. Multi-tenant authorization check
    const authCheck = await authenticateAndVerifyProjectAccess(req, projectId, queryToken);
    if (!authCheck.isAuthorized) {
      if (wantsJson) {
        sendJson(res, 403, { error: authCheck.error || 'Unauthorized' });
      } else {
        sendRedirect(
          res,
          `/merchant-admin?gmail_status=error&error_code=unauthorized&error_msg=${encodeURIComponent(
            authCheck.error || 'Unauthorized'
          )}`
        );
      }
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('[Google OAuth] Missing GOOGLE_CLIENT_ID server environment variable');
      if (wantsJson) {
        sendJson(res, 500, { error: 'Server configuration error: GOOGLE_CLIENT_ID is not configured.' });
      } else {
        sendRedirect(res, '/merchant-admin?gmail_status=error&error_code=missing_client_id');
      }
      return;
    }

    // 2. Generate cryptographically secure random state (32 bytes entropy)
    const stateEntropy = crypto.randomBytes(32).toString('hex');
    const stateToken = `vp_state_${stateEntropy}`;

    // 3. Persist state bound strictly to project_id in public.oauth_states
    const serverSupabase = getServerSupabaseClient();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: stateInsertErr } = await serverSupabase.from('oauth_states').insert({
      state_token: stateToken,
      project_id: projectId,
      redirect_uri: GOOGLE_OAUTH_CALLBACK_URL,
      expires_at: expiresAt,
      used_at: null
    });

    if (stateInsertErr) {
      console.error('[Google OAuth] Failed to persist oauth_state record:', stateInsertErr.message);
      if (wantsJson) {
        sendJson(res, 500, { error: 'Failed to record secure OAuth session state.' });
      } else {
        sendRedirect(res, '/merchant-admin?gmail_status=error&error_code=state_storage_failed');
      }
      return;
    }

    console.log(`[Google OAuth] OAuth state initialized for project ID ${projectId}`);

    // 4. Construct Google OAuth 2.0 authorization URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', GOOGLE_OAUTH_CALLBACK_URL);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', GMAIL_READONLY_SCOPE);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');
    googleAuthUrl.searchParams.set('state', stateToken);

    if (wantsJson) {
      sendJson(res, 200, {
        success: true,
        authUrl: googleAuthUrl.toString(),
        state: stateToken
      });
    } else {
      sendRedirect(res, googleAuthUrl.toString());
    }
  } catch (err: any) {
    console.error('[Google OAuth] Exception in start endpoint:', err);
    sendJson(res, 500, { error: err?.message || 'Internal server error starting Google OAuth.' });
  }
}

/**
 * Handler for GET /api/auth/google/callback
 *
 * 1. Validates presence of `state` and `code`
 * 2. Handles user-denied authorization gracefully
 * 3. Enforces single-use & expiration on public.oauth_states
 * 4. Resolves trusted project_id from validated state
 * 5. Exchanges code server-side for access and refresh tokens
 * 6. Fetches connected Gmail address from Gmail API (users/me/profile)
 * 7. Encrypts tokens with AES-256-GCM using GMAIL_TOKEN_ENCRYPTION_KEY
 * 8. Upserts project's row in public.gmail_connections (status: connected)
 * 9. Preserves existing encrypted refresh token if Google does not return a new one
 * 10. Redirects browser back to /merchant-admin with safe status
 */
export async function handleGoogleOAuthCallback(
  req: IncomingMessage,
  res: ServerResponse,
  urlObj: URL
) {
  try {
    const errorParam = urlObj.searchParams.get('error');
    const state = urlObj.searchParams.get('state');
    const code = urlObj.searchParams.get('code');

    // 1. Check if user or Google denied authorization
    if (errorParam) {
      console.log(`[Google OAuth] User denied or Google reported error: ${errorParam}`);
      sendRedirect(
        res,
        `/merchant-admin?gmail_status=denied&error_msg=${encodeURIComponent(errorParam)}`
      );
      return;
    }

    // 2. Reject missing state
    if (!state) {
      console.warn('[Google OAuth] Callback rejected: missing state token');
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=missing_state&error_msg=Missing+state+parameter'
      );
      return;
    }

    // 3. Reject missing authorization code
    if (!code) {
      console.warn('[Google OAuth] Callback rejected: missing authorization code');
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
      console.warn('[Google OAuth] Invalid or unrecorded OAuth state received');
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=invalid_state&error_msg=Invalid+OAuth+state'
      );
      return;
    }

    // 5. Verify state has not already been used (Single-use CSRF/Replay protection)
    if (stateRecord.used_at) {
      console.warn('[Google OAuth] Rejected replayed OAuth state token');
      sendRedirect(
        res,
        '/merchant-admin?gmail_status=error&error_code=state_already_used&error_msg=OAuth+state+already+used'
      );
      return;
    }

    // 6. Verify state has not expired
    if (new Date(stateRecord.expires_at).getTime() < Date.now()) {
      console.warn('[Google OAuth] Rejected expired OAuth state token');
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
    console.log(`[Google OAuth] State validated successfully for project ID ${projectId}`);

    // 9. Exchange authorization code with Google OAuth 2.0 token endpoint
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error(
        '[Google OAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET server environment variable'
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
      console.error(
        `[Google OAuth] Token exchange failed with status ${tokenResponse.status}`
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
      console.error('[Google OAuth] Token endpoint did not return an access_token');
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
      console.warn('[Google OAuth] Notice querying Gmail profile:', profileErr?.message);
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
        console.warn('[Google OAuth] Notice querying userinfo:', userErr?.message);
      }
    }

    if (!connectedEmail) {
      console.error('[Google OAuth] Could not determine connected Gmail email address');
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
      console.error('[Google OAuth] Token encryption failed safely:', cryptErr?.message);
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
          '[Google OAuth] Failed to update existing gmail_connections record:',
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
          '[Google OAuth] Failed to insert gmail_connections record:',
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
      `[Google OAuth] Gmail connection updated successfully for project ID ${projectId}`
    );

    // 14. Redirect user back to Merchant Admin with success status
    sendRedirect(res, '/merchant-admin?gmail_status=connected');
  } catch (err: any) {
    console.error('[Google OAuth] Unexpected exception in callback endpoint:', err);
    sendRedirect(
      res,
      '/merchant-admin?gmail_status=error&error_code=internal_error&error_msg=Internal+server+error'
    );
  }
}

/**
 * Handler for POST /api/auth/google/disconnect (and POST /api/v1/gmail-connection/disconnect)
 *
 * 1. Authenticates caller & verifies authorized project access
 * 2. Resolves project's current gmail_connections record
 * 3. Optionally revokes the Google token with Google's revoke endpoint
 * 4. Clears sensitive encrypted token material from database
 * 5. Sets status to 'disconnected' and logs audit entry
 * 6. Never exposes token material to client
 */
export async function handleGoogleOAuthDisconnect(
  req: IncomingMessage,
  res: ServerResponse
) {
  try {
    const body = await parseJsonBody(req);
    const projectId = body.projectId || body.project_id || '';

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
          email: connection.email,
          timestamp: now
        }
      });
    }

    console.log(`[Google OAuth] Disconnected Gmail connection for project ID ${projectId}`);

    sendJson(res, 200, {
      success: true,
      connected: false,
      status: 'disconnected'
    });
  } catch (err: any) {
    console.error('[Google OAuth] Exception in disconnect endpoint:', err);
    sendJson(res, 500, { error: err?.message || 'Failed to disconnect Gmail connection.' });
  }
}
