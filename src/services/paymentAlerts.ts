import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Database } from '../types/database';
import {
  AlertType,
  Currency,
  ManualReviewItem,
  Order,
  PaymentAlert,
  ReviewStatus
} from '../types';

export type PaymentAlertRow = Database['public']['Tables']['payment_alerts']['Row'];
export type ManualReviewRow = Database['public']['Tables']['manual_reviews']['Row'];

function mapRowToPaymentAlert(row: PaymentAlertRow): PaymentAlert {
  const rawStatus = row.status;
  const mappedStatus: PaymentAlert['status'] =
    rawStatus === 'VERIFIED'
      ? 'VERIFIED'
      : rawStatus === 'MANUAL_REVIEW'
      ? 'MANUAL_REVIEW'
      : 'UNMATCHED';

  const ambiguitiesArray = Array.isArray(row.ambiguities)
    ? row.ambiguities.map(a => String(a))
    : undefined;

  return {
    id: row.id,
    projectId: row.project_id,
    amount: Number(row.amount || 0),
    currency: (row.currency as Currency) || 'NGN',
    senderName: row.sender_name || 'Unknown Sender',
    alertType: (row.alert_type as AlertType) || 'UNKNOWN',
    bankName: row.bank_name || 'Unknown Bank',
    transactionTime: row.transaction_time || row.created_at,
    transactionReference: row.transaction_reference || undefined,
    rawSnippet: row.raw_snippet || undefined,
    confidence: row.extraction_confidence !== null ? Number(row.extraction_confidence) : 0,
    ambiguities: ambiguitiesArray,
    status: mappedStatus,
    matchedOrderId: row.matched_order_id || undefined
  };
}

export const paymentAlertsService = {
  /**
   * Fetch all bank payment alerts for a specific project, newest first.
   * Queries public.payment_alerts WHERE project_id = projectId ORDER BY created_at DESC
   */
  async getPaymentAlerts(projectId: string): Promise<PaymentAlert[]> {
    if (!projectId || !isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('payment_alerts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[paymentAlertsService] Error fetching payment_alerts:', error);
      throw new Error(error.message || 'Failed to query payment_alerts from Supabase.');
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(mapRowToPaymentAlert);
  },

  /**
   * Fetch all manual review items for a specific project, newest first.
   * Queries public.manual_reviews WHERE project_id = projectId ORDER BY created_at DESC
   */
  async getManualReviews(
    projectId: string,
    projectAlerts: PaymentAlert[] = [],
    projectOrders: Order[] = []
  ): Promise<ManualReviewItem[]> {
    if (!projectId || !isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('manual_reviews')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[paymentAlertsService] Error fetching manual_reviews:', error);
      throw new Error(error.message || 'Failed to query manual_reviews from Supabase.');
    }

    if (!data || data.length === 0) {
      return [];
    }

    const alertsById = new Map<string, PaymentAlert>(projectAlerts.map(a => [a.id, a]));
    const ordersById = new Map<string, Order>(projectOrders.map(o => [o.id, o]));

    return data.map((row: ManualReviewRow) => {
      const linkedAlert = alertsById.get(row.payment_alert_id) || {
        id: row.payment_alert_id,
        projectId: row.project_id,
        amount: 0,
        currency: 'NGN',
        senderName: 'Unknown Sender',
        alertType: 'CREDIT',
        bankName: 'Bank Alert',
        transactionTime: row.created_at,
        confidence: 0,
        status: 'MANUAL_REVIEW'
      };

      const candidateOrder = row.candidate_order_id
        ? ordersById.get(row.candidate_order_id)
        : undefined;

      return {
        id: row.id,
        projectId: row.project_id,
        paymentAlert: linkedAlert,
        candidateOrders: candidateOrder ? [candidateOrder] : [],
        reason: row.reason,
        status: row.status as ReviewStatus,
        reviewedAt: row.reviewed_at || undefined,
        reviewedBy: row.reviewed_by || undefined,
        resolutionNote: row.resolution_note || undefined
      };
    });
  },

  /**
   * Resolve a manual review record in public.manual_reviews
   */
  async updateManualReviewStatus(
    reviewId: string,
    projectId: string,
    action: ReviewStatus,
    reviewedByUserId?: string,
    note?: string
  ): Promise<void> {
    if (!reviewId || !projectId || !isSupabaseConfigured) return;

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('manual_reviews')
      .update({
        status: action,
        reviewed_by: reviewedByUserId || null,
        reviewed_at: now,
        resolution_note: note || `Review marked as ${action}`
      })
      .eq('id', reviewId)
      .eq('project_id', projectId);

    if (error) {
      console.error('[paymentAlertsService] Error updating manual_review:', error);
      throw new Error(error.message || 'Failed to update manual review in Supabase.');
    }
  }
};
