import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { 
  Building2, 
  Plus, 
  Copy, 
  Check, 
  Globe, 
  CreditCard, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Currency } from '../../types';

export const ProjectsView: React.FC = () => {
  const { 
    projects, 
    activeProject, 
    setActiveProjectId, 
    createProject,
    isSupabaseConfigured
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New project form state
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [currency, setCurrency] = useState<Currency>('NGN');
  const [bankName, setBankName] = useState('Access Bank');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !accountName || !accountNumber) {
      setFormError('Please fill in store name, bank account name, and account number.');
      return;
    }
    if (accountNumber.length !== 10) {
      setFormError('Nigerian bank account numbers must be exactly 10 digits.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      await createProject({
        name,
        websiteUrl: websiteUrl || 'https://example.com',
        currency,
        receivingBank: {
          bankName,
          accountName: accountName.toUpperCase().trim(),
          accountNumber,
          currency
        }
      });

      setIsModalOpen(false);
      // Reset form
      setName('');
      setWebsiteUrl('');
      setAccountName('');
      setAccountNumber('');
    } catch (err: any) {
      console.error('Project creation failed:', err);
      setFormError(err?.message || 'Failed to create project. Please verify database connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B0D11] tracking-tight">
            Stores & Projects
          </h2>
          <p className="text-xs text-[#6C757D]">
            Manage multi-tenant projects. Each project has its own receiving bank account, orders, and alert rules.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Create New Project
        </Button>
      </div>

      {/* Multi-tenant Isolation Architecture Notice */}
      <div className="p-4 bg-white rounded-lg border border-[#DEE2E6] flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-bold text-[#0B0D11]">
            Strict Multi-Tenant Row Level Security (RLS)
          </h4>
          <p className="text-[#6C757D] mt-0.5 leading-relaxed">
            Data from one developer/project never leaks into another. Every project maintains its own isolated database records in <code className="font-mono text-[#0B0D11]">public.projects</code> and <code className="font-mono text-[#0B0D11]">public.bank_accounts</code>, enforced by PostgreSQL security policies.
          </p>
        </div>
      </div>

      {/* Projects Grid or Empty State */}
      {projects.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5 text-[#6C757D]" />}
          title="No Stores or Projects Created Yet"
          description="Create your first store project to configure receiving bank details and start accepting bank transfers."
          actionLabel="Create First Project"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map(proj => {
            const isActive = activeProject?.id === proj.id;
            return (
              <div 
                key={proj.id} 
                className={`bg-white rounded-lg border transition-all ${
                  isActive 
                    ? 'border-[#0B0D11] shadow-xs ring-1 ring-[#0B0D11]' 
                    : 'border-[#E9ECEF] hover:border-[#CED4DA]'
                } p-6 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-[#F1F3F5] text-[#0B0D11] flex items-center justify-center font-bold text-sm">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#0B0D11]">
                          {proj.name}
                        </h3>
                        {proj.websiteUrl && (
                          <a 
                            href={proj.websiteUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[11px] text-[#6C757D] hover:text-[#0B0D11] flex items-center gap-1 mt-0.5"
                          >
                            <Globe className="w-3 h-3" />
                            <span>{proj.websiteUrl}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={proj.status} size="sm" />
                      {isActive && (
                        <span className="text-[10px] bg-[#0B0D11] text-white px-2 py-0.5 rounded font-medium">
                          Active Store
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Project ID Area */}
                  <div className="mt-5 p-3 bg-[#F8F9FA] rounded-md border border-[#E9ECEF] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6C757D] block">
                        Project ID (PostgreSQL UUID)
                      </span>
                      <span className="text-xs font-mono font-medium text-[#212529]">
                        {proj.id}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(proj.id)}
                      className="p-1.5 text-[#6C757D] hover:text-[#0B0D11] hover:bg-[#E9ECEF] rounded transition-colors cursor-pointer"
                      title="Copy Project ID"
                    >
                      {copiedId === proj.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Receiving Bank Details */}
                  <div className="mt-4 p-3.5 bg-white rounded-md border border-[#E9ECEF] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6C757D] flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        Receiving Bank
                      </span>
                      <span className="font-semibold text-[#0B0D11]">
                        {proj.receivingBank.bankName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6C757D]">Account Number</span>
                      <span className="font-mono font-bold text-[#0B0D11] tracking-wide">
                        {proj.receivingBank.accountNumber}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6C757D]">Account Name</span>
                      <span className="font-medium text-[#212529] uppercase truncate max-w-[180px]">
                        {proj.receivingBank.accountName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-6 pt-4 border-t border-[#E9ECEF] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#6C757D]">
                    Created {new Date(proj.createdAt).toLocaleDateString()}
                  </span>

                  {!isActive ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveProjectId(proj.id)}
                    >
                      Switch to this Project
                    </Button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Currently Selected
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project / Store"
        subtitle="Configure the store name and the primary receiving bank account for incoming payments."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#0B0D11] mb-1">
              Store / Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Samuel Fashion Store"
              className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md focus:border-[#0B0D11] focus:outline-hidden text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#0B0D11] mb-1">
              Website or Application URL
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourstore.ng"
              className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md focus:border-[#0B0D11] focus:outline-hidden text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#0B0D11] mb-1">
              Settlement Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md focus:border-[#0B0D11] focus:outline-hidden text-xs"
            >
              <option value="NGN">NGN — Nigerian Naira</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>

          <div className="pt-2 border-t border-[#E9ECEF]">
            <h4 className="font-bold text-[#0B0D11] mb-1">
              Receiving Bank Destination Information
            </h4>
            <p className="text-[11px] text-[#6C757D] mb-3">
              Destination details shown to paying customers. We never ask for passwords, card PINs, or online banking logins.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-[#0B0D11] mb-1">
                  Bank Name *
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md focus:border-[#0B0D11] focus:outline-hidden text-xs"
                >
                  <option value="Access Bank">Access Bank</option>
                  <option value="Guaranty Trust Bank (GTB)">Guaranty Trust Bank (GTB)</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                  <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                  <option value="Kuda Bank">Kuda Bank</option>
                  <option value="Opay">Opay</option>
                  <option value="Moniepoint">Moniepoint</option>
                  <option value="Stanbic IBTC">Stanbic IBTC</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0B0D11] mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. SAMUEL ENTERPRISES LTD"
                  className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md focus:border-[#0B0D11] focus:outline-hidden text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B0D11] mb-1">
                  10-Digit Account Number *
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="0123456789"
                  className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md focus:border-[#0B0D11] focus:outline-hidden text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2.5">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
