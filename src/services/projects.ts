import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Database } from '../types/database';
import { Currency, Project } from '../types';

export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type BankAccountRow = Database['public']['Tables']['bank_accounts']['Row'];

export interface CreateProjectPayload {
  name: string;
  websiteUrl: string;
  currency: Currency;
  receivingBank: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency: Currency;
  };
}

export const projectsService = {
  /**
   * Fetch all projects accessible by current authenticated user
   * (Enforced by Row Level Security)
   */
  async getProjects(): Promise<Project[]> {
    if (!isSupabaseConfigured) return [];

    // Query projects with their receiving bank accounts
    const { data: projectsData, error: projError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        website_url,
        currency,
        status,
        created_at,
        bank_accounts (
          id,
          bank_name,
          account_name,
          account_number,
          currency,
          is_primary
        )
      `)
      .order('created_at', { ascending: false });

    if (projError) {
      console.error('[projectsService] Error fetching projects:', projError);
      throw new Error(projError.message || 'Failed to query projects from Supabase.');
    }

    if (!projectsData || projectsData.length === 0) return [];

    return projectsData.map((p: any) => {
      // Find primary receiving bank account if configured in public.bank_accounts
      const primaryBank =
        p.bank_accounts?.find((b: any) => b.is_primary) ||
        p.bank_accounts?.[0] ||
        null;

      return {
        id: p.id,
        name: p.name,
        websiteUrl: p.website_url || '',
        currency: p.currency as Currency,
        status: p.status as 'active' | 'archived',
        createdAt: p.created_at,
        receivingBank: {
          bankName: primaryBank?.bank_name || '',
          accountName: primaryBank?.account_name || '',
          accountNumber: primaryBank?.account_number || '',
          currency: (primaryBank?.currency as Currency) || (p.currency as Currency)
        }
      };
    });
  },

  /**
   * Create a new project and primary receiving bank account transactionally
   */
  async createProject(ownerId: string, payload: CreateProjectPayload): Promise<Project> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    // 1. Insert Project
    const { data: project, error: projError } = await supabase
      .from('projects')
      .insert({
        owner_id: ownerId,
        name: payload.name,
        website_url: payload.websiteUrl,
        currency: payload.currency,
        status: 'active'
      })
      .select()
      .single();

    if (projError) throw projError;

    // 2. Insert Primary Receiving Bank Account
    const { data: bankAccount, error: bankError } = await supabase
      .from('bank_accounts')
      .insert({
        project_id: project.id,
        bank_name: payload.receivingBank.bankName,
        account_name: payload.receivingBank.accountName,
        account_number: payload.receivingBank.accountNumber,
        currency: payload.receivingBank.currency,
        is_primary: true
      })
      .select()
      .single();

    if (bankError) {
      console.error('[projectsService] Error saving bank account:', bankError);
      // Attempt rollback of project if bank insert fails
      await supabase.from('projects').delete().eq('id', project.id);
      throw bankError;
    }

    return {
      id: project.id,
      name: project.name,
      websiteUrl: project.website_url || '',
      currency: project.currency as Currency,
      status: project.status as 'active' | 'archived',
      createdAt: project.created_at,
      receivingBank: {
        bankName: bankAccount.bank_name,
        accountName: bankAccount.account_name,
        accountNumber: bankAccount.account_number,
        currency: bankAccount.currency as Currency
      }
    };
  }
};
