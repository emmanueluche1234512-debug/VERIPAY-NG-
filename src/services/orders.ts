import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Database } from '../types/database';
import {
  CheckoutPaymentStatus,
  Currency,
  Order,
  OrderStatus,
  ReceivingBankAccount,
  SafeCheckoutOrder
} from '../types';

export type OrderRow = Database['public']['Tables']['orders']['Row'];

export interface CreateOrderPayload {
  projectId: string;
  merchantOrderReference: string;
  amount: number;
  currency: Currency;
  expectedPayerName: string;
  payerBank?: string;
  expiresInMinutes?: number;
}

/**
 * Generates a cryptographically secure single-order public checkout token (`chk_live_<secure_random>`).
 * SECURITY INVARIANT:
 * - Returned ONCE to the merchant backend when creating an order via POST /api/v1/orders.
 * - NEVER stored in plaintext in public.orders, public.checkout_sessions, or any database table.
 * - Only SHA-256(rawCheckoutToken) is persisted as `token_hash` in public.checkout_sessions by the server.
 */
export function generateCheckoutToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `chk_live_${hex}`;
  }
  throw new Error('Cryptographic random generator is required to generate checkout tokens.');
}

/**
 * Computes the customer-facing CheckoutPaymentStatus from an Order.
 * SECURITY INVARIANT:
 * Clicking "I HAVE MADE THE TRANSFER" only sets customerMarkedTransferredAt,
 * which transitions AWAITING_TRANSFER -> CHECKING_PAYMENT.
 * It NEVER marks the order as VERIFIED.
 */
export function computeCheckoutStatus(order: {
  status: OrderStatus;
  expiresAt: string;
  customerMarkedTransferredAt?: string | null;
  metadata?: Record<string, any>;
}): CheckoutPaymentStatus {
  if (order.status === 'verified') {
    return 'VERIFIED';
  }
  if (order.status === 'manual_review') {
    return 'MANUAL_REVIEW';
  }
  const isExpiredByTime = new Date(order.expiresAt).getTime() < Date.now();
  if (
    order.status === 'expired' ||
    order.status === 'cancelled' ||
    (order.status === 'pending' && isExpiredByTime)
  ) {
    return 'EXPIRED';
  }
  const markedTransfer =
    order.customerMarkedTransferredAt ||
    (order.metadata && typeof order.metadata === 'object'
      ? order.metadata.customer_marked_transferred_at
      : undefined);
  if (markedTransfer) {
    return 'CHECKING_PAYMENT';
  }
  return 'AWAITING_TRANSFER';
}

export function mapRowToOrder(o: OrderRow): Order {
  const meta = (o.metadata as Record<string, string>) || {};
  const customerMarkedTransferredAt =
    o.customer_marked_transferred_at || meta.customer_marked_transferred_at || undefined;

  return {
    id: o.id,
    projectId: o.project_id,
    merchantOrderReference: o.merchant_order_reference,
    amount: Number(o.amount),
    currency: o.currency as Currency,
    expectedPayerName: o.expected_payer_name,
    payerBank: o.payer_bank || undefined,
    status: o.status as OrderStatus,
    createdAt: o.created_at,
    expiresAt: o.expires_at,
    verifiedAt: o.verified_at || undefined,
    matchedPaymentAlertId: o.matched_payment_alert_id || undefined,
    customerMarkedTransferredAt,
    metadata: meta
  };
}

