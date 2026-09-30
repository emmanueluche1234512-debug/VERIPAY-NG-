import {
  CheckoutPaymentStatus,
  Currency,
  OrderStatus,
  SafeCheckoutOrder
} from '../../types';

export interface VeripayClientOptions {
  /**
   * Project Secret API Key (e.g., 'vpay_live_...').
   * MUST be kept server-side in process.env.VERIPAY_API_KEY.
   * NEVER expose this in VITE_* or browser code.
   */
  apiKey: string;

  /**
   * VERIPAY API Gateway URL.
   * Defaults to window.location.origin or 'https://api.veripay.ng'.
   */
  baseUrl?: string;

  /**
   * Custom fetch function (for Node 18+ or SSR).
   */
  fetcher?: typeof fetch;
}

export interface ProjectInfoResponse {
  id: string;
  name: string;
  websiteUrl?: string;
  currency: Currency;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface BankAccountResponse {
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: Currency;
  isPrimary: boolean;
  updatedAt?: string;
}

export interface GmailConnectionResponse {
  connected: boolean;
  email?: string;
  status: 'connected' | 'not_connected' | 'expired' | 'reauth_required' | 'disconnected';
  connectedAt?: string;
  lastSuccessfulSync?: string;
}

export interface CreateOrderInput {
  merchantReference: string;
  amount: number;
  currency?: Currency;
  expectedPayerName: string;
  payerBank?: string;
  expiresInMinutes?: number;
}

export interface CreateOrderResponse {
  success: boolean;
  order: SafeCheckoutOrder;
  checkoutToken: string;
}

export interface OrderStatusResponse {
  id: string;
  merchantReference: string;
  amount: number;
  currency: Currency;
  expectedPayerName: string;
  status: OrderStatus;
  checkoutStatus: CheckoutPaymentStatus;
  expiresAt: string;
  verifiedAt: string | null;
  customerMarkedTransferredAt: string | null;
}

/**
 * Veripay NG — Official Server-Side SDK Client
 *
 * Conceptual usage on Merchant Website Backend:
 * ```ts
 * const veripay = new VeripayClient({
 *   apiKey: process.env.VERIPAY_API_KEY
 * });
 *
 * const { order, checkoutToken } = await veripay.orders.create({
 *   merchantReference: "ORD-2026-001",
 *   amount: 3000,
 *   currency: "NGN",
 *   expectedPayerName: "Customer Name"
 * });
 * ```
 */
export class VeripayClient {
  private apiKey: string;
  private baseUrl: string;
  private fetcher: typeof fetch;

  public readonly project: {
    get: () => Promise<ProjectInfoResponse>;
  };

  public readonly bankAccount: {
    get: () => Promise<BankAccountResponse>;
    update: (details: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      currency?: Currency;
    }) => Promise<{ success: boolean; bankAccount: BankAccountResponse }>;
  };

  public readonly gmailConnection: {
    get: () => Promise<GmailConnectionResponse>;
    connect: (redirectUri: string) => Promise<{ authUrl: string; state: string; status: string }>;
    disconnect: () => Promise<{ success: boolean; connected: boolean; status: string }>;
  };

  public readonly orders: {
    create: (input: CreateOrderInput) => Promise<CreateOrderResponse>;
    get: (orderId: string) => Promise<{ order: SafeCheckoutOrder }>;
    getStatus: (orderId: string) => Promise<OrderStatusResponse>;
    confirmTransferSent: (orderId: string) => Promise<{
      success: boolean;
      orderId: string;
      status: OrderStatus;
      checkoutStatus: CheckoutPaymentStatus;
      customerMarkedTransferredAt: string;
    }>;
  };

  constructor(options: VeripayClientOptions) {
    if (!options.apiKey) {
      throw new Error(
        '[VeripayClient] apiKey is required. Pass process.env.VERIPAY_API_KEY on your server.'
      );
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (
      options.baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://api.veripay.ng')
    ).replace(/\/$/, '');
    this.fetcher = options.fetcher || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);

    // Bind structured resource namespaces
    this.project = {
      get: () => this.getProject()
    };

    this.bankAccount = {
      get: () => this.getBankAccount(),
      update: details => this.updateBankAccount(details)
    };

    this.gmailConnection = {
      get: () => this.getGmailConnection(),
      connect: redirectUri => this.initiateGmailConnection(redirectUri),
      disconnect: () => this.disconnectGmailConnection()
    };

    this.orders = {
      create: input => this.createOrder(input),
      get: orderId => this.getOrder(orderId),
      getStatus: orderId => this.getOrderStatus(orderId),
      confirmTransferSent: orderId => this.confirmOrderTransferSent(orderId)
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    };

    const res = await this.fetcher(url, {
      ...options,
      headers
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `Veripay API error: HTTP ${res.status}`);
    }
    return data as T;
  }

