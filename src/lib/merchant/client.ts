import { MerchantBankAccount, MerchantIntegrationStatus, GmailConnection } from '../../types';

/**
 * Veripay NG — Merchant Admin SDK Client
 * Lightweight integration client designed for merchant website backends and frontends.
 * 
 * ARCHITECTURE PRINCIPLE:
 * Frontend Browser -> Merchant Website Backend (/api/veripay-admin/*) -> Veripay NG API
 * 
 * No master API secrets, service role keys, or OAuth credentials are ever exposed
 * to the merchant admin's browser.
 */

export interface VeripayMerchantClientOptions {
  /**
   * Base URL of the merchant website's own backend proxy route.
   * Defaults to '/api/veripay-admin'.
   */
  proxyBaseUrl?: string;

  /**
   * Optional custom fetch implementation (for Node.js or SSR).
   */
  fetcher?: typeof fetch;
}

export class VeripayMerchantClient {
  private proxyBaseUrl: string;
  private fetcher: typeof fetch;

  constructor(options?: VeripayMerchantClientOptions) {
    this.proxyBaseUrl = options?.proxyBaseUrl || '/api/veripay-admin';
    this.fetcher = options?.fetcher || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
  }

  /**
   * Fetches safe project, bank account, and Gmail connection status.
   */
  async getStatus(): Promise<MerchantIntegrationStatus> {
    const res = await this.fetcher(`${this.proxyBaseUrl}/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch Veripay status: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Updates the receiving bank account destination for this merchant project.
   */
  async updateBankAccount(details: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency?: string;
  }): Promise<{ success: boolean; bankAccount?: MerchantBankAccount; error?: string }> {
    const res = await this.fetcher(`${this.proxyBaseUrl}/bank-account`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(details)
    });
    return res.json();
  }

  /**
   * Fetches the bank alert Gmail connection status.
   */
  async getGmailConnection(): Promise<GmailConnection | null> {
    const res = await this.fetcher(`${this.proxyBaseUrl}/gmail-connection`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * Initiates Google OAuth flow to connect or change Gmail account.
   */
  async initiateGmailOAuth(): Promise<{ authUrl: string; state: string }> {
    const res = await this.fetcher(`${this.proxyBaseUrl}/gmail-connection/connect`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      throw new Error('Failed to initiate Gmail OAuth authorization.');
    }
    return res.json();
  }

  /**
   * Disconnects the connected Gmail account for this project.
   */
  async disconnectGmail(): Promise<{ success: boolean }> {
    const res = await this.fetcher(`${this.proxyBaseUrl}/gmail-connection/disconnect`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });
    return res.json();
  }
}
