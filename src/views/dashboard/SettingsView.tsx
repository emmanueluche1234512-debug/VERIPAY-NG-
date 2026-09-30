import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { merchantService } from '../../services/merchant';
import { User, Building, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { Currency } from '../../types';

export const SettingsView: React.FC = () => {
  const { user, activeProject, auditLogs, refreshData } = useApp();
  const [saved, setSaved] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [company, setCompany] = useState(user?.company || '');

  // Receiving bank configuration state synced to activeProject
  const [bankName, setBankName] = useState(activeProject?.receivingBank?.bankName || '');
  const [accountName, setAccountName] = useState(activeProject?.receivingBank?.accountName || '');
  const [accountNumber, setAccountNumber] = useState(
    activeProject?.receivingBank?.accountNumber || ''
  );
  const [currency, setCurrency] = useState<Currency>(
    activeProject?.receivingBank?.currency || activeProject?.currency || 'NGN'
  );
  const [bankSaving, setBankSaving] = useState(false);
  const [bankSavedNotice, setBankSavedNotice] = useState<string | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user?.fullName || '');
    setCompany(user?.company || '');
  }, [user]);

  useEffect(() => {
    setBankName(activeProject?.receivingBank?.bankName || '');
    setAccountName(activeProject?.receivingBank?.accountName || '');
    setAccountNumber(activeProject?.receivingBank?.accountNumber || '');
    setCurrency(activeProject?.receivingBank?.currency || activeProject?.currency || 'NGN');
    setBankError(null);
    setBankSavedNotice(null);
  }, [
    activeProject?.id,
    activeProject?.receivingBank?.bankName,
    activeProject?.receivingBank?.accountName,
    activeProject?.receivingBank?.accountNumber,
    activeProject?.receivingBank?.currency
  ]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setBankError(null);
    setBankSavedNotice(null);

    const cleanAcc = accountNumber.replace(/\D/g, '');
    if (cleanAcc.length !== 10) {
      setBankError('Nigerian NUBAN account number must be exactly 10 digits.');
      return;
    }
    if (!bankName.trim() || !accountName.trim()) {
      setBankError('Bank Name and Account Name are required.');
      return;
    }

    setBankSaving(true);
    try {
      const res = await merchantService.updateBankAccount(activeProject.id, {
        bankName: bankName.trim(),
        accountName: accountName.trim().toUpperCase(),
        accountNumber: cleanAcc,
        currency
      });
      if (res.success) {
        setBankSavedNotice('Receiving bank account updated in Supabase.');
        setTimeout(() => setBankSavedNotice(null), 3500);
        await refreshData();
      } else {
        setBankError(res.error || 'Failed to update bank account.');
      }
    } catch (err: any) {
      setBankError(err?.message || 'Error updating bank account.');
    } finally {
      setBankSaving(false);
    }
  };

  const selectedProjectId = activeProject?.id || '';
  const projectAuditLogs = selectedProjectId
    ? auditLogs.filter(l => !l.projectId || l.projectId === selectedProjectId)
    : auditLogs;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#0B0D11]">Settings &amp; Audit Logs</h2>
        <p className="text-xs text-[#6C757D]">
          Manage your developer profile, project receiving bank details, and security audit trail
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Profile & Active Project Settings */}
        <div className="lg:col-span-6 space-y-6">
          <Card variant="white" padding="lg">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-[#E9ECEF]">
              <User className="w-4 h-4 text-[#0B0D11]" />
              <h3 className="text-sm font-bold text-[#0B0D11]">Developer Profile</h3>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#212529] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md text-[#0B0D11] focus:outline-none focus:border-[#0B0D11]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#212529] mb-1.5">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E9ECEF] rounded-md text-[#6C757D] font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-[#212529] mb-1.5">
                  Organization / Store Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-md text-[#0B0D11] focus:outline-none focus:border-[#0B0D11]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                {saved ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Profile preferences updated
                  </span>
                ) : (
                  <span />
                )}
                <Button type="submit" variant="primary" size="sm">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {activeProject && (
            <Card variant="white" padding="lg">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E9ECEF]">
                <div className="flex items-center gap-2.5">
                  <Building className="w-4 h-4 text-[#0B0D11]" />
                  <h3 className="text-sm font-bold text-[#0B0D11]">
                    Active Project Receiving Bank ({activeProject.name})
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[#6C757D]">
                  {activeProject.receivingBank?.accountNumber ? 'Configured' : 'Not Configured'}
                </span>
              </div>

              {bankSavedNotice && (
                <div className="mb-4 p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{bankSavedNotice}</span>
                </div>
              )}

              {bankError && (
                <div className="mb-4 p-2.5 rounded bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{bankError}</span>
                </div>
              )}

              <form onSubmit={handleSaveBank} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#212529] mb-1">
                      Receiving Bank Name
                    </label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      placeholder="Not Configured"
                      className="w-full px-3 py-1.5 bg-white border border-[#CED4DA] rounded-md text-[#0B0D11]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#212529] mb-1">
                      Account Number (10 digits)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Not Configured"
                      className="w-full px-3 py-1.5 bg-white border border-[#CED4DA] rounded-md font-mono font-bold text-[#0B0D11]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#212529] mb-1">
                    Account Name / Beneficiary
                  </label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="Not Configured"
                    className="w-full px-3 py-1.5 bg-white border border-[#CED4DA] rounded-md uppercase text-[#0B0D11]"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" size="sm" disabled={bankSaving}>
                    {bankSaving ? 'Saving...' : 'Save Receiving Bank'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>

        {/* Right column: Audit Logs */}
        <div className="lg:col-span-6">
          <Card variant="white" padding="lg">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E9ECEF]">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-[#0B0D11]" />
                <div>
                  <h3 className="text-sm font-bold text-[#0B0D11]">Security &amp; Audit Logs</h3>
                  <p className="text-[11px] text-[#6C757D]">
                    Immutable log of project actions and verification events
                  </p>
                </div>
              </div>
            </div>

            {projectAuditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#6C757D]">
                No audit log events recorded yet for this project.
              </div>
            ) : (
              <div className="space-y-3">
                {projectAuditLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 rounded-md bg-[#F8F9FA] border border-[#E9ECEF] text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#0B0D11]">{log.action}</span>
                      <p className="text-[#495057] mt-0.5">{log.details}</p>
                      <span className="text-[10px] font-mono text-[#6C757D] mt-1 block">
                        Actor: {log.actor}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#6C757D] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
