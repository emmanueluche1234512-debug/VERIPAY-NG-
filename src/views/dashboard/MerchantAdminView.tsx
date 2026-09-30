import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { VeripayAdminSettings } from '../../components/merchant/MerchantVeripaySettings';
import { VeripayCheckout } from '../../components/checkout/VeripayCheckout';
import { CheckoutPaymentStatus, SafeCheckoutOrder } from '../../types';
import {
  Copy,
  Check,
  Server,
  Monitor,
  ShoppingCart,
  ShieldCheck,
  Terminal,
  Plus
} from 'lucide-react';

export const MerchantAdminView: React.FC = () => {
  const { activeProject, orders, createOrder, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<
    'admin_preview' | 'checkout_preview' | 'aistudio_prompt' | 'sdk_code'
  >('admin_preview');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Scoped strictly to activeProject.id
  const selectedProjectId = activeProject?.id || '';
  const projectOrders = selectedProjectId
    ? orders.filter(o => o.projectId === selectedProjectId)
    : [];
  const latestProjectOrder =
    projectOrders.find(o => o.status === 'pending') || projectOrders[0] || null;

  // Checkout Order creation / preview states synced to real project orders
  const [checkoutStatusPreview, setCheckoutStatusPreview] = useState<
    CheckoutPaymentStatus | undefined
  >(undefined);
  const [orderAmount, setOrderAmount] = useState<number>(latestProjectOrder?.amount || 0);
  const [orderRef, setOrderRef] = useState<string>(
    latestProjectOrder?.merchantOrderReference || ''
  );
  const [orderPayer, setOrderPayer] = useState<string>(
    latestProjectOrder?.expectedPayerName || ''
  );
  const [creatingLiveOrder, setCreatingLiveOrder] = useState<boolean>(false);
  const [createdOrderNotice, setCreatedOrderNotice] = useState<string | null>(null);

  // Sync form fields whenever selected project or its latest order changes
  useEffect(() => {
    setOrderAmount(latestProjectOrder?.amount || 0);
    setOrderRef(latestProjectOrder?.merchantOrderReference || '');
    setOrderPayer(latestProjectOrder?.expectedPayerName || '');
    setCheckoutStatusPreview(undefined);
  }, [selectedProjectId, latestProjectOrder?.id]);

  const previewSafeOrder: SafeCheckoutOrder = {
    id: latestProjectOrder?.id || '',
    checkoutToken: latestProjectOrder?.checkoutToken || '',
    merchantReference: orderRef || latestProjectOrder?.merchantOrderReference || '',
    amount: orderAmount || latestProjectOrder?.amount || 0,
    currency: activeProject?.currency || 'NGN',
    expectedPayerName: orderPayer || latestProjectOrder?.expectedPayerName || '',
    receivingBank: {
      bankName: activeProject?.receivingBank?.bankName || '',
      accountName: activeProject?.receivingBank?.accountName || '',
      accountNumber: activeProject?.receivingBank?.accountNumber || ''
    },
    status: latestProjectOrder?.status || 'pending',
    checkoutStatus: latestProjectOrder?.customerMarkedTransferredAt
      ? 'CHECKING_PAYMENT'
      : 'AWAITING_TRANSFER',
    createdAt: latestProjectOrder?.createdAt || new Date().toISOString(),
    expiresAt:
      latestProjectOrder?.expiresAt || new Date(Date.now() + 45 * 60 * 1000).toISOString()
  };

  const handleCreateLiveCheckoutOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || creatingLiveOrder) return;
    if (!orderAmount || orderAmount <= 0 || !orderPayer.trim()) return;

    setCreatingLiveOrder(true);
    setCreatedOrderNotice(null);
    try {
      const refToUse =
        orderRef.trim() || `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
      await createOrder({
        merchantOrderReference: refToUse,
        amount: orderAmount,
        currency: activeProject.currency,
        expectedPayerName: orderPayer.trim().toUpperCase()
      });
      setOrderRef(refToUse);
      setCheckoutStatusPreview(undefined);
      setCreatedOrderNotice(`Created pending order ${refToUse} in project ${activeProject.name}.`);
      setTimeout(() => setCreatedOrderNotice(null), 4000);
    } catch (err: any) {
      console.warn('Error creating checkout order:', err?.message);
    } finally {
      setCreatingLiveOrder(false);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2200);
  };

  const serverSdkCode = `// 1. VERIPAY SERVER SDK / API (Merchant Website Backend)
// File: server/veripay.ts
// SECURITY INVARIANT: Never place VERIPAY_API_KEY in VITE_* or browser code.
import { VeripayClient } from '@veripay/sdk';

export const veripay = new VeripayClient({
  apiKey: process.env.VERIPAY_API_KEY!, // Project-scoped secret key (vpay_live_...)
  baseUrl: process.env.VERIPAY_BASE_URL || '${window.location.origin}'
});

// Create a pending bank-transfer order from your merchant backend
export async function createCheckoutSession(req, res) {
  const { order, checkoutToken } = await veripay.orders.create({
    merchantReference: req.body.merchantReference,
    amount: Number(req.body.amount),
    currency: '${activeProject?.currency || 'NGN'}',
    expectedPayerName: req.body.expectedPayerName
  });

  // Return ONLY the single-order checkoutToken and safe public details to the browser
  res.status(201).json({
    checkoutToken,
    order
  });
}`;

  const adminComponentCode = `// 2. VERIPAY MERCHANT ADMIN COMPONENT
// Location: Merchant Admin Panel -> Settings -> Payment & Bank Details -> VERIPAY NG
import React from 'react';
import { MerchantVeripaySettings } from '@veripay/sdk';

export function MerchantPaymentSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">Payment & Bank Details</h1>

      {/* Business owner manages Bank Account & Gmail OAuth without visiting Veripay Console */}
      <MerchantVeripaySettings
        projectId="${activeProject?.id || ''}"
        projectName="${activeProject?.name || ''}"
        proxyBaseUrl="/api/veripay-admin"
      />
    </div>
  );
}`;

  const checkoutComponentCode = `// 3. VERIPAY CUSTOMER CHECKOUT COMPONENT
