import { CheckoutPaymentStatus, SafeCheckoutOrder } from '../../types';

/**
 * Veripay NG — Public Customer Checkout Client
 *
 * SECURITY MODEL:
 * 1. Scoped strictly to ONE order via a short-lived `orderToken` (`chk_live_...`).
 * 2. NEVER uses or accepts a project secret API key (`vpay_live_...`).
 * 3. Only reads safe public transfer instructions (`amount`, `currency`, `merchantReference`,
 *    `receivingBank`, `expectedPayerName`, `expiresAt`, `checkoutStatus`) and allows the
 *    customer to signal `[ I HAVE MADE THE TRANSFER ]` (which transitions status to
 *    `CHECKING_PAYMENT`, never `VERIFIED`).
 */
export interface VeripayCheckoutClientOptions {
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
}

export class VeripayCheckoutClient {
  private apiBaseUrl: string;
  private fetcher: typeof fetch;

  constructor(options?: VeripayCheckoutClientOptions) {
    this.apiBaseUrl = (options?.apiBaseUrl || '').replace(/\/$/, '');
    this.fetcher = options?.fetcher || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
  }

  /**
   * Loads safe public checkout order details using a single-order checkout token.
   */
  async getCheckoutSession(orderToken: string): Promise<SafeCheckoutOrder> {
    if (!orderToken || !orderToken.startsWith('chk_')) {
      throw new Error('Invalid checkout orderToken. Expected a single-order token starting with chk_.');
    }

    const res = await this.fetcher(`${this.apiBaseUrl}/api/v1/checkout/${encodeURIComponent(orderToken)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    const data = await res.json();
    if (!res.ok || !data?.order) {
      throw new Error(data?.error || 'Unable to load checkout transfer details.');
    }
    return data.order as SafeCheckoutOrder;
  }

  /**
   * Signals that the customer clicked "[ I HAVE MADE THE TRANSFER ]".
   * SECURITY INVARIANT: Never marks an order as paid/verified. Only transitions
   * checkoutStatus from AWAITING_TRANSFER to CHECKING_PAYMENT.
   */
  async confirmTransferSent(orderToken: string): Promise<{
    success: boolean;
    checkoutStatus: CheckoutPaymentStatus;
    customerMarkedTransferredAt: string;
  }> {
    if (!orderToken || !orderToken.startsWith('chk_')) {
      throw new Error('Invalid checkout orderToken.');
    }

    const res = await this.fetcher(
      `${this.apiBaseUrl}/api/v1/checkout/${encodeURIComponent(orderToken)}/confirm-transfer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Could not notify transfer status.');
    }
    return data;
  }
}
