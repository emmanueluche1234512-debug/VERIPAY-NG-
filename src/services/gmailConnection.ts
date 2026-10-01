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
   * Requests real Google OAuth 2.0 authorization URL and state token from backend.
   * Endpoint: GET /api/auth/google/start?project_id=...
   * Note: The server creates and records single-use state in public.oauth_states.
   */
  async initiateOAuth(
    projectId: string,
    redirectUri = 'https://veripay-ng.vercel.app/api/auth/google/callback'
  ): Promise<{ state: string; authUrl: string }> {
    if (!projectId) {
      throw new Error('Project ID is required to initiate OAuth.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error('Active user session is required to initiate Google OAuth.');
    }

    const res = await fetch(`/api/auth/google/start?project_id=${encodeURIComponent(projectId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Failed to initiate OAuth (status ${res.status})`);
    }

    const data = await res.json();
    return {
      state: data.state,
      authUrl: data.authUrl
    };
  },

  /**
   * Secure server-side OAuth disconnect handler.
   * Endpoint: POST /api/auth/google/disconnect
   * Browser does not directly modify public.gmail_connections.
   */
  async disconnect(projectId: string, email?: string): Promise<boolean> {
    if (!projectId || !isSupabaseConfigured) return false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Active user session is required to disconnect Gmail.');
      }

      const res = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ projectId, email })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Disconnect failed with status ${res.status}`);
      }

      return true;
    } catch (err: any) {
      console.warn('[gmailConnectionService] Disconnect error:', err?.message);
      return false;
    }
  }
};
