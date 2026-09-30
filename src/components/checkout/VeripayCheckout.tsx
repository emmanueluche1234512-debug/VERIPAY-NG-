import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Building2,
  ArrowRight
} from 'lucide-react';
import { CheckoutPaymentStatus, Currency, SafeCheckoutOrder } from '../../types';
import { ordersService } from '../../services/orders';
import { VeripayCheckoutClient } from '../../lib/checkout/client';

export interface VeripayCheckoutProps {
  /**
   * Single-order public checkout token (e.g. "chk_live_...").
   * Scoped strictly to ONE pending order.
   * NEVER pass a private project API key (vpay_live_...) to this component.
   */
  orderToken?: string;

  /**
   * Optional pre-loaded safe public checkout order object from the merchant backend.
   */
  order?: Partial<SafeCheckoutOrder>;

  /**
   * Optional status override for controlled state inspection in developer previews.
   */
  statusOverride?: CheckoutPaymentStatus;

  /**
   * Optional custom base URL for the merchant backend or VERIPAY API.
   */
  apiBaseUrl?: string;

  /**
   * Callback fired when customer clicks "[ I HAVE MADE THE TRANSFER ]".
   * Note: This does NOT mean payment is verified; order remains pending.
   */
  onTransferSubmitted?: (info: { orderId: string; checkoutStatus: CheckoutPaymentStatus }) => void;

  /**
   * Callback fired only when the trusted backend confirms status === 'VERIFIED'.
   */
  onVerified?: (order: SafeCheckoutOrder) => void;

  /**
   * Callback fired if the payment request window expires.
   */
  onExpired?: (order: SafeCheckoutOrder) => void;

  className?: string;
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£'
};

const EMPTY_SAFE_ORDER: SafeCheckoutOrder = {
  id: '',
  checkoutToken: '',
  merchantReference: '',
  amount: 0,
  currency: 'NGN',
  expectedPayerName: '',
  receivingBank: {
    bankName: '',
    accountName: '',
    accountNumber: ''
  },
  status: 'pending',
  checkoutStatus: 'AWAITING_TRANSFER',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString()
};

