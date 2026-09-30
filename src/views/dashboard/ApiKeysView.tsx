import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { ApiKeyScope } from '../../types';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Building2
} from 'lucide-react';

const AVAILABLE_SCOPES: { id: ApiKeyScope; label: string; desc: string }[] = [
  {
    id: 'project:read',
    label: 'project:read',
    desc: 'Read safe project metadata, store name, and status'
  },
  {
    id: 'bank_accounts:read',
    label: 'bank_accounts:read',
    desc: 'Read project receiving bank account details'
  },
  {
    id: 'bank_accounts:write',
    label: 'bank_accounts:write',
    desc: 'Update project receiving bank account details (Merchant Admin)'
  },
  {
    id: 'gmail_connection:read',
    label: 'gmail_connection:read',
    desc: 'Query bank-alert Gmail connection status'
  },
  {
    id: 'gmail_connection:manage',
    label: 'gmail_connection:manage',
    desc: 'Initiate Google OAuth connect & disconnect'
  },
  {
    id: 'orders:read',
    label: 'orders:read',
    desc: 'Query status of customer payment orders'
  },
  {
    id: 'orders:create',
    label: 'orders:create',
    desc: 'Create checkout payment orders (VeripayCheckout)'
  },
  {
    id: 'transactions:read',
    label: 'transactions:read',
    desc: 'View bank transaction alerts'
  }
];