export const ordersService = {
  /**
   * Converts an Order + Project Receiving Bank into a SafeCheckoutOrder
   * suitable for the customer-facing <VeripayCheckout /> component.
   * Never includes API keys, secret hashes, token_hash, or unrelated orders.
   */
  toSafeCheckoutOrder(
    order: Order,
    receivingBank: ReceivingBankAccount,
    ephemeralCheckoutToken = ''
  ): SafeCheckoutOrder {
    return {
      id: order.id,
      checkoutToken: ephemeralCheckoutToken || order.checkoutToken || '',
      merchantReference: order.merchantOrderReference,
      amount: order.amount,
      currency: order.currency,
      expectedPayerName: order.expectedPayerName,
      payerBank: order.payerBank,
      receivingBank: {
        bankName: receivingBank.bankName || 'Not Configured',
        accountName: receivingBank.accountName || 'Not Configured',
        accountNumber: receivingBank.accountNumber || 'Not Configured'
      },
      status: order.status,
      checkoutStatus: computeCheckoutStatus(order),
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      verifiedAt: order.verifiedAt,
      customerMarkedTransferredAt: order.customerMarkedTransferredAt
    };
  },

  /**
   * Fetch all orders for a specific project from public.orders
   */
  async getOrders(projectId: string): Promise<Order[]> {
    if (!projectId || !isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ordersService] Error fetching orders from Supabase:', error);
      throw new Error(error.message || 'Failed to query orders from Supabase.');
    }

    if (!data || data.length === 0) return [];

    return data.map(mapRowToOrder);
  },

  /**
   * Fetch a single order scoped strictly to a projectId
   */
  async getOrderById(projectId: string, orderId: string): Promise<Order | null> {
    if (!projectId || !orderId || !isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('project_id', projectId)
      .eq('id', orderId)
      .maybeSingle();

    if (error || !data) return null;
    return mapRowToOrder(data);
  },

  /**
   * Create a new pending order in public.orders.
   * SECURITY INVARIANT:
   * - Never stores a raw checkout token in public.orders or metadata.
   * - Never performs browser direct writes to public.checkout_sessions.
   *   Hashed checkout session creation happens strictly on the VERIPAY server
   *   in POST /api/v1/orders.
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Cannot create order.');
    }

    const durationMinutes = payload.expiresInMinutes || 60;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('orders')
      .insert({
        project_id: payload.projectId,
        merchant_order_reference: payload.merchantOrderReference.trim(),
        amount: payload.amount,
        currency: payload.currency,
        expected_payer_name: payload.expectedPayerName.toUpperCase().trim(),
        payer_bank: payload.payerBank || null,
        status: 'pending',
        expires_at: expiresAt,
        metadata: {}
      })
      .select()
      .single();

    if (error) {
      console.error('[ordersService] Error creating order:', error);
      throw error;
    }

    return mapRowToOrder(data);
  },

  /**
   * Records that a transfer notification was received for a specific project order.
   * SECURITY INVARIANT:
   * - Does NOT mark the order as 'verified' or paid.
   * - Does NOT set verified_at or matched_payment_alert_id.
   * - Order status remains 'pending'.
   * - Only sets customer_marked_transferred_at so checkoutStatus becomes 'CHECKING_PAYMENT'.
   */
  async recordCustomerTransferNotification(params: {
    orderId: string;
    projectId?: string;
  }): Promise<{
    success: boolean;
    checkoutStatus: CheckoutPaymentStatus;
    markedAt: string;
    error?: string;
  }> {
    const markedAt = new Date().toISOString();

    if (!isSupabaseConfigured || !params.orderId) {
      return {
        success: false,
        checkoutStatus: 'AWAITING_TRANSFER',
        markedAt,
        error: 'Valid orderId and configured Supabase connection are required.'
      };
    }

    try {
      let query = supabase.from('orders').select('*').eq('id', params.orderId);
      if (params.projectId) {
        query = query.eq('project_id', params.projectId);
      }

      const { data: targetOrder } = await query.maybeSingle();

      if (!targetOrder) {
        return {
          success: false,
          checkoutStatus: 'AWAITING_TRANSFER',
          markedAt,
          error: 'Order not found for transfer notification.'
        };
      }

      if (targetOrder.status !== 'pending') {
        const mapped = mapRowToOrder(targetOrder);
        return {
          success: true,
          checkoutStatus: computeCheckoutStatus(mapped),
          markedAt
        };
      }

      const existingMeta = (targetOrder.metadata as Record<string, any>) || {};
      const updatedMeta = {
        ...existingMeta,
        customer_marked_transferred_at: markedAt
      };

      const { error: updateErr } = await supabase
        .from('orders')
        .update({
          customer_marked_transferred_at: markedAt,
          metadata: updatedMeta
        })
        .eq('id', targetOrder.id);

      if (updateErr) {
        await supabase
          .from('orders')
          .update({
            metadata: updatedMeta
          })
          .eq('id', targetOrder.id);
      }

      await supabase.from('audit_logs').insert({
        project_id: targetOrder.project_id,
        action: 'order.customer_marked_transferred',
        details: {
          order_id: targetOrder.id,
          merchant_order_reference: targetOrder.merchant_order_reference,
          amount: targetOrder.amount,
          note: 'Customer clicked I HAVE MADE THE TRANSFER. Order remains pending until bank-alert verification.',
          timestamp: markedAt
        }
      });

      return {
        success: true,
        checkoutStatus: 'CHECKING_PAYMENT',
        markedAt
      };
    } catch (err: any) {
      console.error('[ordersService] Error recording transfer notification:', err);
      return {
        success: false,
        checkoutStatus: 'AWAITING_TRANSFER',
        markedAt,
        error: err?.message || 'Failed to record transfer notification.'
      };
    }
  }
};
