import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { PaymentAlert } from '../../types';
import { ReceiptText, Search, Eye, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { activeProject, paymentAlerts, orders, isProjectDataLoading, dataError } = useApp();
  const [selectedAlert, setSelectedAlert] = useState<PaymentAlert | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Strictly scope payment alerts to selectedProject.id
  const selectedProjectId = activeProject?.id || '';
  const projectAlerts = selectedProjectId
    ? paymentAlerts.filter(a => a.projectId === selectedProjectId)
    : [];

  const filteredAlerts = projectAlerts.filter(alert => {
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    const matchesSearch =
      alert.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.transactionReference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.rawSnippet || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getMatchedOrder = (orderId?: string) => {
    if (!orderId) return null;
    return orders.find(o => o.id === orderId) || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B0D11]">Bank Alert Transactions</h2>
          <p className="text-xs text-[#6C757D]">
            Parsed credit alerts extracted from connected bank notification channels for{' '}
            <strong className="text-[#212529]">
              {activeProject?.name || 'No Project Selected'}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#495057] bg-white px-3 py-2 rounded-md border border-[#E9ECEF]">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Structured Extraction Only (No Raw Inbox Exposure)</span>
        </div>
      </div>

      {dataError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-900">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{dataError}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#E9ECEF] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: 'All Alerts', value: 'all' },
            { label: 'Verified Match', value: 'VERIFIED' },
            { label: 'Manual Review', value: 'MANUAL_REVIEW' },
            { label: 'Unmatched', value: 'UNMATCHED' }
          ].map(btn => (
            <button
              key={btn.value}
              onClick={() => setStatusFilter(btn.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === btn.value
                  ? 'bg-[#0B0D11] text-white'
                  : 'bg-[#F8F9FA] text-[#495057] hover:text-[#0B0D11] hover:bg-[#E9ECEF]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-[#6C757D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search sender, bank, or ref..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#DEE2E6] rounded-md text-[#0B0D11] placeholder-[#ADB5BD] focus:outline-none focus:border-[#0B0D11] focus:bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E9ECEF] overflow-hidden">
        {isProjectDataLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2.5 text-xs text-[#6C757D]">
            <Loader2 className="w-5 h-5 animate-spin text-[#0B0D11]" />
            <span className="font-mono font-medium text-[#0B0D11]">Loading project data...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="w-5 h-5 text-[#6C757D]" />}
            title="No transactions yet."
            description="When a customer completes a transfer and your bank sends an email alert, Veripay parses the structured transaction fields here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[#6C757D] uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Sender / Narration</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Bank</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Matched Order</th>
                  <th className="py-3.5 px-4">Outcome</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9ECEF]">
                {filteredAlerts.map(alert => {
                  const matchedOrder = getMatchedOrder(alert.matchedOrderId);
                  return (
                    <tr key={alert.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0B0D11]">{alert.senderName}</div>
                        <div className="text-[11px] font-mono text-[#6C757D] truncate max-w-xs">
                          {alert.rawSnippet || alert.transactionReference || '—'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-[#0B0D11]">
                        ₦{alert.amount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-[#212529]">{alert.bankName}</td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#6C757D]">
                        {new Date(alert.transactionTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        {matchedOrder ? (
                          <div>
                            <span className="font-mono font-semibold text-[#0B0D11]">
                              {matchedOrder.merchantOrderReference}
                            </span>
                            <span className="block text-[10px] text-[#6C757D]">
                              Expected: {matchedOrder.expectedPayerName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#ADB5BD] italic">Unlinked</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={alert.status} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#F8F9FA] hover:bg-[#E9ECEF] text-[#212529] font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Structured Alert Detail Modal */}
      <Modal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title="Parsed Bank Alert Inspection"
      >
        {selectedAlert && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-md border border-[#E9ECEF]">
              <div>
                <div className="text-[10px] font-mono uppercase text-[#6C757D]">Alert ID</div>
                <div className="font-mono font-bold text-[#0B0D11]">{selectedAlert.id}</div>
              </div>
              <StatusBadge status={selectedAlert.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-md border border-[#E9ECEF]">
              <div>
                <div className="text-[11px] text-[#6C757D]">Extracted Sender</div>
                <div className="font-bold text-[#0B0D11] mt-0.5">{selectedAlert.senderName}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#6C757D]">Credit Amount</div>
                <div className="font-mono font-bold text-[#0B0D11] mt-0.5">
                  ₦{selectedAlert.amount.toLocaleString()} ({selectedAlert.currency})
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#6C757D]">Originating Bank</div>
                <div className="font-medium text-[#212529] mt-0.5">{selectedAlert.bankName}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#6C757D]">Alert Type</div>
                <div className="font-mono font-semibold text-emerald-800 mt-0.5">
                  {selectedAlert.alertType}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[11px] text-[#6C757D]">Bank Transaction Reference</div>
                <div className="font-mono text-[#212529] mt-0.5">
                  {selectedAlert.transactionReference || 'N/A'}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[11px] text-[#6C757D]">Extracted Alert Snippet</div>
                <div className="font-mono text-[#212529] bg-[#F8F9FA] p-2 rounded border border-[#E9ECEF] mt-1">
                  {selectedAlert.rawSnippet || 'No snippet recorded'}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[11px] text-[#6C757D]">Extraction Confidence</div>
                <div className="font-mono text-[#495057] mt-0.5">
                  {Math.round((selectedAlert.confidence || 0) * 100)}%
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#F8F9FA] rounded-md border border-[#E9ECEF] text-[11px] text-[#6C757D]">
              <strong className="text-[#212529]">Privacy Guarantee:</strong> Full raw email bodies and unrelated personal inbox messages are never stored or displayed in the console.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
