import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MerchantBankAccount, MerchantIntegrationStatus, Currency } from '../types';

/**
 * Veripay NG — Merchant Admin Service
 * Server-side contract interface for Merchant Website Admin Panel integration.
 *
 * SECURITY INVARIANTS:
 * 1. Tenant Isolation: All actions are strictly scoped to the resolved project_id.
 * 2. Zero-Custody: Handles DESTINATION bank account details only (bank name, account name,
 *    account number, currency). NEVER requests or touches online banking credentials,
 *    passwords, PINs, or OTPs.
 * 3. Auditability: Records safe immutable audit logs (action: 'bank_account.updated')
 *    with actor identity and changed fields.
 */

export const merchantService = {
  /**
   * Fetches safe project, bank account, and Gmail connection status for the authorized merchant project.
   * Queries public.projects, public.bank_accounts, and public.gmail_connections for project_id.
   * Never returns hardcoded demo/sample bank accounts or Gmail connections.
   */
  async getStatus(projectId: string): Promise<MerchantIntegrationStatus | null> {
    if (!projectId || !isSupabaseConfigured) return null;

    // 1. Fetch Project
    const { data: projData, error: projError } = await supabase
      .from('projects')
      .select('id, name, currency, status, updated_at')
      .eq('id', projectId)
      .maybeSingle();

    if (projError) {
      console.error('[merchantService] Error fetching project:', projError);
      throw new Error(projError.message || 'Failed to load project from Supabase.');
    }

    if (!projData) {
      return null;
    }

    // 2. Fetch Bank Account from public.bank_accounts
    const { data: bankData, error: bankError } = await supabase
      .from('bank_accounts')
      .select('bank_name, account_name, account_number, currency, is_primary, updated_at')
      .eq('project_id', projectId)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bankError) {
      console.error('[merchantService] Error fetching bank account:', bankError);
      throw new Error(bankError.message || 'Failed to load bank account from Supabase.');
    }

    // 3. Fetch Gmail Connection from public.gmail_connections (safe status columns only)
    const { data: gmailData, error: gmailError } = await supabase
      .from('gmail_connections')
      .select('id, project_id, email, status, connected_at, last_successful_sync')
      .eq('project_id', projectId)
      .maybeSingle();

    if (gmailError && (gmailError as any).code !== 'PGRST205' && (gmailError as any).code !== '42P01') {
      console.warn('[merchantService] Notice fetching gmail_connections:', gmailError.message);
    }

    // If no bank account record exists, return empty fields so UI shows "Not Configured"
    const bankAccount: MerchantBankAccount = bankData
      ? {
          bankName: bankData.bank_name,
          accountName: bankData.account_name,
          accountNumber: bankData.account_number,
          currency: (bankData.currency as Currency) || (projData.currency as Currency) || 'NGN',
          isPrimary: bankData.is_primary
        }
      : {
          bankName: '',
          accountName: '',
          accountNumber: '',
          currency: (projData.currency as Currency) || 'NGN',
          isPrimary: false
        };

    return {
      connected: projData.status === 'active',
      projectId: projData.id,
      projectName: projData.name,
      currency: projData.currency as Currency,
      bankAccount,
      gmailConnection:
        gmailData && gmailData.status === 'connected'
          ? {
              id: gmailData.id,
              projectId: gmailData.project_id,
              email: gmailData.email,
              status: gmailData.status as any,
              connectedAt: gmailData.connected_at,
              lastSuccessfulSync: gmailData.last_successful_sync || undefined
            }
          : null,
      lastUpdated: bankData?.updated_at || projData.updated_at
    };
  },

  /**
   * Updates receiving bank account information in public.bank_accounts.
   * Endpoint equivalent: PATCH /api/v1/bank-account
   */
  async updateBankAccount(
    projectId: string,
    bankDetails: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      currency?: Currency;
    },
    actor = 'Merchant Admin'
  ): Promise<{ success: boolean; bankAccount?: MerchantBankAccount; error?: string }> {
    if (!projectId) {
      return { success: false, error: 'Project identity could not be resolved from authentication credentials.' };
    }
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    if (!bankDetails.bankName?.trim()) {
      return { success: false, error: 'Commercial bank name is required.' };
    }
    if (!bankDetails.accountName?.trim()) {
      return { success: false, error: 'Account holder name is required.' };
    }
    const cleanAccountNum = bankDetails.accountNumber.replace(/\D/g, '');
    if (cleanAccountNum.length !== 10) {
      return { success: false, error: 'Nigerian NUBAN account number must be exactly 10 digits.' };
    }

    try {
      const { data: existingBank, error: queryErr } = await supabase
        .from('bank_accounts')
        .select('id, bank_name, account_name, account_number, currency')
        .eq('project_id', projectId)
        .limit(1)
        .maybeSingle();

      if (queryErr) {
        console.error('[merchantService] Error querying bank_accounts:', queryErr);
        return { success: false, error: queryErr.message || 'Failed to query bank_accounts.' };
      }

      let opError: any = null;

      if (existingBank) {
        const { error } = await supabase
          .from('bank_accounts')
          .update({
            bank_name: bankDetails.bankName.trim(),
            account_name: bankDetails.accountName.trim().toUpperCase(),
            account_number: cleanAccountNum,
            currency: bankDetails.currency || existingBank.currency || 'NGN',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBank.id)
          .eq('project_id', projectId);
        opError = error;
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert({
            project_id: projectId,
            bank_name: bankDetails.bankName.trim(),
            account_name: bankDetails.accountName.trim().toUpperCase(),
            account_number: cleanAccountNum,
            currency: bankDetails.currency || 'NGN',
            is_primary: true
          });
        opError = error;
      }

      if (opError) {
        console.error('[merchantService] Error updating bank account:', opError);
        return { success: false, error: opError.message || 'Database update failed.' };
      }

      await supabase.from('audit_logs').insert({
        project_id: projectId,
        action: 'bank_account.updated',
        details: {
          actor,
          bank_name: bankDetails.bankName.trim(),
          account_name: bankDetails.accountName.trim().toUpperCase(),
          account_number_masked: `******${cleanAccountNum.slice(-4)}`,
          currency: bankDetails.currency || 'NGN',
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        bankAccount: {
          bankName: bankDetails.bankName.trim(),
          accountName: bankDetails.accountName.trim().toUpperCase(),
          accountNumber: cleanAccountNum,
          currency: bankDetails.currency || 'NGN',
          isPrimary: true
        }
      };
    } catch (err: any) {
      console.error('[merchantService] Error updating bank account:', err);
      return { success: false, error: err?.message || 'Server error updating bank destination.' };
    }
  }
};
