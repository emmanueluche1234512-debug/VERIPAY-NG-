import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/common/Button';
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Mail, 
  Cpu, 
  Check, 
  Zap, 
  Terminal, 
  Layers, 
  HelpCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { navigate, isAuthenticated } = useApp();
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'node' | 'webhook'>('curl');

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F1115] flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 border-b border-[#E9ECEF] overflow-hidden">
          <div className="max-w-5xl mx-auto text-center">
            {/* Clean metadata badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#E9ECEF] text-[#495057] text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Veripay NG · Bank-Transfer Verification Engine</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#0B0D11] leading-[1.1] max-w-4xl mx-auto">
              Automatically verify bank-transfer payments.
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#495057] max-w-2xl mx-auto leading-relaxed">
              Veripay NG helps developers and merchants automatically confirm customer bank transfers in real-time. 
              <strong className="text-[#0B0D11] font-semibold"> We are not a payment gateway</strong> — we do not hold funds, collect card PINs, or request banking passwords.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {isAuthenticated ? (
                <Button 
                  size="lg" 
                  onClick={() => navigate('/dashboard')}
                  className="w-full sm:w-auto"
                >
                  Enter Developer Console
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/signup')}
                    className="w-full sm:w-auto"
                  >
                    Start Free Verification
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => navigate('/docs')}
                    className="w-full sm:w-auto"
                  >
                    View Integration Docs
                  </Button>
                </>
              )}
            </div>

            {/* Trust signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#6C757D]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Zero Custody (Funds go directly to your bank)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Deterministic Verification</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>No Zapier Required</span>
              </div>
            </div>

            {/* Interactive Visual Engine Pipeline Representation */}
            <div className="mt-14 max-w-4xl mx-auto bg-white rounded-xl border border-[#DEE2E6] shadow-sm p-6 sm:p-8 text-left">
              <div className="flex items-center justify-between pb-4 border-b border-[#E9ECEF]">
                <div>
                  <span className="text-xs font-semibold text-[#0B0D11] uppercase tracking-wider block">
                    HOW THE DETERMINISTIC PIPELINE WORKS
                  </span>
                  <span className="text-[11px] text-[#6C757D]">
                    Real-time bank alert processing without third-party automation tools
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[11px] font-mono bg-[#F1F3F5] text-[#212529] rounded border border-[#E9ECEF]">
                  Latency &lt; 2.4s
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Step 1 */}
                <div className="p-4 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
                  <div className="w-6 h-6 rounded bg-[#0B0D11] text-white flex items-center justify-center text-xs font-bold mb-3">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-[#0B0D11] uppercase tracking-tight">
                    Customer Transfer
                  </h4>
                  <p className="text-[11px] text-[#6C757D] mt-1.5 leading-relaxed">
                    Customer sends ₦25,000 directly from Zenith Bank to your verified store account.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
                  <div className="w-6 h-6 rounded bg-[#0B0D11] text-white flex items-center justify-center text-xs font-bold mb-3">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-[#0B0D11] uppercase tracking-tight">
                    Bank Alert Ingested
                  </h4>
                  <p className="text-[11px] text-[#6C757D] mt-1.5 leading-relaxed">
                    Official credit alert is captured via your own connected Gmail connection in real time.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
                  <div className="w-6 h-6 rounded bg-[#0B0D11] text-white flex items-center justify-center text-xs font-bold mb-3">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-[#0B0D11] uppercase tracking-tight">
                    AI Entity Extraction
                  </h4>
                  <p className="text-[11px] text-[#6C757D] mt-1.5 leading-relaxed">
                    Gemini parses amount, sender name (OBI JOHN CHUKWU), timestamp, and reference.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF] border-emerald-200 bg-emerald-50/20">
                  <div className="w-6 h-6 rounded bg-emerald-700 text-white flex items-center justify-center text-xs font-bold mb-3">
                    4
                  </div>
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-tight">
                    Deterministic Match
                  </h4>
                  <p className="text-[11px] text-[#6C757D] mt-1.5 leading-relaxed">
                    Order VP-10291 verified. Anti-replay enforced. Signed webhook sent to your server.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-xs font-bold tracking-widest uppercase text-[#6C757D]">
              Workflow Architecture
            </h2>
            <h3 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#0B0D11] tracking-tight">
              Reconcile transfers without manual banking apps.
            </h3>
            <p className="mt-4 text-sm text-[#495057] leading-relaxed">
              No need to take screenshots, wait for cashier confirmation, or refresh bank dashboards. 
              Veripay NG connects your store’s notification channel to a deterministic matching engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-lg border border-[#E9ECEF]">
              <div className="w-9 h-9 rounded-md bg-[#F1F3F5] text-[#0B0D11] flex items-center justify-center mb-4">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#0B0D11]">
                1. Connect Your Alert Channel
              </h4>
              <p className="mt-2 text-xs text-[#6C757D] leading-relaxed">
                Connect the specific Gmail mailbox that receives your Nigerian bank transaction alerts. 
                Multi-tenant isolation ensures data remains strictly confined to your project.
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg border border-[#E9ECEF]">
              <div className="w-9 h-9 rounded-md bg-[#F1F3F5] text-[#0B0D11] flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#0B0D11]">
                2. AI Extraction + Deterministic Logic
              </h4>
              <p className="mt-2 text-xs text-[#6C757D] leading-relaxed">
                AI extracts structured entities. Then our deterministic verification engine validates amount, order expiry, 
                and Nigerian name permutations (e.g. "OBI JOHN CHUKWU" matching "JOHN CHUKWU OBI").
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg border border-[#E9ECEF]">
              <div className="w-9 h-9 rounded-md bg-[#F1F3F5] text-[#0B0D11] flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#0B0D11]">
                3. Signed Webhook & Fulfillment
              </h4>
              <p className="mt-2 text-xs text-[#6C757D] leading-relaxed">
                Receive an HMAC-signed webhook event (<code className="font-mono text-[#0B0D11]">payment.verified</code>) 
                to immediately release digital products, ship physical orders, or credit user balances.
              </p>
            </div>
          </div>
        </section>

        {/* ARCHITECTURE & FEATURES BENTO */}
        <section id="architecture" className="py-20 bg-[#F1F3F5] border-y border-[#E9ECEF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-14">
              <h2 className="text-xs font-bold tracking-widest uppercase text-[#6C757D]">
                Engine Specifications
              </h2>
              <h3 className="mt-2 text-3xl font-extrabold text-[#0B0D11] tracking-tight">
                Engineered for Nigerian banking realities.
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="p-7 bg-white rounded-lg border border-[#DEE2E6] md:col-span-2">
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#0B0D11] mb-2 uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>The AI Rule: AI Extracts, Deterministic Code Decides</span>
                </div>
                <h4 className="text-lg font-bold text-[#0B0D11] mb-2">
                  Gemini never has unilateral authority to approve money.
                </h4>
                <p className="text-xs text-[#6C757D] leading-relaxed mb-4">
                  LLMs hallucinate. Veripay NG strictly uses Gemini for structured entity extraction (amount, currency, sender name, timestamp, bank). 
                  Verification decisions are governed by deterministic PostgreSQL logic with duplicate replay prevention and order expiration rules.
                </p>
                <div className="p-3 bg-[#F8F9FA] rounded border border-[#E9ECEF] text-xs font-mono text-[#495057]">
                  outcome: STRONG_MATCH → VERIFIED | UNCERTAIN_MATCH → MANUAL_REVIEW | NO_MATCH → UNMATCHED
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-7 bg-white rounded-lg border border-[#DEE2E6]">
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#0B0D11] mb-2 uppercase">
                  <Layers className="w-4 h-4 text-[#495057]" />
                  <span>Multi-Tenant Architecture</span>
                </div>
                <h4 className="text-base font-bold text-[#0B0D11] mb-2">
                  Strict Tenant Isolation
                </h4>
                <p className="text-xs text-[#6C757D] leading-relaxed">
                  Every merchant registers their own distinct projects, receiving bank accounts, and Gmail OAuth connections. 
                  Data from one store never bleeds into another.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-7 bg-white rounded-lg border border-[#DEE2E6]">
                <div className="text-xs font-bold text-[#0B0D11] mb-2 uppercase">
                  <span>Credit Alert Validation</span>
                </div>
                <h4 className="text-base font-bold text-[#0B0D11] mb-2">
                  CREDIT vs DEBIT Filtering
                </h4>
                <p className="text-xs text-[#6C757D] leading-relaxed">
                  Only verified incoming credit alerts are matched. Debits, withdrawals, card charges, reversals, and promotional messages are discarded from the verification queue.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-7 bg-white rounded-lg border border-[#DEE2E6] md:col-span-2">
                <div className="text-xs font-bold text-[#0B0D11] mb-2 uppercase">
                  <span>Human-in-the-Loop</span>
                </div>
                <h4 className="text-lg font-bold text-[#0B0D11] mb-2">
                  Audited Manual Review Queue
                </h4>
                <p className="text-xs text-[#6C757D] leading-relaxed mb-3">
                  When a sender name is ambiguous or multiple candidates match the exact same amount, transactions are safely routed to your Manual Review queue with complete signal inspection.
                </p>
                <div className="flex items-center gap-4 text-xs text-[#495057]">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Approve / Reject controls
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Complete immutable audit log
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DEVELOPER INTEGRATION & CODE SECTION */}
        <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-bold tracking-widest uppercase text-[#6C757D]">
                Developer Experience
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-[#0B0D11] tracking-tight">
                Integrate in 15 minutes with 3 simple API calls.
              </h2>
              <p className="mt-4 text-xs text-[#495057] leading-relaxed">
                Create a pending payment order from your backend. Show your customer their transfer destination. 
                Listen for our signed webhook to complete order fulfillment.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-[#0B0D11] text-white flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0B0D11]">
                      POST /api/v1/orders
                    </h4>
                    <p className="text-[11px] text-[#6C757D]">
                      Create a pending order specifying expected amount and customer account name.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-[#0B0D11] text-white flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0B0D11]">
                      Display Bank Account Details
                    </h4>
                    <p className="text-[11px] text-[#6C757D]">
                      Customer transfers funds using their bank app or USSD without special payment codes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-[#0B0D11] text-white flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0B0D11]">
                      Receive Webhook
                    </h4>
                    <p className="text-[11px] text-[#6C757D]">
                      Verify cryptographic HMAC SHA-256 signature and fulfill the purchase.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Button variant="outline" size="sm" onClick={() => navigate('/docs')}>
                  Read Complete Documentation
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>

            {/* Code switcher */}
            <div className="lg:col-span-7 bg-[#0B0D11] rounded-xl border border-[#2B303B] overflow-hidden shadow-xl text-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E232B] bg-[#12151C]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#343A40]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#343A40]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#343A40]" />
                  <span className="text-xs font-mono text-[#ADB5BD] ml-2">
                    api.veripay.ng
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveCodeTab('curl')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      activeCodeTab === 'curl' ? 'bg-[#1E232B] text-white' : 'text-[#6C757D] hover:text-white'
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setActiveCodeTab('node')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      activeCodeTab === 'node' ? 'bg-[#1E232B] text-white' : 'text-[#6C757D] hover:text-white'
                    }`}
                  >
                    Node.js
                  </button>
                  <button
                    onClick={() => setActiveCodeTab('webhook')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      activeCodeTab === 'webhook' ? 'bg-[#1E232B] text-white' : 'text-[#6C757D] hover:text-white'
                    }`}
                  >
                    Webhook
                  </button>
                </div>
              </div>

              <div className="p-5 font-mono text-xs leading-relaxed overflow-x-auto text-[#CED4DA]">
                {activeCodeTab === 'curl' && (
                  <pre>
{`curl -X POST https://api.veripay.ng/v1/orders \\
  -H "Authorization: Bearer vpay_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "proj_your_project_id",
    "merchant_order_reference": "ORD-2026-001",
    "amount": 15000,
    "currency": "NGN",
    "expected_payer_name": "PAYER FULL NAME",
    "payer_bank": "Zenith Bank"
  }'`}
                  </pre>
                )}

                {activeCodeTab === 'node' && (
                  <pre>
{`import { VeripayClient } from '@veripay/sdk';

const veripay = new VeripayClient({ apiKey: process.env.VERIPAY_API_KEY });

const { order, checkoutToken } = await veripay.orders.create({
  merchantReference: 'ORD-2026-001',
  amount: 15000,
  currency: 'NGN',
  expectedPayerName: 'PAYER FULL NAME'
});

console.log('Transfer instructions ready:', order.receivingBank);`}
                  </pre>
                )}

                {activeCodeTab === 'webhook' && (
                  <pre>
{`// Example Webhook Payload (event: payment.verified)
{
  "event_id": "evt_989218204",
  "event": "payment.verified",
  "project_id": "proj_your_project_id",
  "data": {
    "merchant_order_reference": "ORD-2026-001",
    "amount": 15000,
    "currency": "NGN",
    "expected_payer_name": "PAYER FULL NAME",
    "verified_sender_name": "PAYER FULL NAME",
    "bank_name": "Zenith Bank",
    "verified_at": "2026-09-28T05:42:15Z"
  }
}`}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY SECTION */}
        <section id="security" className="py-20 bg-white border-y border-[#E9ECEF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <span className="text-xs font-bold tracking-widest uppercase text-[#6C757D]">
                Core Security Standard
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-[#0B0D11] tracking-tight">
                Designed to never touch passwords, PINs, or customer funds.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 rounded-lg border border-[#E9ECEF] bg-[#F8F9FA]">
                <Lock className="w-5 h-5 text-[#0B0D11] mb-3" />
                <h4 className="text-xs font-bold text-[#0B0D11] uppercase tracking-tight">
                  No Banking Credentials
                </h4>
                <p className="mt-1.5 text-xs text-[#6C757D] leading-relaxed">
                  We never ask for your bank login, online password, token device, or card PIN.
                </p>
              </div>

              <div className="p-5 rounded-lg border border-[#E9ECEF] bg-[#F8F9FA]">
                <ShieldCheck className="w-5 h-5 text-[#0B0D11] mb-3" />
                <h4 className="text-xs font-bold text-[#0B0D11] uppercase tracking-tight">
                  Zero Custody
                </h4>
                <p className="mt-1.5 text-xs text-[#6C757D] leading-relaxed">
                  Transfers go straight from customer account to your business bank account. Veripay does not intermediate money.
                </p>
              </div>

              <div className="p-5 rounded-lg border border-[#E9ECEF] bg-[#F8F9FA]">
                <Terminal className="w-5 h-5 text-[#0B0D11] mb-3" />
                <h4 className="text-xs font-bold text-[#0B0D11] uppercase tracking-tight">
                  Least-Privilege OAuth
                </h4>
                <p className="mt-1.5 text-xs text-[#6C757D] leading-relaxed">
                  Google OAuth is scoped strictly to read-only alert detection. Refresh tokens are encrypted server-side.
                </p>
              </div>

              <div className="p-5 rounded-lg border border-[#E9ECEF] bg-[#F8F9FA]">
                <CheckCircle2 className="w-5 h-5 text-[#0B0D11] mb-3" />
                <h4 className="text-xs font-bold text-[#0B0D11] uppercase tracking-tight">
                  Anti-Replay Locks
                </h4>
                <p className="mt-1.5 text-xs text-[#6C757D] leading-relaxed">
                  A bank alert can only verify one order. Duplicate transactions and expired orders are immediately rejected.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs font-bold tracking-widest uppercase text-[#6C757D]">
              Frequently Asked Questions
            </h2>
            <h3 className="mt-2 text-3xl font-extrabold text-[#0B0D11] tracking-tight">
              Everything you need to know about Veripay NG.
            </h3>
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-white rounded-lg border border-[#E9ECEF]">
              <h4 className="text-sm font-bold text-[#0B0D11]">
                Is Veripay NG a payment gateway like Paystack or Flutterwave?
              </h4>
              <p className="mt-2 text-xs text-[#6C757D] leading-relaxed">
                No. A payment gateway collects customer card/account details and settles funds to you days later after deducting processing fees. 
                Veripay NG is a <strong>verification service</strong>: your customer sends money directly to your own commercial bank account, and our engine automatically confirms when the funds arrive so you can fulfill the order immediately.
              </p>
            </div>

            <div className="p-5 bg-white rounded-lg border border-[#E9ECEF]">
              <h4 className="text-sm font-bold text-[#0B0D11]">
                Does the customer have to type a reference code in their bank description?
              </h4>
              <p className="mt-2 text-xs text-[#6C757D] leading-relaxed">
                No! Most Nigerian banking apps do not guarantee narration delivery between disparate banks (e.g. NIBSS instant payment descriptions are often truncated). 
                Veripay NG matches orders deterministically using amount, sender name components, and order creation windows.
              </p>
            </div>

            <div className="p-5 bg-white rounded-lg border border-[#E9ECEF]">
              <h4 className="text-sm font-bold text-[#0B0D11]">
                How do you handle name variations (e.g. "OBI JOHN CHUKWU" vs "JOHN CHUKWU OBI")?
              </h4>
              <p className="mt-2 text-xs text-[#6C757D] leading-relaxed">
                Our verification engine uses normalized word-set token analysis specifically tuned for Nigerian naming patterns. 
                Word reorderings of valid components count as strong deterministic matches. If there is ambiguity, the transaction is routed safely to Manual Review.
              </p>
            </div>

            <div className="p-5 bg-white rounded-lg border border-[#E9ECEF]">
              <h4 className="text-sm font-bold text-[#0B0D11]">
                Do I need Zapier to connect Gmail to Veripay?
              </h4>
              <p className="mt-2 text-xs text-[#6C757D] leading-relaxed">
                No. Veripay NG includes a native server-side Gmail ingestion pipeline built directly on Google OAuth and the Gmail API. There is zero reliance on Zapier or external polling webhooks.
              </p>
            </div>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="py-16 bg-[#0B0D11] text-white border-t border-[#1E232B]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to automate bank-transfer reconciliation?
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-[#ADB5BD] max-w-xl mx-auto">
              Create your developer account and test bank-transfer verification in under 5 minutes.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => navigate('/signup')}
                className="bg-white text-[#0B0D11] hover:bg-[#F8F9FA] border-white"
              >
                Create Developer Account
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                onClick={() => navigate('/docs')}
                className="text-white hover:bg-[#1E232B]"
              >
                Explore Documentation
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