  /**
   * GET /api/v1/project
   * Retrieves safe information for the authenticated project.
   * Requires scope: 'project:read'
   */
  async getProject(): Promise<ProjectInfoResponse> {
    return this.request<ProjectInfoResponse>('/project', { method: 'GET' });
  }

  /**
   * GET /api/v1/bank-account
   * Retrieves receiving destination bank details for the authenticated project.
   * Requires scope: 'bank_accounts:read'
   */
  async getBankAccount(): Promise<BankAccountResponse> {
    return this.request<BankAccountResponse>('/bank-account', { method: 'GET' });
  }

  /**
   * PATCH /api/v1/bank-account
   * Updates receiving bank account details for the authenticated project.
   * Requires scope: 'bank_accounts:write'
   */
  async updateBankAccount(details: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency?: Currency;
  }): Promise<{ success: boolean; bankAccount: BankAccountResponse }> {
    return this.request<{ success: boolean; bankAccount: BankAccountResponse }>('/bank-account', {
      method: 'PATCH',
      body: JSON.stringify(details)
    });
  }

  /**
   * GET /api/v1/gmail-connection
   * Retrieves safe Gmail bank-alert connection status.
   * Requires scope: 'gmail_connection:read'
   */
  async getGmailConnection(): Promise<GmailConnectionResponse> {
    return this.request<GmailConnectionResponse>('/gmail-connection', { method: 'GET' });
  }

  /**
   * POST /api/v1/gmail-connection/connect
   * Initiates Google OAuth consent flow for bank credit alerts.
   * Requires scope: 'gmail_connection:manage'
   */
  async initiateGmailConnection(redirectUri: string): Promise<{ authUrl: string; state: string; status: string }> {
    return this.request<{ authUrl: string; state: string; status: string }>('/gmail-connection/connect', {
      method: 'POST',
      body: JSON.stringify({ redirectUri })
    });
  }

  /**
   * POST /api/v1/gmail-connection/disconnect
   * Disconnects the project's bank-alert Gmail mailbox.
   * Requires scope: 'gmail_connection:manage'
   */
  async disconnectGmailConnection(): Promise<{ success: boolean; connected: boolean; status: string }> {
    return this.request<{ success: boolean; connected: boolean; status: string }>(
      '/gmail-connection/disconnect',
      {
        method: 'POST'
      }
    );
  }

  /**
   * POST /api/v1/orders
   * Creates a new pending bank-transfer order for the authenticated project.
   * Requires scope: 'orders:create'
   */
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
    return this.request<CreateOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  /**
   * GET /api/v1/orders/:id
   * Retrieves safe order details for the authenticated project.
   * Requires scope: 'orders:read'
   */
  async getOrder(orderId: string): Promise<{ order: SafeCheckoutOrder }> {
    return this.request<{ order: SafeCheckoutOrder }>(`/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET'
    });
  }

  /**
   * GET /api/v1/orders/:id/status
   * Retrieves verification status for the order.
   * Requires scope: 'orders:read'
   */
  async getOrderStatus(orderId: string): Promise<OrderStatusResponse> {
    return this.request<OrderStatusResponse>(`/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'GET'
    });
  }

  /**
   * POST /api/v1/orders/:id/transfer-confirmed
   * Records that the customer clicked "[ I HAVE MADE THE TRANSFER ]".
   * Order remains pending until bank-alert verification completes.
   * Requires scope: 'orders:read'
   */
  async confirmOrderTransferSent(orderId: string): Promise<{
    success: boolean;
    orderId: string;
    status: OrderStatus;
    checkoutStatus: CheckoutPaymentStatus;
    customerMarkedTransferredAt: string;
  }> {
    return this.request(`/orders/${encodeURIComponent(orderId)}/transfer-confirmed`, {
      method: 'POST'
    });
  }
}