export const ApiKeysView: React.FC = () => {
  const {
    apiKeys,
    createApiKey,
    revokeApiKey,
    projects,
    activeProject,
    setActiveProjectId
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('Merchant Backend & Checkout Integration');
  const [env, setEnv] = useState<'test' | 'live'>('live');
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
    'project:read',
    'bank_accounts:read',
    'bank_accounts:write',
    'gmail_connection:read',
    'gmail_connection:manage',
    'orders:read',
    'orders:create'
  ]);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter keys by active project
  const projectKeys = apiKeys.filter(k => !activeProject || k.projectId === activeProject.id);

  const toggleScope = (scopeId: ApiKeyScope) => {
    setSelectedScopes(prev =>
      prev.includes(scopeId) ? prev.filter(s => s !== scopeId) : [...prev, scopeId]
    );
  };

  const applyPreset = (preset: 'full' | 'admin' | 'checkout') => {
    if (preset === 'full') {
      setSelectedScopes([
        'project:read',
        'bank_accounts:read',
        'bank_accounts:write',
        'gmail_connection:read',
        'gmail_connection:manage',
        'orders:read',
        'orders:create',
        'transactions:read'
      ]);
    } else if (preset === 'admin') {
      setSelectedScopes([
        'project:read',
        'bank_accounts:read',
        'bank_accounts:write',
        'gmail_connection:read',
        'gmail_connection:manage'
      ]);
    } else if (preset === 'checkout') {
      setSelectedScopes(['project:read', 'bank_accounts:read', 'orders:read', 'orders:create']);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName || isSubmitting || selectedScopes.length === 0) return;
    setIsSubmitting(true);
    try {
      const { key } = await createApiKey(keyName, env, selectedScopes);
      setGeneratedKeyResult(key);
    } catch (err) {
      console.error('Failed to create key:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setGeneratedKeyResult(null);
    setCopiedKey(false);
    setKeyName('Merchant Backend & Checkout Integration');
  };

  const handleCopyKey = () => {
    if (generatedKeyResult) {
      navigator.clipboard.writeText(generatedKeyResult);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header & Project Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B0D11] tracking-tight">
            Project-Scoped API Credentials
          </h2>
          <p className="text-xs text-[#6C757D]">
            Generate hashed server-side integration keys for{' '}
            <strong className="text-[#0B0D11]">{activeProject?.name || 'your project'}</strong>.
            Show once upon creation; never stored in plaintext.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {projects.length > 0 && (
            <div className="flex items-center gap-2 bg-white border border-[#CED4DA] rounded-lg px-3 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#6C757D] shrink-0" />
              <span className="text-[#6C757D] text-[11px]">Project:</span>
              <select
                value={activeProject?.id || ''}
                onChange={e => setActiveProjectId(e.target.value)}
                className="font-semibold text-[#0B0D11] bg-transparent focus:outline-hidden cursor-pointer"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Generate Integration Key
          </Button>
        </div>
      </div>

      {/* Security Architecture Notice */}
      <div className="p-4 bg-white rounded-lg border border-[#DEE2E6] flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-bold text-[#0B0D11]">
            Strict Project Isolation &amp; Server-Side Credential Boundary
          </h4>
          <p className="text-[#6C757D] mt-0.5 leading-relaxed">
            Each API credential belongs strictly to <strong className="text-[#0B0D11]">{activeProject?.name || 'one project'}</strong>.
            A credential for Project A can never access Project B. Pass your secret key to{' '}
            <code className="font-mono text-[#0B0D11]">new VeripayClient(&#123; apiKey: process.env.VERIPAY_API_KEY &#125;)</code> on your backend server.{' '}
            <strong className="text-red-700">NEVER use VITE_VERIPAY_SECRET_KEY</strong> because <code className="font-mono">VITE_*</code> variables are exposed to browser JavaScript.
          </p>
        </div>
      </div>

      {/* Keys Table or Empty State */}
      <div className="bg-white rounded-lg border border-[#E9ECEF] overflow-hidden">
        {projectKeys.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="w-5 h-5 text-[#6C757D]" />}
            title="No Integration Keys Generated for This Project"
            description="Generate a project-scoped API key to connect your merchant backend, VeripayAdminSettings, and VeripayCheckout."
            actionLabel="Generate Integration Key"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E9ECEF] bg-[#F8F9FA] text-[#6C757D] uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Env</th>
                  <th className="py-3 px-4 font-mono">Key Prefix</th>
                  <th className="py-3 px-4">Permission Scopes</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Last Used</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Revoke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9ECEF]">
                {projectKeys.map(k => (
                  <tr key={k.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#0B0D11]">
                      {k.name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                          k.environment === 'live'
                            ? 'bg-[#0B0D11] text-white'
                            : 'bg-[#E9ECEF] text-[#495057]'
                        }`}
                      >
                        {k.environment}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-[#0B0D11]">
                      {k.prefix}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(k.scopes || ['bank_accounts:read', 'bank_accounts:write']).map(s => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 bg-[#F1F3F5] text-[#212529] rounded text-[10px] font-mono"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-[11px] text-[#6C757D]">
                      {new Date(k.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-[11px] text-[#6C757D]">
                      {k.lastUsedAt
                        ? new Date(k.lastUsedAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Never used'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={k.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {k.status === 'active' ? (
                        <button
                          onClick={() => revokeApiKey(k.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 border border-red-200 rounded-md transition-colors cursor-pointer"
                          title="Revoke Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-[#ADB5BD]">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GENERATE NEW API KEY MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={generatedKeyResult ? 'Copy Your Secret Integration Key' : 'Generate Project Integration Key'}
        subtitle={
          generatedKeyResult
            ? 'This complete secret is displayed strictly ONCE. Only its SHA-256 cryptographic hash is stored in the database.'
            : `Scoped to project: ${activeProject?.name || 'Active Store'}`
        }
      >
        {generatedKeyResult ? (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-md flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <div>
                <span className="font-bold">Server-Side Only — Shown Once:</span>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Save this secret in your merchant backend environment as{' '}
                  <code className="font-mono font-bold text-[#0B0D11]">VERIPAY_API_KEY</code>. Never place it in{' '}
                  <code className="font-mono font-bold text-red-700">VITE_VERIPAY_SECRET_KEY</code> or browser code.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#0B0D11] mb-1">
                Complete Project API Secret
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedKeyResult}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#CED4DA] font-mono font-semibold text-xs text-[#0B0D11] rounded-md select-all"
                />
                <Button variant="primary" size="sm" onClick={handleCopyKey}>
                  {copiedKey ? (
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 mr-1" />
                  )}
                  {copiedKey ? 'Copied' : 'Copy Secret'}
                </Button>
              </div>
            </div>

            <div className="p-3 bg-[#0B0D11] text-[#CED4DA] rounded-md font-mono text-[11px]">
              <div className="text-[10px] text-[#6C757D] mb-1">Server SDK Usage:</div>
              <pre className="overflow-x-auto">
{`const veripay = new VeripayClient({
  apiKey: process.env.VERIPAY_API_KEY
});`}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleCloseModal}>
                I Have Saved This Key
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#0B0D11] mb-1">
                Key Name / Integration Description *
              </label>
              <input
                type="text"
                required
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                placeholder="e.g. Store Website Backend & Checkout"
                className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md focus:border-[#0B0D11] focus:outline-hidden text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#0B0D11] mb-1">
                Environment
              </label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="env"
                    value="live"
                    checked={env === 'live'}
                    onChange={() => setEnv('live')}
                    className="text-[#0B0D11]"
                  />
                  <span className="font-semibold text-[#0B0D11]">Live Production (vpay_live_)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="env"
                    value="test"
                    checked={env === 'test'}
                    onChange={() => setEnv('test')}
                    className="text-[#6C757D]"
                  />
                  <span className="text-[#6C757D]">Test / Sandbox (vpay_test_)</span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-[#0B0D11]">
                  Permission Scopes ({selectedScopes.length} selected)
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => applyPreset('full')}
                    className="px-2 py-0.5 rounded bg-[#F1F3F5] hover:bg-[#E9ECEF] text-[#0B0D11] font-medium cursor-pointer"
                  >
                    All Scopes
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('admin')}
                    className="px-2 py-0.5 rounded bg-[#F1F3F5] hover:bg-[#E9ECEF] text-[#0B0D11] font-medium cursor-pointer"
                  >
                    Admin Only
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('checkout')}
                    className="px-2 py-0.5 rounded bg-[#F1F3F5] hover:bg-[#E9ECEF] text-[#0B0D11] font-medium cursor-pointer"
                  >
                    Checkout Only
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 border border-[#E9ECEF] p-3 rounded-lg max-h-52 overflow-y-auto bg-[#F8F9FA]/50">
                {AVAILABLE_SCOPES.map(scope => {
                  const isChecked = selectedScopes.includes(scope.id);
                  return (
                    <label
                      key={scope.id}
                      className="flex items-start gap-2.5 cursor-pointer hover:bg-white p-1.5 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleScope(scope.id)}
                        className="mt-0.5 text-[#0B0D11] rounded"
                      />
                      <div>
                        <span className="font-mono font-bold text-[11px] text-[#0B0D11] block">
                          {scope.label}
                        </span>
                        <span className="text-[10px] text-[#6C757D] block leading-tight">
                          {scope.desc}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E9ECEF]">
              <Button variant="outline" size="sm" type="button" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isSubmitting}
                disabled={selectedScopes.length === 0}
              >
                Generate Secret Key
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
