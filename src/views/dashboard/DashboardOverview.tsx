import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  CheckCircle2,
  Clock,
  UserCheck,
  ArrowUpRight,
  ReceiptText,
  Plus,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Loader2,
  RefreshCw,
  FolderPlus
} from 'lucide-react';

interface DashboardOverviewProps {
  onOpenCreateOrder: () => void;
  onOpenCreateProject: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onOpenCreateOrder,
  onOpenCreateProject
}) => {
  const {
    activeProject,
    orders,
    paymentAlerts,
    manualReviews,
    notifications,
    navigate,
    isProjectDataLoading,
    dataError,
    refreshData
  } = useApp();

  // Strictly scope all dashboard statistics to selectedProject.id
  const selectedProjectId = activeProject?.id || '';
  const projectOrders = selectedProjectId
    ? orders.filter(o => o.projectId === selectedProjectId)
    : [];
  const projectAlerts = selectedProjectId
    ? paymentAlerts.filter(a => a.projectId === selectedProjectId)
    : [];
  const projectReviews = selectedProjectId
    ? manualReviews.filter(r => r.projectId === selectedProjectId)
    : [];

  const verifiedOrders = projectOrders.filter(o => o.status === 'verified');
  const pendingOrders = projectOrders.filter(
    o => o.status === 'pending' && new Date(o.expiresAt).getTime() >= Date.now()
  );
  const pendingReviews = projectReviews.filter(r => r.status === 'pending');
  const unmatchedAlerts = projectAlerts.filter(a => a.status === 'UNMATCHED');

  const totalVerifiedAmount = verifiedOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const totalOrdersCount = projectOrders.length;
  const verificationRate =
    totalOrdersCount > 0 ? Math.round((verifiedOrders.length / totalOrdersCount) * 100) : 0;

  const hasConfiguredBank = Boolean(
    activeProject?.receivingBank?.bankName && activeProject?.receivingBank?.accountNumber
  );

  if (isProjectDataLoading) {
    return (
      <div className="bg-white rounded-lg border border-[#E9ECEF] p-12 flex flex-col items-center justify-center gap-3 text-xs text-[#6C757D]">
        <Loader2 className="w-5 h-5 animate-spin text-[#0B0D11]" />
        <span className="font-mono font-medium text-[#0B0D11]">Loading project data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Query Error State Banner */}
      {dataError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-4 text-xs text-red-900">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Database Query Error</span>
              <span className="text-red-800">{dataError}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Active Project Banner */}
      {activeProject ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-[#E9ECEF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#0B0D11] text-white flex items-center justify-center font-bold text-sm">
              {activeProject.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#0B0D11]">{activeProject.name}</h2>
                <span className="text-[11px] font-mono text-[#6C757D]">
                  ({activeProject.currency})
                </span>
              </div>
              <p className="text-xs text-[#6C757D] mt-0.5">
                {hasConfiguredBank ? (
                  <>
                    Receiving Bank:{' '}
                    <strong className="text-[#0B0D11] font-medium">
                      {activeProject.receivingBank.bankName}
                    </strong>{' '}
                    · Account:{' '}
                    <span className="font-mono text-[#212529]">
                      {activeProject.receivingBank.accountNumber}
                    </span>{' '}
                    ({activeProject.receivingBank.accountName})
                  </>
                ) : (
                  <>
                    Receiving Bank:{' '}
                    <strong className="text-[#495057] font-medium">Not Configured</strong>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onOpenCreateOrder}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Order
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/manual-review')}>
              Review Queue ({pendingReviews.length})
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5 bg-white rounded-lg border border-[#E9ECEF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#0B0D11]">No Project Selected</h2>
            <p className="text-xs text-[#6C757D] mt-0.5">
              Create or select a store project to view real-time bank transfer verification metrics.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={onOpenCreateProject}>
            <FolderPlus className="w-3.5 h-3.5 mr-1" />
            Create Project
          </Button>
        </div>
      )}

      {/* Manual Review Alert Notice if items exist */}
      {pendingReviews.length > 0 && (
        <div className="p-4 bg-[#FFFBEB] rounded-lg border border-amber-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Action Required: {pendingReviews.length} transaction requires manual review
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                A customer bank-transfer alert arrived with name permutation variance. Confirm match before order expires.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/manual-review')}
            className="border-amber-300 text-amber-900 hover:bg-amber-100/50"
          >
            Review Now
          </Button>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Verified Value */}
        <Card variant="white" padding="md">
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-2 font-medium">
            <span>Verified Payments Value</span>
            <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
              DIRECT BANK
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B0D11] tracking-tight">
            ₦{totalVerifiedAmount.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-[#6C757D] flex items-center justify-between">
            <span>{verifiedOrders.length} verified transactions</span>
            <span className="text-emerald-700 font-semibold">{verificationRate}% success</span>
          </div>
        </Card>

        {/* Verified Orders Count */}
        <Card variant="white" padding="md">
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-2 font-medium">
            <span>Verified Orders</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B0D11] tracking-tight">
            {verifiedOrders.length}
          </div>
          <div className="mt-2 text-[11px] text-[#6C757D]">
            Automatically confirmed via bank alerts
          </div>
        </Card>

        {/* Pending Orders */}
        <Card variant="white" padding="md">
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-2 font-medium">
            <span>Pending Payments</span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B0D11] tracking-tight">
            {pendingOrders.length}
          </div>
          <div className="mt-2 text-[11px] text-[#6C757D]">
            Awaiting customer bank transfer
          </div>
        </Card>

        {/* Manual Reviews & Unmatched */}
        <Card variant="white" padding="md">
          <div className="flex items-center justify-between text-xs text-[#6C757D] mb-2 font-medium">
            <span>Manual Reviews</span>
            <UserCheck className="w-4 h-4 text-[#495057]" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B0D11] tracking-tight">
            {pendingReviews.length}
          </div>
          <div className="mt-2 text-[11px] text-[#6C757D] flex items-center justify-between">
            <span>Unmatched Alerts:</span>
            <span className="font-mono font-medium text-[#0B0D11]">{unmatchedAlerts.length}</span>
          </div>
        </Card>
      </div>

      {/* RECENT TRANSACTIONS & ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-[#E9ECEF] p-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#E9ECEF]">
            <div>
              <h3 className="text-sm font-bold text-[#0B0D11]">
                Recent Bank Alert Transactions
              </h3>
              <p className="text-xs text-[#6C757D]">
                Incoming transaction credit alerts captured for {activeProject?.name || 'selected project'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
              View All Transactions
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {projectAlerts.length === 0 ? (
            <EmptyState
              icon={<ReceiptText className="w-5 h-5 text-[#6C757D]" />}
              title="No bank alert transactions yet."
              description="When a customer transfers money and your connected bank sends an alert email, Veripay extracts and reconciles it here."
              actionLabel={activeProject ? 'Create Pending Order' : undefined}
              onAction={activeProject ? onOpenCreateOrder : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E9ECEF] text-[#6C757D] uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-3 px-2">Sender Name</th>
                    <th className="py-3 px-2 text-right">Amount</th>
                    <th className="py-3 px-2">Bank</th>
                    <th className="py-3 px-2">Time</th>
                    <th className="py-3 px-2 text-right">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9ECEF]">
                  {projectAlerts.map(alert => (
                    <tr key={alert.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-3 px-2">
                        <div className="font-semibold text-[#0B0D11]">{alert.senderName}</div>
                        <div className="text-[10px] font-mono text-[#6C757D]">
                          Ref: {alert.transactionReference || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold tabular-nums text-[#0B0D11]">
                        ₦{alert.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-[#495057]">{alert.bankName}</td>
                      <td className="py-3 px-2 font-mono text-[11px] text-[#6C757D]">
                        {new Date(alert.transactionTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <StatusBadge status={alert.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notifications & System Audit feed */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-[#E9ECEF] p-5 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#E9ECEF]">
            <div>
              <h3 className="text-sm font-bold text-[#0B0D11]">Notification Feed</h3>
              <p className="text-xs text-[#6C757D]">Real-time reconciliation events</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>
              View All
            </Button>
          </div>

          <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-[360px]">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#6C757D]">
                No recent notifications
              </div>
            ) : (
              notifications.slice(0, 5).map(item => (
                <div
                  key={item.id}
                  className={`p-3 rounded-md border text-xs transition-colors ${
                    item.read
                      ? 'bg-white border-[#E9ECEF] text-[#495057]'
                      : 'bg-[#F8F9FA] border-[#DEE2E6] text-[#0B0D11]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[11px] uppercase tracking-wider text-[#0B0D11]">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-[#6C757D] font-mono">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#495057] leading-relaxed">{item.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[#E9ECEF] text-[11px] text-[#6C757D] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Deterministic Engine Active
            </span>
            <button
              onClick={() => navigate('/docs')}
              className="text-[#0B0D11] font-semibold hover:underline cursor-pointer"
            >
              Docs →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