export const VeripayCheckout: React.FC<VeripayCheckoutProps> = ({
  orderToken,
  order: initialOrderProp,
  statusOverride,
  apiBaseUrl,
  onTransferSubmitted,
  onVerified,
  onExpired,
  className = ''
}) => {
  const [checkoutOrder, setCheckoutOrder] = useState<SafeCheckoutOrder>(() => ({
    ...EMPTY_SAFE_ORDER,
    ...initialOrderProp,
    receivingBank: {
      ...EMPTY_SAFE_ORDER.receivingBank,
      ...(initialOrderProp?.receivingBank || {})
    }
  }));

  const [loading, setLoading] = useState<boolean>(Boolean(orderToken && !initialOrderProp));
  const [error, setError] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [copiedReference, setCopiedReference] = useState<boolean>(false);
  const [submittingTransfer, setSubmittingTransfer] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(2700);

  // Sync when initialOrderProp updates
  useEffect(() => {
    if (initialOrderProp) {
      setCheckoutOrder(prev => ({
        ...prev,
        ...initialOrderProp,
        receivingBank: {
          ...prev.receivingBank,
          ...(initialOrderProp.receivingBank || {})
        }
      }));
    }
  }, [initialOrderProp]);

  // Load order from orderToken via VERIPAY Server API (GET /api/v1/checkout/:token)
  const fetchSessionByToken = useCallback(async () => {
    if (!orderToken) return;

    // Security guard: prevent developers from accidentally passing secret API key
    if (orderToken.startsWith('vpay_')) {
      setError(
        'Security Error: Do not pass a private vpay_ API key to VeripayCheckout. Use a single-order checkoutToken (chk_...).'
      );
      setLoading(false);
      return;
    }

    try {
      const client = new VeripayCheckoutClient({ apiBaseUrl });
      const fetched = await client.getCheckoutSession(orderToken);
      setCheckoutOrder(fetched);
      setError(null);
      if (fetched.checkoutStatus === 'VERIFIED') {
        onVerified?.(fetched);
      } else if (fetched.checkoutStatus === 'EXPIRED') {
        onExpired?.(fetched);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load checkout session from VERIPAY server.');
    } finally {
      setLoading(false);
    }
  }, [orderToken, apiBaseUrl, onVerified, onExpired]);

  useEffect(() => {
    if (orderToken) {
      fetchSessionByToken();
    }
  }, [orderToken, fetchSessionByToken]);

  // Countdown timer for order expiry
  useEffect(() => {
    const updateTimer = () => {
      const expiresMs = new Date(checkoutOrder.expiresAt).getTime();
      const diffSec = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setRemainingSeconds(diffSec);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [checkoutOrder.expiresAt]);

  const effectiveStatus: CheckoutPaymentStatus = statusOverride || checkoutOrder.checkoutStatus;
  const currencySymbol = CURRENCY_SYMBOLS[checkoutOrder.currency] || '₦';
  const formattedAmount = Number(checkoutOrder.amount || 0).toLocaleString();
  const hasBankConfigured = Boolean(
    checkoutOrder.receivingBank.bankName && checkoutOrder.receivingBank.accountNumber
  );

  const handleCopyAccountNumber = () => {
    if (!checkoutOrder.receivingBank.accountNumber) return;
    navigator.clipboard.writeText(checkoutOrder.receivingBank.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2200);
  };

  const handleCopyReference = () => {
    if (!checkoutOrder.merchantReference) return;
    navigator.clipboard.writeText(checkoutOrder.merchantReference);
    setCopiedReference(true);
    setTimeout(() => setCopiedReference(false), 2200);
  };

  /**
   * Customer clicks "[ I HAVE MADE THE TRANSFER ]"
   * SECURITY INVARIANT:
   * Never marks an order as paid/verified on the frontend.
   * Only informs VERIPAY that the customer claims they transferred,
   * transitioning UI state to CHECKING_PAYMENT ("Checking for your transfer...").
   */
  const handleConfirmTransferSent = async () => {
    if (submittingTransfer || effectiveStatus === 'VERIFIED' || effectiveStatus === 'EXPIRED') {
      return;
    }

    setSubmittingTransfer(true);
    setError(null);

    try {
      const targetToken = orderToken || checkoutOrder.checkoutToken;
      let nextStatus: CheckoutPaymentStatus = 'CHECKING_PAYMENT';
      const markedAt = new Date().toISOString();

      if (targetToken && targetToken.startsWith('chk_')) {
        const client = new VeripayCheckoutClient({ apiBaseUrl });
        const apiRes = await client.confirmTransferSent(targetToken);
        nextStatus = apiRes.checkoutStatus;
      } else if (checkoutOrder.id) {
        const localRes = await ordersService.recordCustomerTransferNotification({
          orderId: checkoutOrder.id
        });
        nextStatus = localRes.checkoutStatus;
      }

      setCheckoutOrder(prev => ({
        ...prev,
        checkoutStatus: nextStatus,
        customerMarkedTransferredAt: markedAt
      }));

      onTransferSubmitted?.({
        orderId: checkoutOrder.id,
        checkoutStatus: nextStatus
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to notify transfer status. Please try again.');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  };

  const getStatusMessage = (status: CheckoutPaymentStatus): {
    label: string;
    message: string;
    subtext: string;
    tone: 'neutral' | 'checking' | 'verified' | 'review' | 'expired';
  } => {
    switch (status) {
      case 'AWAITING_TRANSFER':
        return {
          label: 'AWAITING_TRANSFER',
          message: `Transfer exactly ${currencySymbol}${formattedAmount} to the account above.`,
          subtext: 'Click "I HAVE MADE THE TRANSFER" after sending funds from your bank app.',
          tone: 'neutral'
        };
      case 'CHECKING_PAYMENT':
        return {
          label: 'CHECKING_PAYMENT',
          message: 'Checking for your transfer...',
          subtext: 'Waiting for payment verification from the merchant bank alert channel.',
          tone: 'checking'
        };
      case 'VERIFIED':
        return {
          label: 'VERIFIED',
          message: 'Payment verified successfully.',
          subtext: 'Your bank transfer has been deterministically matched and confirmed.',
          tone: 'verified'
        };
      case 'MANUAL_REVIEW':
        return {
          label: 'MANUAL_REVIEW',
          message: 'Your transfer has been detected and is being reviewed.',
          subtext: 'Our verification queue is reviewing your transfer details.',
          tone: 'review'
        };
      case 'EXPIRED':
        return {
          label: 'EXPIRED',
          message: 'This payment request has expired.',
          subtext: 'Please generate a new checkout order before making a bank transfer.',
          tone: 'expired'
        };
    }
  };

  const statusMeta = getStatusMessage(effectiveStatus);

  if (loading) {
    return (
      <div className={`w-full max-w-md mx-auto bg-white rounded-xl border border-[#DEE2E6] p-6 shadow-xs ${className}`}>
        <div className="flex items-center justify-center gap-2.5 py-8 text-xs text-[#6C757D]">
          <Loader2 className="w-4 h-4 animate-spin text-[#0B0D11]" />
          <span>Loading bank transfer checkout...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full max-w-md mx-auto bg-white rounded-xl border border-[#DEE2E6] shadow-xs overflow-hidden text-xs text-[#0F1115] ${className}`}
    >
      {/* Top Checkout Header */}
      <div className="px-5 py-4 bg-[#0B0D11] text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white text-[#0B0D11] flex items-center justify-center font-bold text-xs tracking-wider shrink-0">
            VP
          </div>
          <div>
            <span className="text-xs font-bold tracking-tight block">VERIPAY NG</span>
            <span className="text-[10px] font-mono text-[#ADB5BD] uppercase tracking-wider block">
              BANK TRANSFER
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-[#ADB5BD] block">
            Pay {checkoutOrder.currency} {formattedAmount}
          </span>
          <span className="text-sm font-mono font-bold tabular-nums text-white">
            {currencySymbol}
            {formattedAmount}
          </span>
        </div>
      </div>

      {/* Security Error Banner if misused */}
      {error && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-2 text-[11px]">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Transfer Instructions */}
      <div className="p-5 space-y-4">
        {/* Exact Amount Box */}
        <div className="text-center py-3 px-4 rounded-lg bg-[#F8F9FA] border border-[#E9ECEF]">
          <span className="text-[11px] text-[#6C757D] font-medium block">
            Transfer exactly
          </span>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-[#0B0D11] tracking-tight mt-0.5">
            {currencySymbol}
            {formattedAmount}
          </div>
          <div className="mt-1 flex items-center justify-center gap-2 text-[11px] text-[#6C757D]">
            <span>to the account below · Expires in</span>
            <span className="font-mono font-semibold tabular-nums text-[#0B0D11]">
              {effectiveStatus === 'EXPIRED' ? '00:00' : formatCountdown(remainingSeconds)}
            </span>
          </div>
        </div>

        {/* Destination Bank Details ("to:") */}
        <div className="rounded-lg border border-[#CED4DA] bg-white p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6C757D]">
              to:
            </span>
            <Building2 className="w-3.5 h-3.5 text-[#6C757D]" />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6C757D]">Bank Name</span>
              <span className="text-xs font-bold text-[#0B0D11] uppercase">
                {checkoutOrder.receivingBank.bankName || 'Not Configured'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6C757D]">Beneficiary</span>
              <span className="text-xs font-semibold text-[#0B0D11] text-right">
                {checkoutOrder.receivingBank.accountName || 'Not Configured'}
              </span>
            </div>

            <div className="pt-1 border-t border-[#F1F3F5] flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-[#6C757D] uppercase font-semibold block">
                  Account Number
                </span>
                <span className="text-base font-mono font-bold tabular-nums tracking-wider text-[#0B0D11]">
                  {checkoutOrder.receivingBank.accountNumber || '—'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyAccountNumber}
                disabled={!hasBankConfigured}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono font-semibold bg-[#0B0D11] text-white hover:bg-[#1E232B] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {copiedAccount ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>COPY ACCOUNT NUMBER</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Order Reference & Expected Payer */}
        <div className="rounded-lg border border-[#E9ECEF] bg-[#F8F9FA] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#6C757D] block">
                ORDER REFERENCE
              </span>
              <span className="text-xs font-mono font-bold text-[#0B0D11]">
                {checkoutOrder.merchantReference || '—'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyReference}
              disabled={!checkoutOrder.merchantReference}
              className="text-[11px] font-medium text-[#495057] hover:text-[#0B0D11] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {copiedReference ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Ref</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-[#E9ECEF]">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#6C757D] block">
              EXPECTED PAYER
            </span>
            <span className="text-xs font-semibold text-[#0B0D11] block mt-0.5">
              {checkoutOrder.expectedPayerName || '—'}
            </span>
          </div>
        </div>

        {/* Action Button: "[ I HAVE MADE THE TRANSFER ]" */}
        {effectiveStatus !== 'VERIFIED' && effectiveStatus !== 'EXPIRED' && (
          <button
            type="button"
            onClick={handleConfirmTransferSent}
            disabled={submittingTransfer || effectiveStatus === 'CHECKING_PAYMENT'}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              effectiveStatus === 'CHECKING_PAYMENT'
                ? 'bg-[#E9ECEF] text-[#495057] cursor-default'
                : 'bg-[#0B0D11] text-white hover:bg-[#1E232B]'
            }`}
          >
            {submittingTransfer ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>NOTIFYING VERIPAY...</span>
              </>
            ) : effectiveStatus === 'CHECKING_PAYMENT' ? (
              <>
                <Clock className="w-4 h-4 text-amber-700" />
                <span>TRANSFER NOTIFICATION RECEIVED</span>
              </>
            ) : (
              <>
                <span>I HAVE MADE THE TRANSFER</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}

        {/* Verification Status Banner */}
        <div
          className={`p-3.5 rounded-lg border flex items-start gap-2.5 ${
            statusMeta.tone === 'verified'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : statusMeta.tone === 'checking'
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : statusMeta.tone === 'review'
              ? 'bg-blue-50 border-blue-200 text-blue-950'
              : statusMeta.tone === 'expired'
              ? 'bg-red-50 border-red-200 text-red-950'
              : 'bg-[#F8F9FA] border-[#E9ECEF] text-[#212529]'
          }`}
        >
          {statusMeta.tone === 'verified' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          ) : statusMeta.tone === 'checking' ? (
            <Loader2 className="w-4 h-4 text-amber-700 animate-spin shrink-0 mt-0.5" />
          ) : statusMeta.tone === 'expired' ? (
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          ) : (
            <Clock className="w-4 h-4 text-[#495057] shrink-0 mt-0.5" />
          )}

          <div className="space-y-0.5 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-xs block">{statusMeta.message}</span>
              <span className="font-mono text-[10px] opacity-75 shrink-0">{statusMeta.label}</span>
            </div>
            <p className="text-[11px] opacity-85 leading-relaxed">{statusMeta.subtext}</p>
            {effectiveStatus === 'CHECKING_PAYMENT' && (
              <p className="text-[10px] font-mono text-amber-900 pt-1">
                Waiting for payment verification...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Subtle Security Footer */}
      <div className="px-5 py-3 bg-[#F8F9FA] border-t border-[#E9ECEF] flex items-center justify-between text-[10px] text-[#6C757D]">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>Direct Bank Transfer • Never enter card details, PINs, or OTPs</span>
        </span>
        <span className="font-mono font-semibold text-[#0B0D11]">VERIPAY NG</span>
      </div>
    </div>
  );
};
