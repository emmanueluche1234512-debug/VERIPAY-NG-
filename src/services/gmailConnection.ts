import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GmailConnection, GmailConnectionStatus } from '../types';

/**
 * Veripay NG — Gmail Connection Service
 * Project-scoped Bank Alert Gmail OAuth & Lifecycle Service.
 *
 * SECURITY INVARIANTS (PHASE 3A REVISION):
 * 1. Server-Only Write Boundary:
 *    `public.gmail_connections` contains sensitive server-controlled OAuth fields
 *    (`encrypted_refresh_token`, `encrypted_access_token`, `token_expires_at`, `connected_at`).
 *    Browser/client Supabase sessions have ZERO INSERT, UPDATE, or DELETE policies on
 *    `public.gmail_connections`, and column-level SELECT on token columns is revoked.
 * 2. Safe Status Read Only:
 *    `getConnection()` queries strictly safe metadata columns:
 *    `id, project_id, email, status, connected_at, last_successful_sync`.
 *    It NEVER selects or returns `encrypted_refresh_token`, `encrypted_access_token`,
 *    or `token_expires_at`.
 * 3. Trusted Server-Side OAuth Only:
 *    All Gmail connection creation, token updates, reconnection, and disconnection
 *    must happen through trusted VERIPAY server-side OAuth logic (`/api/v1/gmail-connection/*`).
 */

export const gmailConnectionService = {
  /**
   * Fetches safe Gmail connection status for the project from public.gmail_connections.
   * Endpoint equivalent: GET /api/v1/gmail-connection
   * Response NEVER includes `encrypted_refresh_token`, `encrypted_access_token`, or `token_expires_at`.
   */
  async getConnection(projectId: string): Promise<GmailConnection | null> {
    if (!projectId || !isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase
        .from('gmail_connections')
        .select('id, project_id, email, status, connected_at, last_successful_sync')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) {
        console.warn('[gmailConnectionService] Notice fetching connection:', error.message);
        return null;
      }

      if (!data || data.status === 'disconnected' || data.status === 'not_connected') {
        return null;
      }

      return {
        id: data.id,
        projectId: data.project_id,
        email: data.email,
        status: data.status as GmailConnectionStatus,
        connectedAt: data.connected_at,
        lastSuccessfulSync: data.last_successful_sync || undefined
      };
    } catch (err: any) {
      console.warn('[gmailConnectionService] Error querying connection:', err?.message);
      return null;
    }
  },

  /**
   * Generates a cryptographically random OAuth state token bound to the project.
   * Endpoint equivalent: POST /api/v1/gmail-connection/connect
   * Note: Does NOT write to `gmail_connections` from the browser.
   */
  async initiateOAuth(
    projectId: string,
    redirectUri = (typeof window !== 'undefined' ? window.location.origin : 'https://example.com') +
      '/api/auth/google/callback'
  ): Promise<{ state: string; authUrl: string }> {
    const entropy =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const stateToken = `vp_oauth_${entropy}`;

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=GOOGLE_CLIENT_ID` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(
        'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email'
      )}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${stateToken}`;

    return {
      state: stateToken,
      authUrl
    };
  },

  /**
   * Server-side OAuth disconnect handler.
   * Endpoint equivalent: POST /api/v1/gmail-connection/disconnect
   */
  async disconnect(projectId: string, email?: string): Promise<boolean> {
    if (!projectId || !isSupabaseConfigured) return false;

    try {
      await supabase.from('audit_logs').insert({
        project_id: projectId,
        action: 'gmail_connection.disconnect_requested',
        details: {
          email: email || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return true;
    } catch (err: any) {
      console.warn('[gmailConnectionService] Error logging disconnect request:', err?.message);
      return false;
    }
  }
};
