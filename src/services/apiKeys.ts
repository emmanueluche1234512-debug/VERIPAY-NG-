import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ApiKey, ApiKeyScope } from '../types';

/**
 * SHA-256 Cryptographic Hash Helper
 * Compatible with modern browser Web Crypto API and server environments.
 */
export async function hashSecret(secret: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(secret).digest('hex');
  } catch {
    let hash = 0;
    for (let i = 0; i < secret.length; i++) {
      hash = ((hash << 5) - hash) + secret.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

export interface VerifiedProjectCredential {
  isValid: boolean;
  projectId?: string;
  keyId?: string;
  scopes?: ApiKeyScope[];
  environment?: 'live' | 'test';
  error?: string;
}

export const apiKeysService = {
  /**
   * Fetches all project API credentials for a given project from Supabase.
   */
  async listKeys(projectId: string): Promise<ApiKey[]> {
    if (!projectId || !isSupabaseConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('project_api_keys')
        .select('id, project_id, name, key_prefix, scopes, environment, created_at, last_used_at, revoked_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback to legacy api_keys table if project_api_keys has not yet been migrated
        const { data: legacyData, error: legacyError } = await supabase
          .from('api_keys')
          .select('id, project_id, name, key_prefix, scopes, environment, created_at, last_used_at, revoked_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (legacyError || !legacyData) {
          console.warn('[apiKeysService] Notice querying API keys:', error.message);
          return [];
        }

        return legacyData.map(k => ({
          id: k.id,
          projectId: k.project_id,
          name: k.name,
          prefix: k.key_prefix,
          scopes: (k.scopes as ApiKeyScope[]) || ['bank_accounts:read', 'bank_accounts:write'],
          environment: (k.environment as 'live' | 'test') || 'live',
          createdAt: k.created_at,
          lastUsedAt: k.last_used_at || undefined,
          status: k.revoked_at ? 'revoked' : 'active'
        }));
      }

      return (data || []).map(k => ({
        id: k.id,
        projectId: k.project_id,
        name: k.name,
        prefix: k.key_prefix,
        scopes: (k.scopes as ApiKeyScope[]) || ['bank_accounts:read', 'bank_accounts:write'],
        environment: (k.environment as 'live' | 'test') || 'live',
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at || undefined,
        status: k.revoked_at ? 'revoked' : 'active'
      }));
    } catch (err: any) {
      console.error('[apiKeysService] Error listing keys:', err);
      return [];
    }
  },

  /**
   * Generates a new project-scoped API key.
   * SECURITY: The raw secret is returned ONCE and never saved in plaintext.
   */
  async createKey(
    projectId: string,
    name: string,
    environment: 'live' | 'test' = 'live',
    scopes: ApiKeyScope[] = ['bank_accounts:read', 'bank_accounts:write'],
    createdBy?: string
  ): Promise<{ secret: string; apiKey: ApiKey }> {
    if (!projectId) {
      throw new Error('Active project is required to create an API key.');
    }
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const entropy = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const prefixTag = environment === 'live' ? 'vpay_live_' : 'vpay_test_';
    const rawSecret = `${prefixTag}${entropy}`;
    const safePrefix = `${prefixTag}${entropy.slice(0, 4)}...${entropy.slice(-4).toUpperCase()}`;
    const secretHash = await hashSecret(rawSecret);

    const now = new Date().toISOString();
    const newApiKey: ApiKey = {
      id: '',
      projectId,
      name,
      prefix: safePrefix,
      scopes,
      environment,
      createdAt: now,
      status: 'active'
    };

    const { data, error } = await supabase
      .from('project_api_keys')
      .insert({
        project_id: projectId,
        name,
        key_prefix: safePrefix,
        secret_hash: secretHash,
        scopes: scopes,
        environment,
        created_by: createdBy || null
      })
      .select('id, created_at')
      .single();

    if (error) {
      const { data: legacyData, error: legacyError } = await supabase
        .from('api_keys')
        .insert({
          project_id: projectId,
          name,
          key_prefix: safePrefix,
          key_hash: secretHash,
          scopes: scopes,
          environment
        })
        .select('id, created_at')
        .single();

      if (legacyError) {
        console.error('[apiKeysService] Error storing API key:', legacyError);
        throw new Error(legacyError.message);
      }
      if (legacyData) {
        newApiKey.id = legacyData.id;
        newApiKey.createdAt = legacyData.created_at;
      }
    } else if (data) {
      newApiKey.id = data.id;
      newApiKey.createdAt = data.created_at;
    }

    await supabase.from('audit_logs').insert({
      project_id: projectId,
      action: 'api_key.created',
      details: {
        key_name: name,
        key_prefix: safePrefix,
        environment,
        scopes,
        timestamp: now
      }
    });

    return { secret: rawSecret, apiKey: newApiKey };
  },

  /**
   * Revokes an active project API key.
   */
  async revokeKey(keyId: string, projectId: string): Promise<boolean> {
    if (!keyId || !projectId || !isSupabaseConfigured) return false;

    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('project_api_keys')
        .update({ revoked_at: now })
        .eq('id', keyId)
        .eq('project_id', projectId);

      if (error) {
        await supabase
          .from('api_keys')
          .update({ revoked_at: now })
          .eq('id', keyId)
          .eq('project_id', projectId);
      }

      await supabase.from('audit_logs').insert({
        project_id: projectId,
        action: 'api_key.revoked',
        details: {
          key_id: keyId,
          timestamp: now
        }
      });

      return true;
    } catch (err: any) {
      console.error('[apiKeysService] Error revoking key:', err);
      return false;
    }
  },

  /**
   * Verifies an incoming Bearer secret token server-side.
   * Resolves the associated project_id and checks required permission scopes.
   */
  async authenticateToken(rawSecret: string, requiredScope?: ApiKeyScope): Promise<VerifiedProjectCredential> {
    if (!rawSecret || !rawSecret.startsWith('vpay_')) {
      return { isValid: false, error: 'Invalid or missing Bearer API credential format.' };
    }

    if (!isSupabaseConfigured) {
      return { isValid: false, error: 'Supabase database connection is not configured.' };
    }

    const secretHash = await hashSecret(rawSecret);

    try {
      const { data, error } = await supabase
        .from('project_api_keys')
        .select('id, project_id, scopes, environment, revoked_at, expires_at')
        .eq('secret_hash', secretHash)
        .maybeSingle();

      let record = data;

      if (error || !record) {
        const { data: legacyData } = await supabase
          .from('api_keys')
          .select('id, project_id, scopes, environment, revoked_at')
          .eq('key_hash', secretHash)
          .maybeSingle();
        record = legacyData as any;
      }

      if (!record) {
        return { isValid: false, error: 'Unauthorized: API secret key was not found or has expired.' };
      }

      if (record.revoked_at) {
        return { isValid: false, error: 'Forbidden: This API key has been revoked.' };
      }

      if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
        return { isValid: false, error: 'Forbidden: This API key has expired.' };
      }

      const scopes = (record.scopes as ApiKeyScope[]) || [];

      if (requiredScope && !scopes.includes(requiredScope)) {
        return {
          isValid: false,
          projectId: record.project_id,
          error: `Forbidden: Credential lacks required permission scope: '${requiredScope}'.`
        };
      }

      supabase
        .from('project_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', record.id)
        .then(() => {});

      return {
        isValid: true,
        projectId: record.project_id,
        keyId: record.id,
        scopes,
        environment: record.environment as 'live' | 'test'
      };
    } catch (err: any) {
      console.error('[apiKeysService] Authentication exception:', err);
      return { isValid: false, error: 'Authentication service disruption.' };
    }
  }
};
