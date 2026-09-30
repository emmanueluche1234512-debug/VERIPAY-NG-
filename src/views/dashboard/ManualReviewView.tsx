import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
  Loader2,
  AlertCircle
} from 'lucide-react';

export const ManualReviewView: React.FC = () => {
  const {
    activeProject,
    manualReviews,
    handleReviewAction,
    isProjectDataLoading,
    dataError
  } = useApp();
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Strictly scope manual reviews to selectedProject.id
  const selectedProjectId = activeProject?.id || '';
  const projectReviews = selectedProjectId
    ? manualReviews.filter(r => r.projectId === selectedProjectId)
    : [];

  const displayedReviews = projectReviews.filter(r =>
    filter === 'pending' ? r.status === 'pending' : true
  );

  const onConfirmDecision = async (reviewId: string, decision: 'approved' | 'rejected') => {
    setProcessingId(reviewId);
    try {
      await handleReviewAction(reviewId, decision, resolutionNotes[reviewId]);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B0D11]">Manual Review Queue</h2>
          <p className="text-xs text-[#6C757D]">
            Side-by-side comparison for bank alerts with name permutation variance or missing reference codes
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-md border border-[#E9ECEF]">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              filter === 'pending'
                ? 'bg-[#0B0D11] text-white'
                : 'text-[#495057] hover:text-[#0B0D11]'
            }`}
          >
            Pending Review ({projectReviews.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-[#0B0D11] text-white'
                : 'text-[#495057] hover:text-[#0B0D11]'
            }`}
          >
            All History ({projectReviews.length})
          </button>
        </div>
      </div>

      {dataError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-900">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{dataError}</span>
        </div>
      )}

      {isProjectDataLoading ? (
        <div className="bg-white rounded-lg border border-[#E9ECEF] p-12 flex flex-col items-center justify-center gap-2.5 text-xs text-[#6C757D]">
          <Loader2 className="w-5 h-5 animate-spin text-[#0B0D11]" />
          <span className="font-mono font-medium text-[#0B0D11]">Loading project data...</span>
        </div>
      ) : displayedReviews.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E9ECEF]">
          <EmptyState
            icon={<UserCheck className="w-5 h-5 text-[#6C757D]" />}
            title="No payments require manual review."
            description="When a bank transfer arrives with a partial name match or ambiguous reference, it will appear here for human approval."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {displayedReviews.map(item => {
            const candidateOrder = item.candidateOrders[0];
            const alert = item.paymentAlert;
            return (
              <Card key={item.id} variant="white" padding="lg">
                {/* Top Bar: Reason & Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E9ECEF]">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0B0D11]">
                          Review ID: <span className="font-mono">{item.id}</span>
                        </span>
                        <StatusBadge status={item.status} size="sm" />
                      </div>
                      <p className="text-xs text-[#495057] mt-0.5">{item.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-[#6C757D] block">
                        Extraction Confidence
                      </span>
                      <span className="font-mono font-bold text-sm text-amber-700">
                        {Math.round((alert.confidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
                  {/* Expected Order */}
                  <div className="lg:col-span-5 p-4 rounded-lg bg-[#F8F9FA] border border-[#E9ECEF] space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-[#495057]">
                        Expected Pending Order
                      </span>
                      <span className="font-mono font-bold text-[#0B0D11]">
                        {candidateOrder?.merchantOrderReference || 'Unlinked'}
                      </span>
                    </div>

                    {candidateOrder ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[11px] text-[#6C757D] block">
                            Expected Payer Name
                          </span>
                          <span className="font-bold text-[#0B0D11]">
                            {candidateOrder.expectedPayerName}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#6C757D] block">Expected Amount</span>
                          <span className="font-mono font-bold text-[#0B0D11]">
                            ₦{candidateOrder.amount.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#6C757D] block">Expected Bank</span>
                          <span className="text-[#212529]">
                            {candidateOrder.payerBank || 'Any Bank'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#6C757D] block">Order Created</span>
                          <span className="font-mono text-[11px] text-[#495057]">
                            {new Date(candidateOrder.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[#6C757D] py-2">
                        No candidate pending order matched automatically.
                      </div>
                    )}
                  </div>

                  {/* Arrow Indicator */}
                  <div className="lg:col-span-1 flex justify-center">
                    <div className="w-8 h-8 rounded-full bg-[#F1F3F5] border border-[#DEE2E6] flex items-center justify-center text-[#495057]">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Actual Bank Alert */}
                  <div className="lg:col-span-5 p-4 rounded-lg bg-[#FFFBEB]/60 border border-amber-200 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-amber-900">
                        Incoming Bank Credit Alert
                      </span>
                      <span className="font-mono text-[11px] text-amber-800">
                        {alert.bankName}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-amber-900/70 block">
                          Extracted Sender Name
                        </span>
                        <span className="font-bold text-[#0B0D11]">{alert.senderName}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-amber-900/70 block">Alert Amount</span>
                        <span className="font-mono font-bold text-emerald-800">
                          ₦{alert.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[11px] text-amber-900/70 block">
                          Extracted Snippet / Reference
                        </span>
                        <span className="font-mono text-[11px] text-[#212529]">
                          {alert.rawSnippet || alert.transactionReference || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Controls */}
                {item.status === 'pending' ? (
                  <div className="mt-4 pt-4 border-t border-[#E9ECEF] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <input
                      type="text"
                      value={resolutionNotes[item.id] || ''}
                      onChange={e =>
                        setResolutionNotes(prev => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Add optional audit resolution note..."
                      className="flex-1 px-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#CED4DA] rounded-md text-[#0B0D11] focus:outline-none focus:border-[#0B0D11] focus:bg-white"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={processingId === item.id}
                        onClick={() => onConfirmDecision(item.id, 'rejected')}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Reject Match
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={processingId === item.id}
                        onClick={() => onConfirmDecision(item.id, 'approved')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Approve &amp; Verify Order
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-3 border-t border-[#E9ECEF] flex items-center justify-between text-xs text-[#6C757D]">
                    <span>
                      Resolution:{' '}
                      <strong className="text-[#0B0D11]">{item.resolutionNote}</strong>
                    </span>
                    {item.reviewedAt && (
                      <span className="font-mono text-[11px]">
                        Reviewed by {item.reviewedBy} at{' '}
                        {new Date(item.reviewedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
