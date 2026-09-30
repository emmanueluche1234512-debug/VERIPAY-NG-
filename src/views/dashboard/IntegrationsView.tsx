import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { 
  Mail, 
  Send, 
  Webhook, 
  ShieldCheck, 
  ExternalLink, 
  AlertCircle, 
  Info,
  Lock,
  Layers,
  Check
} from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  const { activeProject, navigate } = useApp();
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div>
        <h2 className="text-lg font-bold text-[#0B0D11] tracking-tight">
          Integrations & Ingestion Channels
        </h2>
        <p className="text-xs text-[#6C757D]">
          Connect your bank-alert notification channels and event delivery destinations for {activeProject?.name}.
        </p>
      </div>

      {/* Architecture principle banner */}
      <div className="p-4 bg-white rounded-lg border border-[#DEE2E6] flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-bold text-[#0B0D11]">
            Multi-Tenant Isolation & Least-Privilege Standard
          </h4>
          <p className="text-[#6C757D] mt-0.5 leading-relaxed">
            Every store connects its own alert channel. Veripay NG never aggregates merchant emails into a single mailbox, 
            never asks for Gmail passwords, and never requests write permissions.
          </p>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GOOGLE / GMAIL INTEGRATION CARD */}
        <div className="bg-white rounded-lg border border-[#E9ECEF] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-md bg-[#F1F3F5] text-[#0B0D11] flex items-center justify-center font-bold text-sm">
                <Mail className="w-5 h-5" />
              </div>
              <StatusBadge status="not_connected" size="sm" />
            </div>

            <h3 className="text-sm font-bold text-[#0B0D11]">
              Google / Gmail Alert Ingestion
            </h3>
            <p className="text-xs text-[#6C757D] mt-1 leading-relaxed">
              Connect the Gmail mailbox that receives your commercial bank credit alerts (e.g. Access Bank, GTBank, Zenith).
            </p>

            <div className="mt-4 p-3 bg-[#F8F9FA] rounded-md border border-[#E9ECEF] space-y-1.5 text-[11px] text-[#495057]">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#6C757D]" />
                <span>Scope: <code className="font-mono text-[#0B0D11]">gmail.readonly</code></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Server-side background worker</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E9ECEF] space-y-2">
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setOauthModalOpen(true)}
              className="w-full"
            >
              Connect Google Account
            </Button>
            <button
              type="button"
              onClick={() => navigate('/merchant-admin')}
              className="w-full text-center text-[11px] font-semibold text-[#495057] hover:text-[#0B0D11] transition-colors py-1 cursor-pointer"
            >
              Preview Merchant Self-Service &rarr;
            </button>
          </div>
        </div>

        {/* TELEGRAM NOTIFICATION CARD */}
        <div className="bg-white rounded-lg border border-[#E9ECEF] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-md bg-[#F1F3F5] text-[#0B0D11] flex items-center justify-center font-bold text-sm">
                <Send className="w-5 h-5" />
              </div>
              <StatusBadge status="not_configured" size="sm" />
            </div>

            <h3 className="text-sm font-bold text-[#0B0D11]">
              Telegram Alert Bot
            </h3>
            <p className="text-xs text-[#6C757D] mt-1 leading-relaxed">
              Optional instant mobile notifications sent to your Telegram chat when a transfer verifies or needs review.
            </p>

            <div className="mt-4 p-3 bg-[#F8F9FA] rounded-md border border-[#E9ECEF] space-y-1.5 text-[11px] text-[#495057]">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Zero browser secret exposure</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Non-blocking delivery pipeline</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E9ECEF]">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setTelegramModalOpen(true)}
              className="w-full"
            >
              Configure Telegram Bot
            </Button>
          </div>
        </div>

        {/* WEBHOOKS CARD */}
        <div className="bg-white rounded-lg border border-[#E9ECEF] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-md bg-[#F1F3F5] text-[#0B0D11] flex items-center justify-center font-bold text-sm">
                <Webhook className="w-5 h-5" />
              </div>
              <StatusBadge status="active" size="sm" />
            </div>

            <h3 className="text-sm font-bold text-[#0B0D11]">
              Signed Webhook Endpoints
            </h3>
            <p className="text-xs text-[#6C757D] mt-1 leading-relaxed">
              Real-time HTTP POST deliveries with HMAC SHA-256 signatures for order fulfillment.
            </p>

            <div className="mt-4 p-3 bg-[#F8F9FA] rounded-md border border-[#E9ECEF] space-y-1.5 text-[11px] text-[#495057]">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>HMAC SHA-256 Header</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Automatic idempotent retries</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E9ECEF]">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => navigate('/webhooks')}
              className="w-full"
            >
              Manage Webhooks
            </Button>
          </div>
        </div>
      </div>

      {/* GOOGLE OAUTH MODAL (PREPARED BOUNDARY - NO FAKE OAUTH) */}
      <Modal
        isOpen={oauthModalOpen}
        onClose={() => setOauthModalOpen(false)}
        title="Google OAuth Connection (Phase 4)"
        subtitle="Veripay NG Gmail API Bank Alert Ingestion Specification"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 rounded-md border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Phase 1 Architecture Boundary:</span>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                As specified in Rule 29, we do not fake production OAuth connections. Google OAuth 2.0 with least-privilege Gmail API 
                will be provisioned in <strong>Phase 4</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-[#495057] leading-relaxed">
            <h4 className="font-bold text-[#0B0D11]">
              How it will work in Phase 4:
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Clicking connect redirects to Google's official consent screen.</li>
              <li>You authorize read-only access strictly for bank transaction notifications.</li>
              <li>OAuth tokens are encrypted in your project's isolated Supabase table.</li>
              <li>No banking passwords, card details, or sensitive personal emails are ever requested or accessed.</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setOauthModalOpen(false)}>
              Understood
            </Button>
          </div>
        </div>
      </Modal>

      {/* TELEGRAM MODAL (NO BROWSER TOKENS) */}
      <Modal
        isOpen={telegramModalOpen}
        onClose={() => setTelegramModalOpen(false)}
        title="Telegram Bot Notifications (Phase 11)"
        subtitle="Server-side notification channel architecture"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-[#F8F9FA] rounded-md border border-[#E9ECEF] flex items-start gap-2.5 text-[#495057]">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#0B0D11]">Zero Browser Token Exposure:</span>
              <p className="text-[11px] text-[#6C757D] mt-0.5 leading-relaxed">
                Per Section 21 of the master specification, the Telegram bot token is configured exclusively as a server-side secret (<code className="font-mono text-[#0B0D11]">TELEGRAM_BOT_TOKEN</code>).
                You will pair your chat ID in Phase 11.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setTelegramModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
