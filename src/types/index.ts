/**
 * Veripay NG — Core Domain Types & Interfaces
 * Phase 1 Architecture
 */

export type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP';

export interface ReceivingBankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: Currency;
}

export interface Project {
  id: string;
  name: string;
  websiteUrl: string;
  currency: Currency;
  status: 'active' | 'archived';
  createdAt: string;
  receivingBank: ReceivingBankAccount;
}

export type OrderStatus = 'pending' | 'verified' | 'manual_review' | 'expired' | 'cancelled';

export type CheckoutPaymentStatus =
  | 'AWAITING_TRANSFER'
  | 'CHECKING_PAYMENT'
  | 'VERIFIED'
  | 'MANUAL_REVIEW'
  | 'EXPIRED';

export interface Order {
  id: string;
  projectId: string;
  merchantOrderReference: string;
  amount: number;
  currency: Currency;
  expectedPayerName: string;
  payerBank?: string;
  status: OrderStatus;
  createdAt: string;
  expiresAt: string;
  verifiedAt?: string;
  matchedPaymentAlertId?: string;
  checkoutToken?: string;
  customerMarkedTransferredAt?: string;
  metadata?: Record<string, string>;
}

/**
 * Safe public order representation returned to <VeripayCheckout />.
 * NEVER includes private API keys, project secrets, or unrelated orders.
 */
export interface SafeCheckoutOrder {
  id: string;
  checkoutToken: string;
  merchantReference: string;
  amount: number;
  currency: Currency;
  expectedPayerName: string;
  payerBank?: string;
  receivingBank: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  status: OrderStatus;
  checkoutStatus: CheckoutPaymentStatus;
  createdAt: string;
  expiresAt: string;
  verifiedAt?: string;
  customerMarkedTransferredAt?: string;
}

export type AlertType = 'CREDIT' | 'DEBIT' | 'WITHDRAWAL' | 'TRANSFER_OUT' | 'REVERSAL' | 'UNKNOWN';

export interface PaymentAlert {
  id: string;
  projectId: string;
  amount: number;
  currency: Currency;
  senderName: string;
  alertType: AlertType;
  bankName: string;
  transactionTime: string;
  transactionReference?: string;
  rawSnippet?: string;
  confidence: number;
  ambiguities?: string[];
  status: 'VERIFIED' | 'MANUAL_REVIEW' | 'UNMATCHED';
  matchedOrderId?: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'left_unmatched';

export interface ManualReviewItem {
  id: string;
  projectId: string;
  paymentAlert: PaymentAlert;
  candidateOrders: Order[];
  reason: string;
  status: ReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  resolutionNote?: string;
}

export type ApiKeyScope = 
  | 'project:read'
  | 'bank_accounts:read' 
  | 'bank_accounts:write' 
  | 'gmail_connection:read' 
  | 'gmail_connection:manage' 
  | 'orders:read' 
  | 'orders:create' 
  | 'transactions:read';

export interface ApiKey {
  id: string;
  projectId: string;
  name: string;
  prefix: string; // e.g., 'vpy_test_8f29...'
  environment: 'test' | 'live';
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt?: string;
  status: 'active' | 'revoked';
}

export type GmailConnectionStatus = 
  | 'connected' 
  | 'not_connected' 
  | 'expired' 
  | 'reauth_required' 
  | 'disconnected';

export interface GmailConnection {
  id: string;
  projectId: string;
  email: string;
  status: GmailConnectionStatus;
  connectedAt: string;
  lastSuccessfulSync?: string;
}

export interface MerchantBankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: Currency;
  isPrimary?: boolean;
}

export interface MerchantIntegrationStatus {
  connected: boolean;
  projectName: string;
  projectId: string;
  currency: Currency;
  bankAccount: MerchantBankAccount;
  gmailConnection: GmailConnection | null;
  lastUpdated: string;
}

export type WebhookEvent = 
  | 'payment.verified' 
  | 'payment.manual_review' 
  | 'payment.expired' 
  | 'payment.unmatched';

export interface WebhookEndpoint {
  id: string;
  projectId: string;
  url: string;
  events: WebhookEvent[];
  status: 'active' | 'disabled';
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: WebhookEvent;
  statusCode: number;
  attemptTime: string;
  status: 'success' | 'failed' | 'retrying';
  latencyMs: number;
  payloadSummary: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'payment_verified' | 'manual_review' | 'security' | 'system';
  createdAt: string;
  read: boolean;
  link?: string;
}

export interface AuditLogEntry {
  id: string;
  projectId?: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'Developer' | 'Admin' | 'Viewer';
  company?: string;
}

export type AppRoute = 
  | '/'
  | '/signin'
  | '/signup'
  | '/forgot-password'
  | '/reset-password'
  | '/dashboard'
  | '/projects'
  | '/orders'
  | '/transactions'
  | '/manual-review'
  | '/integrations'
  | '/api-keys'
  | '/webhooks'
  | '/notifications'
  | '/docs'
  | '/settings'
  | '/merchant-admin';
