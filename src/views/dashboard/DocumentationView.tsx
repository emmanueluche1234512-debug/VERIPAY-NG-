import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Check,
  Copy
} from 'lucide-react';

export const DocumentationView: React.FC = () => {
  const { activeProject, navigate } = useApp();
  const [activeSection, setActiveSection] = useState<
    'overview' | 'server_sdk' | 'admin_component' | 'checkout_component' | 'aistudio_install' | 'webhooks'
  >('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B0D11] tracking-tight">
            Developer Documentation &amp; Integration Guide
          </h2>
          <p className="text-xs text-[#6C757D]">
            Installable Bank-Transfer Payment Verification System: Server SDK, Merchant Admin Settings, and Customer Checkout.
          </p>
        </div>

        <div className="px-3 py-1 bg-white border border-[#CED4DA] rounded text-xs font-mono">
          Phase 3A Specification
        </div>
      </div>

      {/* Docs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-1">
          <button
            onClick={() => setActiveSection('overview')}
            className={`w-full text-left px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === 'overview'
                ? 'bg-[#0B0D11] text-white'
                : 'text-[#495057] hover:bg-white hover:text-[#0B0D11]'
            }`}
          >
            01. Three Integration Layers
          </button>
          <button
            onClick={() => setActiveSection('server_sdk')}
            className={`w-full text-left px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === 'server_sdk'
                ? 'bg-[#0B0D11] text-white'
                : 'text-[#495057] hover:bg-white hover:text-[#0B0D11]'
            }`}
          >
            02. Server SDK &amp; API (`/api/v1`)
          </button>
          <button
            onClick={() => setActiveSection('admin_component')}
            className={`w-full text-left px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === 'admin_component'
                ? 'bg-[#0B0D11] text-white'
                : 'text-[#495057] hover:bg-white hover:text-[#0B0D11]'
            }`}
          >
            03. Merchant Admin Component
          </button>
          <button
            onClick={() => setActiveSection('checkout_component')}
            className={`w-full text-left px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === 'checkout_component'
                ? 'bg-[#0B0D11] text-white'
                : 'text-[#495057] hover:bg-white hover:text-[#0B0D11]'
            }`}
          >
            04. Customer Checkout Component
          </button>
          <button
            onClick={() => setActiveSection('aistudio_install')}
            className={`w-full text-left px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === 'aistudio_install'
                ? 'bg-[#0B0D11] text-white'
                : 'text-[#495057] hover:bg-white hover:text-[#0B0D11]'
            }`}
          >
            05. Google AI Studio Installation
          </button>
          <button
            onClick={() => setActiveSection('webhooks')}
            className={`w-full text-left px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === 'webhooks'
                ? 'bg-[#0B0D11] text-white'
                : 'text-[#495057] hover:bg-white hover:text-[#0B0D11]'
            }`}
          >
            06. Webhooks &amp; Signatures
          </button>
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-9 bg-white rounded-lg border border-[#E9ECEF] p-6 text-xs leading-relaxed space-y-6">
          {activeSection === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#0B0D11]">
                01. The Three VERIPAY Integration Layers
              </h3>
              <p className="text-[#495057]">
                VERIPAY NG is an installable bank-transfer payment verification system. It is NOT a card gateway and never collects card numbers, CVV, expiry dates, banking passwords, PINs, or OTPs.
              </p>

              <div className="p-4 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF] font-mono text-[11px] space-y-1">
                <div className="font-bold text-[#0B0D11] mb-2">Architecture &amp; Security Boundary:</div>
                <div>Customer / Merchant Admin Browser</div>
                <div>&nbsp;&nbsp;&darr; (Safe public checkout token or merchant session)</div>
                <div>Merchant Website Backend</div>
                <div>&nbsp;&nbsp;&darr; (Authorization: Bearer vpay_live_... stored in process.env.VERIPAY_API_KEY)</div>
                <div>VERIPAY API (/api/v1/*)</div>
                <div>&nbsp;&nbsp;&darr; (Project-scoped RLS &amp; SHA-256 credential validation)</div>
                <div>VERIPAY Supabase / Backend</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-lg border border-[#E9ECEF] bg-white space-y-1.5">
                  <span className="font-mono text-[10px] font-bold text-[#6C757D]">LAYER 1</span>
                  <h4 className="font-bold text-[#0B0D11]">Server SDK / API</h4>
                  <p className="text-[11px] text-[#6C757D]">
                    Authenticates your backend using project-scoped API keys (<code className="font-mono">vpay_live_...</code>) to manage bank accounts, Gmail OAuth, and create orders.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-[#E9ECEF] bg-white space-y-1.5">
                  <span className="font-mono text-[10px] font-bold text-[#6C757D]">LAYER 2</span>
                  <h4 className="font-bold text-[#0B0D11]">Merchant Admin Component</h4>
                  <p className="text-[11px] text-[#6C757D]">
                    <code className="font-mono text-[#0B0D11]">&lt;MerchantVeripaySettings /&gt;</code> lets the business owner update bank details and connect their bank-alert Gmail inside their own admin panel.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-[#E9ECEF] bg-white space-y-1.5">
                  <span className="font-mono text-[10px] font-bold text-[#6C757D]">LAYER 3</span>
                  <h4 className="font-bold text-[#0B0D11]">Customer Checkout</h4>
                  <p className="text-[11px] text-[#6C757D]">
                    <code className="font-mono text-[#0B0D11]">&lt;VeripayCheckout /&gt;</code> displays verified bank transfer instructions using a single-order <code className="font-mono">orderToken</code>.
                  </p>
                </div>
              </div>

              {/* 7-Step Conceptual Installation Flow */}
              <div className="pt-3 space-y-2.5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#0B0D11]">
                  7-Step Conceptual Installation Flow
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
                    <span className="font-mono font-bold text-[#0B0D11] block">STEP 1</span>
                    <span className="text-[#495057]">Developer creates a VERIPAY project in the console.</span>
                  </div>
                  <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
                    <span className="font-mono font-bold text-[#0B0D11] block">STEP 2</span>
                    <span className="text-[#495057]">Developer generates a project-scoped API credential (<code className="font-mono">vpay_live_...</code>).</span>
                  </div>
                  <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
                    <span className="font-mono font-bold text-[#0B0D11] block">STEP 3</span>
                    <span className="text-[#495057]">Private credential is installed ONLY on the merchant backend (<code className="font-mono text-[#0B0D11]">VERIPAY_API_KEY=...</code>, never inside <code className="font-mono text-red-700">VITE_*</code> variables).</span>
                  </div>
                  <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
                    <span className="font-mono font-bold text-[#0B0D11] block">STEP 4</span>
                    <span className="text-[#495057]">Merchant backend connects securely to the VERIPAY API (<code className="font-mono">/api/v1/*</code>).</span>
                  </div>
                  <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
                    <span className="font-mono font-bold text-[#0B0D11] block">STEP 5</span>
                    <span className="text-[#495057]">Merchant Admin Panel receives the <code className="font-mono text-[#0B0D11]">&lt;MerchantVeripaySettings /&gt;</code> component.</span>
                  </div>
                  <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
                    <span className="font-mono font-bold text-[#0B0D11] block">STEP 6</span>
                    <span className="text-[#495057]">Customer website checkout receives the <code className="font-mono text-[#0B0D11]">&lt;VeripayCheckout /&gt;</code> component with a single-order <code className="font-mono">orderToken</code>.</span>
                  </div>
                  <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF] sm:col-span-2">
                    <span className="font-mono font-bold text-[#0B0D11] block">STEP 7</span>
                    <span className="text-[#495057]">Later, VERIPAY sends a signed <code className="font-mono text-[#0B0D11]">payment.verified</code> webhook after trusted bank-alert verification.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'server_sdk' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#0B0D11]">
                  02. VERIPAY Server SDK &amp; REST Endpoints
                </h3>
                <p className="text-[#495057] mt-1">
                  Initialize <code className="font-mono text-[#0B0D11]">VeripayClient</code> strictly on your server. Never use <code className="font-mono text-red-700">VITE_VERIPAY_SECRET_KEY</code>.
                </p>
              </div>

              <div className="bg-[#0B0D11] text-[#CED4DA] p-4 rounded-md font-mono text-[11px] overflow-x-auto relative">
                <button
                  onClick={() =>
                    copyToClipboard(
                      `import { VeripayClient } from '@veripay/sdk';\n\nconst veripay = new VeripayClient({\n  apiKey: process.env.VERIPAY_API_KEY\n});\n\nconst { order, checkoutToken } = await veripay.orders.create({\n  merchantReference: "ORD-2026-001",\n  amount: 3000,\n  currency: "NGN",\n  expectedPayerName: "Customer Name"\n});`,
                      'sdk_init'
                    )
                  }
                  className="absolute top-2 right-2 p-1.5 bg-[#1E232B] hover:bg-[#2B303B] rounded text-white cursor-pointer"
                >
                  {copiedCode === 'sdk_init' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <pre>
{`import { VeripayClient } from '@veripay/sdk';

const veripay = new VeripayClient({
  apiKey: process.env.VERIPAY_API_KEY
});

const { order, checkoutToken } = await veripay.orders.create({
  merchantReference: "ORD-2026-001",
  amount: 3000,
  currency: "NGN",
  expectedPayerName: "Customer Name"
});`}
                </pre>
              </div>

              <div className="border border-[#E9ECEF] rounded-lg divide-y divide-[#E9ECEF] overflow-hidden">
                <div className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 mr-2">GET</span>
                    <code className="font-mono font-bold text-[#0B0D11]">/api/v1/project</code>
                  </div>
                  <span className="font-mono text-[11px] text-[#6C757D]">Scope: project:read</span>
                </div>
                <div className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 mr-2">GET</span>
                    <code className="font-mono font-bold text-[#0B0D11]">/api/v1/bank-account</code>
                  </div>
                  <span className="font-mono text-[11px] text-[#6C757D]">Scope: bank_accounts:read</span>
                </div>
                <div className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 mr-2">PATCH</span>
                    <code className="font-mono font-bold text-[#0B0D11]">/api/v1/bank-account</code>
                  </div>
                  <span className="font-mono text-[11px] text-[#6C757D]">Scope: bank_accounts:write</span>
                </div>
                <div className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 mr-2">GET</span>
                    <code className="font-mono font-bold text-[#0B0D11]">/api/v1/gmail-connection</code>
                  </div>
                  <span className="font-mono text-[11px] text-[#6C757D]">Scope: gmail_connection:read</span>
                </div>
                <div className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 mr-2">POST</span>
                    <code className="font-mono font-bold text-[#0B0D11]">/api/v1/gmail-connection/connect</code>
                  </div>
                  <span className="font-mono text-[11px] text-[#6C757D]">Scope: gmail_connection:manage</span>
                </div>
                <div className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-700 mr-2">POST</span>
                    <code className="font-mono font-bold text-[#0B0D11]">/api/v1/gmail-connection/disconnect</code>
                  </div>
                  <span className="font-mono text-[11px] text-[#6C757D]">Scope: gmail_connection:manage</span>
                </div>
                <div className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 mr-2">POST</span>
                    <code className="font-mono font-bold text-[#0B0D11]">/api/v1/orders</code>
                  </div>
                  <span className="font-mono text-[11px] text-[#6C757D]">Scope: orders:create</span>
                </div>
                <div className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 mr-2">GET</span>
                    <code className="font-mono font-bold text-[#0B0D11]">/api/v1/orders/:id</code>
                  </div>
                  <span className="font-mono text-[11px] text-[#6C757D]">Scope: orders:read</span>
                </div>
                <div className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 mr-2">GET</span>
                    <code className="font-mono font-bold text-[#0B0D11]">/api/v1/orders/:id/status</code>
                  </div>
                  <span className="font-mono text-[11px] text-[#6C757D]">Scope: orders:read</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'admin_component' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#0B0D11]">
                03. VERIPAY Merchant Admin Component (`&lt;VeripayAdminSettings /&gt;`)
              </h3>
              <p className="text-[#495057]">
                Install inside the merchant website's own Admin Panel (<code className="font-mono">Settings &rarr; Payment Settings &rarr; VERIPAY NG</code>) so the business owner can update their Bank Name, Account Number, Account Name, Settlement Currency, and Bank Alert Gmail connection without logging into the VERIPAY developer console.
              </p>

              <div className="bg-[#0B0D11] text-[#CED4DA] p-4 rounded-md font-mono text-[11px] overflow-x-auto">
                <pre>
{`import { VeripayAdminSettings } from '@veripay/sdk';

export function StorePaymentSettings() {
  return (
    <VeripayAdminSettings
      projectName="${activeProject?.name || 'Merchant Store'}"
      proxyBaseUrl="/api/veripay-admin"
    />
  );
}`}
                </pre>
              </div>
            </div>
          )}

          {activeSection === 'checkout_component' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#0B0D11]">
                04. VERIPAY Customer Checkout Component (`&lt;VeripayCheckout /&gt;`)
              </h3>
              <p className="text-[#495057]">
                Install on the customer checkout page. Receives a single-order <code className="font-mono text-[#0B0D11]">orderToken</code> (<code className="font-mono">chk_live_...</code>) generated by your backend when creating the order.
              </p>

              <div className="bg-[#0B0D11] text-[#CED4DA] p-4 rounded-md font-mono text-[11px] overflow-x-auto">
                <pre>
{`import { VeripayCheckout } from '@veripay/sdk';

export function OrderCheckoutPage({ safeCheckoutToken }: { safeCheckoutToken: string }) {
  return (
    <VeripayCheckout
      orderToken={safeCheckoutToken}
    />
  );
}`}
                </pre>
              </div>

              <div className="p-4 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF] space-y-2">
                <span className="font-bold text-[#0B0D11] block">Supported Checkout Verification Statuses:</span>
                <ul className="space-y-1 font-mono text-[11px] text-[#495057]">
                  <li><strong>AWAITING_TRANSFER</strong> — "Transfer exactly ₦3,000 to the account above."</li>
                  <li><strong>CHECKING_PAYMENT</strong> — "Checking for your transfer..."</li>
                  <li><strong>VERIFIED</strong> — "Payment verified successfully."</li>
                  <li><strong>MANUAL_REVIEW</strong> — "Your transfer has been detected and is being reviewed."</li>
                  <li><strong>EXPIRED</strong> — "This payment request has expired."</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'aistudio_install' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#0B0D11]">
                05. Google AI Studio Installation Experience
              </h3>
              <p className="text-[#495057]">
                Open the <strong>Merchant Admin</strong> view to copy the complete one-click Google AI Studio integration prompt and preview both components side-by-side.
              </p>

              <button
                type="button"
                onClick={() => navigate('/merchant-admin')}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B0D11] text-white hover:bg-[#1E232B] transition-colors cursor-pointer"
              >
                Open Interactive Preview &amp; AI Studio Prompt &rarr;
              </button>
            </div>
          )}

          {activeSection === 'webhooks' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#0B0D11]">
                06. Future Webhook Flow (`payment.verified`)
              </h3>
              <p className="text-[#495057]">
                When the VERIPAY verification engine confirms a bank alert, it signs an outgoing webhook using HMAC SHA-256 (<code className="font-mono">X-Veripay-Signature</code>) so your merchant backend can mark the order as PAID.
              </p>

              <div className="bg-[#0B0D11] text-[#CED4DA] p-4 rounded-md font-mono text-[11px] overflow-x-auto">
                <pre>
{`VERIPAY verifies payment
  ↓
VERIPAY signs webhook (HMAC SHA-256)
  ↓
Merchant backend receives: payment.verified
  ↓
Merchant backend verifies signature
  ↓
Merchant order becomes PAID`}
                </pre>
              </div>

              <div className="p-3.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-lg flex items-center gap-2 text-[11px] text-[#495057]">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Never trust a frontend button click as proof of payment. Fulfill orders only upon verified backend status or signed webhook delivery.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