// Location: Customer Website Checkout -> Pay with Bank Transfer
import React from 'react';
import { VeripayCheckout } from '@veripay/sdk';

export function CustomerBankTransferCheckout({ safeCheckoutToken }: { safeCheckoutToken: string }) {
  return (
    <VeripayCheckout
      // Scoped strictly to ONE order (chk_live_...). Never pass a secret API key!
      orderToken={safeCheckoutToken}
      onTransferSubmitted={({ orderId, checkoutStatus }) => {
        // Transitions UI to CHECKING_PAYMENT ("Checking for your transfer...")
        // Order remains pending until trusted VERIPAY backend confirms bank alert
        console.log('Customer signaled transfer for order:', orderId, checkoutStatus);
      }}
      onVerified={(verifiedOrder) => {
        window.location.href = \`/order-confirmed/\${verifiedOrder.merchantReference}\`;
      }}
    />
  );
}`;

  const aiStudioPrompt = `Integrate VERIPAY NG (Verified Bank Transfer Payment System) into this application as three layers:

IMPORTANT SECURITY RULES:
- VERIPAY NG verifies bank transfer payments. NEVER request or collect card numbers, CVV, card expiry, bank passwords, PINs, OTPs, or internet banking credentials.
- NEVER place the private VERIPAY API key in frontend code or VITE_VERIPAY_SECRET_KEY. Store it strictly on the server as process.env.VERIPAY_API_KEY.
- Clicking "[ I HAVE MADE THE TRANSFER ]" must NEVER automatically mark an order as paid. It only transitions the checkout status to CHECKING_PAYMENT ("Waiting for payment verification...") until the backend confirms payment.

1. SERVER BACKEND ROUTES (/api/veripay/*):
Connect to VERIPAY API (${window.location.origin}/api/v1) using Authorization: Bearer \${process.env.VERIPAY_API_KEY}:
- GET /api/veripay/admin/status -> calls GET /api/v1/project, GET /api/v1/bank-account, and GET /api/v1/gmail-connection
- PATCH /api/veripay/admin/bank-account -> calls PATCH /api/v1/bank-account
- POST /api/veripay/admin/gmail/connect -> calls POST /api/v1/gmail-connection/connect
- POST /api/veripay/admin/gmail/disconnect -> calls POST /api/v1/gmail-connection/disconnect
- POST /api/veripay/checkout/create-order -> calls POST /api/v1/orders with { merchantReference, amount, currency: "${activeProject?.currency || 'NGN'}", expectedPayerName } and returns safe { order, checkoutToken }
- POST /api/veripay/checkout/:token/confirm-transfer -> calls POST /api/v1/checkout/:token/confirm-transfer

2. ADMIN SIDE (Admin Panel -> Settings -> Payment Settings -> VERIPAY NG):
Add a native Payment & Bank Configuration section displaying:
- Connection Status: Connected
- RECEIVING BANK ACCOUNT form: Bank Name, 10-digit NUBAN Account Number, Account Name / Beneficiary, Settlement Currency (${activeProject?.currency || 'NGN'}), and "[ Save Configuration ]" button.
- BANK ALERT GMAIL section: Shows Connected Gmail + "[ Change Gmail ]", "[ Reconnect ]", "[ Disconnect Gmail ]" if connected via Google OAuth, or "Status: Not Connected" + "[ Connect Gmail ]" button. Do not fake Gmail connection; initiate real OAuth via backend.

3. CUSTOMER SIDE (Checkout -> Pay with Bank Transfer using VERIPAY):
Display a compact, clean VERIPAY NG Bank Transfer Checkout card showing:
- Header: "VP VERIPAY NG" | "Pay ${activeProject?.currency || 'NGN'} {amount}" | "BANK TRANSFER"
- "Transfer exactly: ₦{amount}"
- "TO:" Bank Name (${activeProject?.receivingBank?.bankName || 'Not Configured'}), Beneficiary (${activeProject?.receivingBank?.accountName || 'Not Configured'}), Account Number (${activeProject?.receivingBank?.accountNumber || 'Not Configured'}) with "[ COPY ACCOUNT NUMBER ]" button
- ORDER REFERENCE
- EXPECTED PAYER / ACCOUNT HOLDER
- "[ I HAVE MADE THE TRANSFER ]" button
- Verification Status banner supporting: AWAITING_TRANSFER, CHECKING_PAYMENT ("Checking for your transfer..."), VERIFIED, MANUAL_REVIEW, and EXPIRED.`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B0D11] tracking-tight">
            Installable Merchant Admin &amp; Checkout Integration
          </h2>
          <p className="text-xs text-[#6C757D] mt-0.5">
            Three reusable integration layers for external websites: Server SDK, Merchant Admin Settings, and Customer Bank-Transfer Checkout.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center bg-[#F1F3F5] p-1 rounded-lg border border-[#E9ECEF] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('admin_preview')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'admin_preview'
                ? 'bg-white text-[#0B0D11] shadow-2xs'
                : 'text-[#6C757D] hover:text-[#0B0D11]'
            }`}
          >
            1. Merchant Admin Component
          </button>
          <button
            onClick={() => setActiveTab('checkout_preview')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'checkout_preview'
                ? 'bg-white text-[#0B0D11] shadow-2xs'
                : 'text-[#6C757D] hover:text-[#0B0D11]'
            }`}
          >
            2. Customer Checkout Component
          </button>
          <button
            onClick={() => setActiveTab('aistudio_prompt')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'aistudio_prompt'
                ? 'bg-white text-[#0B0D11] shadow-2xs'
                : 'text-[#6C757D] hover:text-[#0B0D11]'
            }`}
          >
            3. AI Studio Install Prompt
          </button>
          <button
            onClick={() => setActiveTab('sdk_code')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'sdk_code'
                ? 'bg-white text-[#0B0D11] shadow-2xs'
                : 'text-[#6C757D] hover:text-[#0B0D11]'
            }`}
          >
            4. Server SDK &amp; Code
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MERCHANT ADMIN COMPONENT PREVIEW */}
      {/* ==================================================================== */}
      {activeTab === 'admin_preview' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#CED4DA] bg-[#F8F9FA] shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-[#E9ECEF] border-b border-[#CED4DA] flex flex-wrap items-center justify-between gap-2 text-xs text-[#495057]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[#0B0D11] font-semibold">
                  Merchant Admin Panel &rarr; Settings &rarr; Payment Settings &rarr; VERIPAY NG
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#6C757D]">
                &lt;VeripayAdminSettings /&gt;
              </span>
            </div>

            <div className="p-6 bg-[#F8F9FA]">
              <div className="max-w-4xl mx-auto">
                <VeripayAdminSettings
                  projectId={activeProject?.id || ''}
                  projectName={activeProject?.name || ''}
                  onRefresh={refreshData}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: CUSTOMER CHECKOUT COMPONENT PREVIEW */}
      {/* ==================================================================== */}
      {activeTab === 'checkout_preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Live Customer Checkout Component */}
          <div className="lg:col-span-6 bg-[#F1F3F5] p-6 rounded-xl border border-[#CED4DA]">
            <div className="mb-4 flex items-center justify-between text-xs text-[#495057]">
              <span className="font-semibold text-[#0B0D11]">
                Customer Checkout Surface (&lt;VeripayCheckout /&gt;)
              </span>
              <span className="font-mono text-[11px]">
                {previewSafeOrder.checkoutToken
                  ? `Token: ${previewSafeOrder.checkoutToken.slice(0, 16)}...`
                  : 'No Pending Order'}
              </span>
            </div>

            <VeripayCheckout
              order={previewSafeOrder}
              statusOverride={checkoutStatusPreview}
              onTransferSubmitted={() => {
                setCheckoutStatusPreview('CHECKING_PAYMENT');
              }}
            />
          </div>

          {/* Right: Checkout Controls & Security Invariants */}
          <div className="lg:col-span-6 space-y-4">
            {/* Configure Real Order Parameters */}
            <div className="bg-white rounded-xl border border-[#E9ECEF] p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0B0D11]">
                    Create Live Checkout Order
                  </h3>
                  <p className="text-[11px] text-[#6C757D]">
                    Create a real pending order in{' '}
                    <strong className="text-[#0B0D11]">
                      {activeProject?.name || 'selected project'}
                    </strong>
                  </p>
                </div>
                <ShoppingCart className="w-4 h-4 text-[#0B0D11]" />
              </div>

              {createdOrderNotice && (
                <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium">
                  {createdOrderNotice}
                </div>
              )}

              <form onSubmit={handleCreateLiveCheckoutOrder} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#0B0D11] mb-1">
                      Order Amount ({activeProject?.currency || 'NGN'})
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={orderAmount || ''}
                      onChange={e => setOrderAmount(Number(e.target.value) || 0)}
                      placeholder="Enter amount"
                      className="w-full px-3 py-1.5 bg-white border border-[#CED4DA] rounded-md font-mono font-bold text-xs text-[#0B0D11]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#0B0D11] mb-1">
                      Order Reference
                    </label>
                    <input
                      type="text"
                      required
                      value={orderRef}
                      onChange={e => setOrderRef(e.target.value)}
                      placeholder="Merchant order reference"
                      className="w-full px-3 py-1.5 bg-white border border-[#CED4DA] rounded-md font-mono font-bold text-xs text-[#0B0D11]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#0B0D11] mb-1">
                    Expected Payer / Account Holder
                  </label>
                  <input
                    type="text"
                    required
                    value={orderPayer}
                    onChange={e => setOrderPayer(e.target.value)}
                    placeholder="Payer bank account name"
                    className="w-full px-3 py-1.5 bg-white border border-[#CED4DA] rounded-md text-xs text-[#0B0D11]"
                  />
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingLiveOrder || !activeProject}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0B0D11] text-white hover:bg-[#1E232B] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {creatingLiveOrder ? 'Creating Order...' : 'Create Live Pending Order'}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Inspect All 5 Required Checkout Statuses */}
            <div className="bg-white rounded-xl border border-[#E9ECEF] p-5 space-y-3 text-xs">
              <h4 className="font-bold text-[#0B0D11]">
                Inspect Checkout Verification Status States
              </h4>
              <p className="text-[11px] text-[#6C757D]">
                Click any status below to preview how <code className="font-mono text-[#0B0D11]">&lt;VeripayCheckout /&gt;</code> renders each lifecycle state. Note that in production, clicking <strong>[ I HAVE MADE THE TRANSFER ]</strong> only transitions to <code className="font-mono">CHECKING_PAYMENT</code> and never self-verifies.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {(
                  [
                    'AWAITING_TRANSFER',
                    'CHECKING_PAYMENT',
                    'VERIFIED',
                    'MANUAL_REVIEW',
                    'EXPIRED'
                  ] as CheckoutPaymentStatus[]
                ).map(st => {
                  const isCurrent =
                    (checkoutStatusPreview || previewSafeOrder.checkoutStatus) === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setCheckoutStatusPreview(st)}
                      className={`px-2.5 py-1.5 rounded-md font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#0B0D11] text-white'
                          : 'bg-[#F8F9FA] border border-[#CED4DA] text-[#495057] hover:text-[#0B0D11]'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkout Security Model Summary */}
            <div className="bg-white rounded-xl border border-[#E9ECEF] p-5 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#0B0D11]">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Zero-Custody Checkout Security Model</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-[#495057] list-disc pl-4">
                <li>
                  Receives only a single-order <code className="font-mono text-[#0B0D11]">orderToken</code> (<code className="font-mono">chk_live_...</code>) — never a project secret key.
                </li>
                <li>
                  Displays strictly public destination details: Bank Name, Account Name, Account Number, Amount, Order Reference, and Expected Payer.
                </li>
                <li>
                  Never collects card numbers, CVV, expiry dates, bank passwords, transaction PINs, or OTPs.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: GOOGLE AI STUDIO INSTALLATION EXPERIENCE */}
      {/* ==================================================================== */}
      {activeTab === 'aistudio_prompt' && (
        <div className="bg-white rounded-xl border border-[#E9ECEF] p-6 space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E9ECEF] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0B0D11]">
                Google AI Studio Integration Prompt (Copy &amp; Paste into Another Project)
              </h3>
              <p className="text-[#6C757D] mt-0.5">
                Copy this specification prompt and give it to any other Google AI Studio website project to install the VERIPAY Admin Settings and Customer Bank-Transfer Checkout.
              </p>
            </div>

            <button
              type="button"
              onClick={() => copyCode(aiStudioPrompt, 'aistudio')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B0D11] text-white hover:bg-[#1E232B] transition-colors cursor-pointer shrink-0"
            >
              {copiedSnippet === 'aistudio' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Prompt Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy AI Studio Integration Prompt</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-[#0B0D11] text-[#DEE2E6] rounded-xl p-5 font-mono text-[11px] leading-relaxed overflow-x-auto">
            <pre className="whitespace-pre-wrap">{aiStudioPrompt}</pre>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: SERVER SDK, ADMIN & CHECKOUT CODE */}
      {/* ==================================================================== */}
      {activeTab === 'sdk_code' && (
        <div className="space-y-6">
          {/* Snippet 1: Server SDK */}
          <div className="bg-[#0B0D11] text-white rounded-xl p-5 font-mono text-xs overflow-hidden shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E232B] text-[#CED4DA]">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#CED4DA]" />
                <span className="font-bold">1. VERIPAY Server SDK (Merchant Backend)</span>
              </div>
              <button
                type="button"
                onClick={() => copyCode(serverSdkCode, 'sdk')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1E232B] hover:bg-[#2A303C] text-[11px] text-white transition-colors cursor-pointer"
              >
                {copiedSnippet === 'sdk' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedSnippet === 'sdk' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-[#DEE2E6]">
              {serverSdkCode}
            </pre>
          </div>

          {/* Snippet 2: Merchant Admin Component */}
          <div className="bg-[#0B0D11] text-white rounded-xl p-5 font-mono text-xs overflow-hidden shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E232B] text-[#CED4DA]">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#CED4DA]" />
                <span className="font-bold">
                  2. VERIPAY Merchant Admin Component (&lt;VeripayAdminSettings /&gt;)
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyCode(adminComponentCode, 'admin')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1E232B] hover:bg-[#2A303C] text-[11px] text-white transition-colors cursor-pointer"
              >
                {copiedSnippet === 'admin' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedSnippet === 'admin' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-[#DEE2E6]">
              {adminComponentCode}
            </pre>
          </div>

          {/* Snippet 3: Customer Checkout Component */}
          <div className="bg-[#0B0D11] text-white rounded-xl p-5 font-mono text-xs overflow-hidden shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E232B] text-[#CED4DA]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#CED4DA]" />
                <span className="font-bold">
                  3. VERIPAY Customer Checkout Component (&lt;VeripayCheckout /&gt;)
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyCode(checkoutComponentCode, 'checkout')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1E232B] hover:bg-[#2A303C] text-[11px] text-white transition-colors cursor-pointer"
              >
                {copiedSnippet === 'checkout' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedSnippet === 'checkout' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-[#DEE2E6]">
              {checkoutComponentCode}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
