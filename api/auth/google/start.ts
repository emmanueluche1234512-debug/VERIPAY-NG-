import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_OAUTH_CALLBACK_URL =
  'https://veripay-ng.vercel.app/api/auth/google/callback';

const GMAIL_READONLY_SCOPE =
  'https://www.googleapis.com/auth/gmail.readonly';

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

function sendRedirect(res: ServerResponse, location: string) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end();
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

  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

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
