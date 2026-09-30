import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { 
  Webhook, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Clock, 
  Check, 
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { WebhookEvent } from '../../types';

export const WebhooksView: React.FC = () => {
  const { 
    webhooks, 
    createWebhook, 
    deleteWebhook, 
    webhookDeliveries, 
    activeProject
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [url, setUrl] = useState('https://api.yourstore.ng/webhooks/veripay');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([
    'payment.verified',
    'payment.manual_review'
  ]);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Filter webhooks by project
  const projectWebhooks = webhooks.filter(w => !activeProject || w.projectId === activeProject.id);

  const availableEvents: { id: WebhookEvent; label: string; desc: string }[] = [
    { id: 'payment.verified', label: 'payment.verified', desc: 'Fires when a bank transfer is deterministically matched to an order.' },
    { id: 'payment.manual_review', label: 'payment.manual_review', desc: 'Fires when an incoming alert requires merchant manual inspection.' },
    { id: 'payment.expired', label: 'payment.expired', desc: 'Fires when a pending order passes its expiration window without payment.' },
    { id: 'payment.unmatched', label: 'payment.unmatched', desc: 'Fires when an incoming bank credit alert has no matching pending order.' }
  ];

  const handleToggleEvent = (ev: WebhookEvent) => {
    setSelectedEvents(prev => 
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || selectedEvents.length === 0) return;
    createWebhook({
      url,
      events: selectedEvents
    });
    setIsModalOpen(false);
    setUrl('');
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B0D11] tracking-tight">
            Webhook Endpoints
          </h2>
          <p className="text-xs text-[#6C757D]">
            Deliver real-time cryptographic payment verification events to your store's backend server.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Webhook Endpoint
        </Button>
      </div>

      {/* Signing Security Notice */}
      <div className="p-4 bg-white rounded-lg border border-[#DEE2E6] flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-bold text-[#0B0D11]">
            HMAC SHA-256 Signature Verification
          </h4>
          <p className="text-[#6C757D] mt-0.5 leading-relaxed">
            All webhook requests sent from Veripay NG include a <code className="font-mono text-[#0B0D11]">X-Veripay-Signature</code> header. 
            Compute the HMAC SHA-256 hash using your master signing secret to ensure payloads originate exclusively from Veripay.
          </p>
        </div>
      </div>

      {/* Webhook Endpoints List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C757D]">
          Registered Endpoints ({projectWebhooks.length})
        </h3>

        {projectWebhooks.length === 0 ? (
          <EmptyState
            icon={<Webhook className="w-5 h-5 text-[#6C757D]" />}
            title="No Webhook Endpoints Registered"
            description="Configure an HTTP callback endpoint on your backend to receive instant notification when transfers verify."
            actionLabel="Add Webhook Endpoint"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          projectWebhooks.map(wh => (
            <div key={wh.id} className="bg-white rounded-lg border border-[#E9ECEF] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#0B0D11]">
                    {wh.url}
                  </span>
                  <StatusBadge status={wh.status} size="sm" />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {wh.events.map(ev => (
                    <span key={ev} className="px-2 py-0.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded text-[11px] font-mono text-[#495057]">
                      {ev}
                    </span>
                  ))}
                </div>

                <div className="text-[10px] text-[#6C757D] font-mono mt-2">
                  ID: {wh.id} · Created {new Date(wh.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => deleteWebhook(wh.id)}
                  className="text-red-700 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete Endpoint
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Deliveries Table */}
      <div className="space-y-4 pt-6 border-t border-[#E9ECEF]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C757D]">
          Recent Delivery Attempts
        </h3>

        <div className="bg-white rounded-lg border border-[#E9ECEF] overflow-hidden">
          {webhookDeliveries.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#6C757D]">
              No delivery logs recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E9ECEF] bg-[#F8F9FA] text-[#6C757D] uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-2.5 px-4">Event Type</th>
                  <th className="py-2.5 px-4">HTTP Status</th>
                  <th className="py-2.5 px-4">Latency</th>
                  <th className="py-2.5 px-4">Payload Summary</th>
                  <th className="py-2.5 px-4 text-right">Attempt Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9ECEF]">
                {webhookDeliveries.map(del => (
                  <tr key={del.id}>
                    <td className="py-2.5 px-4 font-mono font-bold text-[#0B0D11]">
                      {del.eventType}
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        del.statusCode === 200 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                      }`}>
                        {del.statusCode} OK
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#6C757D] text-[11px]">
                      {del.latencyMs}ms
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#495057] truncate max-w-xs">
                      {del.payloadSummary}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#6C757D] text-right">
                      {new Date(del.attemptTime).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD WEBHOOK MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Webhook Endpoint"
        subtitle={`Configure a new callback destination for store: ${activeProject?.name}`}
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#0B0D11] mb-1">
              Destination URL *
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.yourstore.ng/webhooks/veripay"
              className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md focus:border-[#0B0D11] focus:outline-hidden text-xs font-mono"
            />
            <p className="text-[10px] text-[#6C757D] mt-0.5">
              Must be a secure HTTPS endpoint accessible from the internet.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-[#0B0D11] mb-1">
              Subscribed Event Types
            </label>
            <div className="space-y-2 mt-2">
              {availableEvents.map(ev => {
                const isChecked = selectedEvents.includes(ev.id);
                return (
                  <label 
                    key={ev.id}
                    onClick={() => handleToggleEvent(ev.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${
                      isChecked ? 'bg-[#F8F9FA] border-[#0B0D11]' : 'border-[#E9ECEF] hover:bg-[#F8F9FA]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-[#0B0D11] focus:ring-[#0B0D11]"
                    />
                    <div>
                      <div className="font-mono font-bold text-[#0B0D11]">{ev.label}</div>
                      <div className="text-[11px] text-[#6C757D]">{ev.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Endpoint
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
