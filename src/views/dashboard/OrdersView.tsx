import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import {VeripayCheckout} from '../../components/checkout/VeripayCheckout';
import {
  Plus,
  ShoppingCart,
  Search,
  Copy,
  Check,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Currency, Order, OrderStatus, SafeCheckoutOrder } from '../../types';

interface OrdersViewProps {
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
  onOpenCreateModal?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  isCreateModalOpen,
  onCloseCreateModal,
  onOpenCreateModal
}) => {
  const { activeProject, orders, createOrder, isProjectDataLoading, dataError } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [selectedOrderForCheckout, setSelectedOrderForCheckout] = useState<Order | null>(null);

  // Create Order Form State
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(activeProject?.currency || 'NGN');
  const [payerName, setPayerName] = useState('');
  const [payerBank, setPayerBank] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Strictly scope orders to selectedProject.id
  const selectedProjectId = activeProject?.id || '';
  const projectOrders = selectedProjectId
    ? orders.filter(o => o.projectId === selectedProjectId)
    : [];

  const filteredOrders = projectOrders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch =
      order.merchantOrderReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.expectedPayerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim() || !amount || !payerName.trim()) return;

    setSubmitting(true);
    try {
      await createOrder({
        merchantOrderReference: reference.trim(),
        amount: Number(amount),
        currency,
        expectedPayerName: payerName.trim().toUpperCase(),
        payerBank: payerBank.trim() || undefined
      });

      setReference('');
      setAmount('');
      setPayerName('');
      setPayerBank('');
      onCloseCreateModal();
    } finally {
      setSubmitting(false);
    }
  };

  const buildSafeCheckoutOrder = (order: Order): SafeCheckoutOrder => ({
    id: order.id,
    checkoutToken: order.checkoutToken || '',
    merchantReference: order.merchantOrderReference,
    amount: order.amount,
    currency: order.currency,
    expectedPayerName: order.expectedPayerName,
    receivingBank: {
      bankName: activeProject?.receivingBank?.bankName || '',
      accountName: activeProject?.receivingBank?.accountName || '',
      accountNumber: activeProject?.receivingBank?.accountNumber || ''
    },
    status: order.status,
    checkoutStatus:
      order.status === 'verified'
        ? 'VERIFIED'
        : order.status === 'manual_review'
        ? 'MANUAL_REVIEW'
        : order.status === 'expired'
        ? 'EXPIRED'
        : order.customerMarkedTransferredAt
        ? 'CHECKING_PAYMENT'
        : 'AWAITING_TRANSFER',
    customerMarkedTransferredAt: order.customerMarkedTransferredAt,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    verifiedAt: order.verifiedAt
  });

  const filterButtons: { label: string; value: string }[] = [
    { label: 'All Orders', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Verified', value: 'verified' },
    { label: 'Manual Review', value: 'manual_review' },
    { label: 'Expired', value: 'expired' }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B0D11]">Orders</h2>
          <p className="text-xs text-[#6C757D]">
            Pending and verified bank-transfer payment expectations for{' '}
            <strong className="text-[#212529]">
              {activeProject?.name || 'No Project Selected'}
            </strong>
          </p>
        </div>
        <Button variant="primary" size="md" onClick={onOpenCreateModal} disabled={!activeProject}>
          <Plus className="w-4 h-4 mr-1.5" />
          Create Pending Order
        </Button>
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
          {filterButtons.map(btn => (
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
            placeholder="Search reference or payer..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#DEE2E6] rounded-md text-[#0B0D11] placeholder-[#ADB5BD] focus:outline-none focus:border-[#0B0D11] focus:bg-white"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-[#E9ECEF] overflow-hidden">
        {isProjectDataLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2.5 text-xs text-[#6C757D]">
            <Loader2 className="w-5 h-5 animate-spin text-[#0B0D11]" />
            <span className="font-mono font-medium text-[#0B0D11]">Loading project data...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="w-5 h-5 text-[#6C757D]" />}
            title="No orders yet."
            description="Create a pending order before a customer initiates a bank transfer so Veripay can deterministically reconcile the alert."
            actionLabel={activeProject ? 'Create Pending Order' : undefined}
            onAction={activeProject ? onOpenCreateModal : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[#6C757D] uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Order ID / Reference</th>
                  <th className="py-3.5 px-4">Expected Payer Name</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created / Expires</th>
                  <th className="py-3.5 px-4 text-right">Checkout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9ECEF]">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#0B0D11]">
                          {order.merchantOrderReference}
                        </span>
                        <button
                          onClick={() => handleCopyRef(order.merchantOrderReference)}
                          className="text-[#ADB5BD] hover:text-[#0B0D11] cursor-pointer"
                          title="Copy reference"
                        >
                          {copiedRef === order.merchantOrderReference ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] font-mono text-[#6C757D] mt-0.5">{order.id}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#0B0D11]">{order.expectedPayerName}</div>
                      {order.payerBank && (
                        <div className="text-[11px] text-[#6C757D]">Bank: {order.payerBank}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-[#0B0D11]">
                      ₦{order.amount.toLocaleString()}
                      <span className="text-[10px] text-[#6C757D] ml-1 font-normal">
                        {order.currency}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={order.status as OrderStatus} />
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#495057]">
                      <div>
                        Created:{' '}
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="text-[#6C757D]">
                        {order.status === 'verified' && order.verifiedAt
                          ? `Verified: ${new Date(order.verifiedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}`
                          : `Expires: ${new Date(order.expiresAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}`}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForCheckout(order)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#CED4DA] bg-white hover:bg-[#F8F9FA] text-[11px] font-semibold text-[#0B0D11] transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Checkout Card</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to preview the Customer Checkout Card for a specific order */}
      <Modal
        isOpen={Boolean(selectedOrderForCheckout)}
        onClose={() => setSelectedOrderForCheckout(null)}
        title={`Customer Checkout Card — ${selectedOrderForCheckout?.merchantOrderReference || ''}`}
      >
        {selectedOrderForCheckout && (
          <div className="space-y-4">
            <VeripayCheckout order={buildSafeCheckoutOrder(selectedOrderForCheckout)} />
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedOrderForCheckout(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Pending Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={onCloseCreateModal}
        title="Create Pending Order"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          <div className="p-3 bg-[#F8F9FA] rounded-md border border-[#E9ECEF] text-[#495057] leading-relaxed">
            In production, your store backend creates pending orders via{' '}
            <code className="font-mono text-[#0B0D11]">POST /api/v1/orders</code>. Use this form to create a real order in Supabase.
          </div>

          <div>
            <label className="block font-medium text-[#212529] mb-1.5">
              Merchant Order Reference *
            </label>
            <input
              type="text"
              required
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. ORD-2026-001"
              className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md font-mono text-[#0B0D11] focus:outline-none focus:border-[#0B0D11]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-medium text-[#212529] mb-1.5">
                Expected Transfer Amount *
              </label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter exact transfer amount"
                className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md font-mono text-[#0B0D11] focus:outline-none focus:border-[#0B0D11]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#212529] mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md font-mono text-[#0B0D11] focus:outline-none focus:border-[#0B0D11]"
              >
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#212529] mb-1.5">
              Expected Payer Full Name *
            </label>
            <input
              type="text"
              required
              value={payerName}
              onChange={e => setPayerName(e.target.value)}
              placeholder="Account holder name on customer bank account"
              className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md uppercase text-[#0B0D11] focus:outline-none focus:border-[#0B0D11]"
            />
            <span className="text-[11px] text-[#6C757D] mt-1 block">
              Veripay compares this against the sender name extracted from the bank credit alert.
            </span>
          </div>

          <div>
            <label className="block font-medium text-[#212529] mb-1.5">
              Expected Payer Bank (Optional)
            </label>
            <input
              type="text"
              value={payerBank}
              onChange={e => setPayerBank(e.target.value)}
              placeholder="e.g. GTBank, Zenith Bank, Access Bank"
              className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md text-[#0B0D11] focus:outline-none focus:border-[#0B0D11]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E9ECEF]">
            <Button type="button" variant="outline" onClick={onCloseCreateModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating Order...' : 'Create Pending Order'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
