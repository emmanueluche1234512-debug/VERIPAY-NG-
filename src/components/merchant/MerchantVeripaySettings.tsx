import React, { useState, useEffect } from 'react';
import {
  Mail,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Unlink,
  X,
  Lock,
  ArrowRight,
  Info,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import { merchantService } from '../../services/merchant';
import { gmailConnectionService } from '../../services/gmailConnection';
import { MerchantBankAccount, GmailConnection, Currency } from '../../types';

export interface MerchantVeripaySettingsProps {
  projectId?: string;
  projectName?: string;
  proxyBaseUrl?: string;
  onRefresh?: () => void;
  className?: string;
}

const SUPPORTED_BANKS = [
  'Access Bank',
  'Guaranty Trust Bank (GTBank)',
  'Zenith Bank',
  'First Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Kuda Bank',
  'Stanbic IBTC Bank',
  'Sterling Bank',
  'Fidelity Bank',
  'Wema Bank / ALAT',
  'Union Bank of Nigeria',
  'Moniepoint MFB',
  'OPay',
  'PalmPay'
];

export const MerchantVeripaySettings: React.FC<MerchantVeripaySettingsProps> = ({
  projectId = '',
  projectName = '',
  onRefresh,
  className = ''
}) => {
  const [loading, setLoading] = useState<boolean>(Boolean(projectId));
  const [bankAccount, setBankAccount] = useState<MerchantBankAccount>({
    bankName: '',
    accountName: '',
    accountNumber: '',
    currency: 'NGN'
  });

  // Direct editable form fields bound strictly to real Supabase bank_accounts record
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [currency, setCurrency] = useState<Currency>('NGN');

  const [gmailConnection, setGmailConnection] = useState<GmailConnection | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Save states
  const [bankSaving, setBankSaving] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankSuccess, setBankSuccess] = useState<string | null>(null);

  // Google OAuth Initiation Modal states (Phase 3A Contract — Never fakes connection)
  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState(false);
  const [oauthSessionData, setOauthSessionData] = useState<{ state: string; authUrl: string } | null>(null);
  const [oauthInitiating, setOauthInitiating] = useState(false);
  const [copiedAuthUrl, setCopiedAuthUrl] = useState(false);

  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [gmailActionLoading, setGmailActionLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load current project bank & Gmail status from Supabase
  const loadData = async () => {
    if (!projectId) {
      setBankAccount({ bankName: '', accountName: '', accountNumber: '', currency: 'NGN' });
      setBankName('');
      setAccountNumber('');
      setAccountName('');
      setGmailConnection(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setBankError(null);
    try {
      const status = await merchantService.getStatus(projectId);
      if (status) {
        setBankAccount(status.bankAccount);
        setBankName(status.bankAccount.bankName || SUPPORTED_BANKS[0]);
        setAccountNumber(status.bankAccount.accountNumber || '');
        setAccountName(status.bankAccount.accountName || '');
        setCurrency(status.bankAccount.currency || 'NGN');

        // Only treat as connected if status === 'connected' from real OAuth
        if (status.gmailConnection && status.gmailConnection.status === 'connected') {
          setGmailConnection(status.gmailConnection);
        } else {
          setGmailConnection(null);
        }
        setLastUpdated(status.lastUpdated);
      } else {
        setBankAccount({ bankName: '', accountName: '', accountNumber: '', currency: 'NGN' });
        setBankName(SUPPORTED_BANKS[0]);
        setAccountNumber('');
        setAccountName('');
        setGmailConnection(null);
      }
    } catch (err: any) {
      console.error('[VeripayAdminSettings] Error loading status from Supabase:', err);
      setBankError(err?.message || 'Failed to load bank configuration from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Save Bank Configuration to public.bank_accounts
  const handleSaveBankConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setBankError('No active project selected.');
      return;
    }

    setBankError(null);
    setBankSuccess(null);

    const cleanAcc = accountNumber.replace(/\D/g, '');
    if (cleanAcc.length !== 10) {
      setBankError('Nigerian NUBAN account number must be exactly 10 digits.');
      return;
    }
    if (!accountName.trim()) {
      setBankError('Account Name / Beneficiary is required.');
      return;
    }

    const selectedBank = bankName || SUPPORTED_BANKS[0];

    setBankSaving(true);
    try {
      const res = await merchantService.updateBankAccount(projectId, {
        bankName: selectedBank,
        accountName: accountName.trim().toUpperCase(),
        accountNumber: cleanAcc,
        currency
      });

      if (res.success && res.bankAccount) {
        setBankAccount(res.bankAccount);
        setBankName(res.bankAccount.bankName);
        setAccountName(res.bankAccount.accountName);
        setAccountNumber(res.bankAccount.accountNumber);
        setCurrency(res.bankAccount.currency);
        setLastUpdated(new Date().toISOString());
        setBankSuccess('Receiving bank configuration saved to Supabase.');
        setTimeout(() => setBankSuccess(null), 4000);
        onRefresh?.();
      } else {
        setBankError(res.error || 'Failed to save bank configuration.');
      }
    } catch (err: any) {
      setBankError(err?.message || 'Server error saving bank configuration.');
    } finally {
      setBankSaving(false);
    }
  };

  /**
   * Initiates Google OAuth 2.0 session via backend (`POST /api/v1/gmail-connection/connect`).
   */
  const handleInitiateGmailOAuth = async () => {
    if (!projectId) return;
    setOauthInitiating(true);
    setActionNotice(null);
    try {
      const session = await gmailConnectionService.initiateOAuth(
        projectId,
        `${window.location.origin}/api/auth/google/callback`
      );
      setOauthSessionData(session);
      setIsOAuthModalOpen(true);
    } catch (err: any) {
      console.warn('[VeripayAdminSettings] Error initiating OAuth:', err?.message);
    } finally {
      setOauthInitiating(false);
    }
  };

  // Disconnect Gmail
  const handleConfirmDisconnect = async () => {
    if (!projectId) return;
    setGmailActionLoading(true);
    try {
      await gmailConnectionService.disconnect(projectId, gmailConnection?.email);
      setGmailConnection(null);
      setIsDisconnectModalOpen(false);
      setActionNotice('Gmail bank-alert connection disconnected.');
      setTimeout(() => setActionNotice(null), 4000);
      onRefresh?.();
    } catch (err: any) {
      console.warn('[VeripayAdminSettings] Disconnect error:', err?.message);
    } finally {
      setGmailActionLoading(false);
    }
  };

  const handleCopyAuthUrl = () => {
    if (!oauthSessionData?.authUrl) return;
    navigator.clipboard.writeText(oauthSessionData.authUrl);
    setCopiedAuthUrl(true);
    setTimeout(() => setCopiedAuthUrl(false), 2200);
  };

  const isGmailConnected = Boolean(gmailConnection && gmailConnection.status === 'connected');
  const hasConfiguredBank = Boolean(bankAccount.bankName && bankAccount.accountNumber);

  const bankOptions =
    bankName && !SUPPORTED_BANKS.includes(bankName)
      ? [bankName, ...SUPPORTED_BANKS]
      : SUPPORTED_BANKS;

  return (
    <div className={`bg-white rounded-xl border border-[#DEE2E6] shadow-xs text-xs overflow-hidden ${className}`}>
      {/* Merchant Admin Component Header */}
      <div className="p-5 sm:p-6 border-b border-[#E9ECEF] bg-[#F8F9FA]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0B0D11] text-white flex items-center justify-center font-bold text-sm tracking-wide shrink-0">
              VP
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6C757D] block">
                PAYMENT &amp; BANK DETAILS
              </span>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h3 className="text-sm font-bold text-[#0B0D11] tracking-tight">
                  VERIPAY NG
                </h3>
                {projectId ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6C757D]">
                    No Project Selected
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-[11px] font-mono text-[#6C757D]">
              Store: <strong className="text-[#0B0D11]">{projectName || 'No Project Selected'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {(bankSuccess || actionNotice) && (
        <div className="mx-6 mt-5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{bankSuccess || actionNotice}</span>
        </div>
      )}

      {bankError && (
        <div className="mx-6 mt-5 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{bankError}</span>
        </div>
      )}

      {loading ? (
        <div className="p-10 flex items-center justify-center gap-2.5 text-xs text-[#6C757D]">
          <Loader2 className="w-4 h-4 animate-spin text-[#0B0D11]" />
          <span className="font-mono">Loading project bank configuration...</span>
        </div>
      ) : (
        <div className="p-6 space-y-8">
          {/* ==================================================================== */}
          {/* SECTION 1: RECEIVING BANK ACCOUNT */}
          {/* ==================================================================== */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0B0D11]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B0D11]">
                  RECEIVING BANK ACCOUNT
                </h4>
              </div>
              {lastUpdated && (
                <span className="text-[11px] font-mono text-[#6C757D]">
                  Updated{' '}
                  {new Date(lastUpdated).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              )}
            </div>

            {/* Zero Custody Notice */}
            <div className="p-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-lg flex items-start gap-2.5 text-[11px] text-[#495057]">
              <Lock className="w-3.5 h-3.5 text-[#0B0D11] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-[#0B0D11]">Destination Account Only:</strong> Customers paying via <code className="font-mono text-[#0B0D11]">VeripayCheckout</code> transfer directly to this bank account. VERIPAY NG never asks for banking passwords, PINs, OTPs, or card credentials.
              </p>
            </div>

            <form onSubmit={handleSaveBankConfiguration} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bank Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#0B0D11] mb-1.5">
                    Bank Name
                  </label>
                  <select
                    value={bankName || SUPPORTED_BANKS[0]}
                    onChange={e => setBankName(e.target.value)}
                    disabled={!projectId}
                    className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-lg text-xs font-medium text-[#0B0D11] focus:outline-hidden focus:border-[#0B0D11]"
                  >
                    {bankOptions.map(b => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#0B0D11] mb-1.5">
                    Account Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit NUBAN account number"
                    disabled={!projectId}
                    className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-lg text-xs font-mono font-bold tabular-nums text-[#0B0D11] focus:outline-hidden focus:border-[#0B0D11]"
                  />
                </div>

                {/* Account Name / Beneficiary */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#0B0D11] mb-1.5">
                    Account Name / Beneficiary
                  </label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="Registered Bank Account Name"
                    disabled={!projectId}
                    className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-lg text-xs uppercase font-medium text-[#0B0D11] focus:outline-hidden focus:border-[#0B0D11]"
                  />
                </div>

                {/* Settlement Currency */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#0B0D11] mb-1.5">
                    Settlement Currency
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as Currency)}
                    disabled={!projectId}
                    className="w-full px-3 py-2 bg-white border border-[#CED4DA] rounded-lg text-xs font-mono font-semibold text-[#0B0D11] focus:outline-hidden focus:border-[#0B0D11]"
                  >
                    <option value="NGN">NGN — Nigerian Naira (₦)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-[#6C757D]">
                  Active Destination:{' '}
                  {hasConfiguredBank ? (
                    <>
                      <strong className="text-[#0B0D11]">{bankAccount.bankName}</strong> ·{' '}
                      <span className="font-mono font-semibold text-[#0B0D11]">
                        {bankAccount.accountNumber}
                      </span>{' '}
                      ({bankAccount.accountName})
                    </>
                  ) : (
                    <strong className="text-[#495057]">Not Configured</strong>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={bankSaving || !projectId}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B0D11] text-white hover:bg-[#1E232B] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {bankSaving ? 'Saving Configuration...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </section>

          {/* ==================================================================== */}
          {/* SECTION 2: BANK ALERT GMAIL */}
          {/* ==================================================================== */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#0B0D11]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B0D11]">
                  BANK ALERT GMAIL
                </h4>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#6C757D]">Status:</span>
                {isGmailConnected ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#495057]">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Not Connected
                  </span>
                )}
              </div>
            </div>

            {isGmailConnected && gmailConnection ? (
              /* CONNECTED STATE (Only displayed when real Google OAuth has completed) */
              <div className="p-5 rounded-lg border border-[#E9ECEF] bg-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#6C757D] block">Connected Gmail</span>
                    <span className="text-sm font-bold font-mono text-[#0B0D11] block">
                      {gmailConnection.email}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#6C757D]">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Connected
                      </span>
                      <span>·</span>
                      <span>
                        Scope: <code className="font-mono text-[#0B0D11]">gmail.readonly</code>
                      </span>
                    </div>
                  </div>

                  {/* Required OAuth Management Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleInitiateGmailOAuth}
                      disabled={oauthInitiating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#CED4DA] text-[#0B0D11] hover:bg-[#F8F9FA] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#6C757D]" />
                      Change Gmail
                    </button>

                    <button
                      type="button"
                      onClick={handleInitiateGmailOAuth}
                      disabled={oauthInitiating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#CED4DA] text-[#0B0D11] hover:bg-[#F8F9FA] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Reconnect
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsDisconnectModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Disconnect Gmail
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* NOT CONNECTED STATE (Default until real Google OAuth completes in Phase 4) */
              <div className="p-5 rounded-lg border border-[#CED4DA] bg-[#F8F9FA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0B0D11]">Status: Not Connected</span>
                  </div>
                  <p className="text-xs text-[#495057] leading-relaxed">
                    Connect the Gmail account that receives bank transaction alerts for{' '}
                    <strong className="text-[#0B0D11]">
                      {bankAccount.bankName || bankName || 'your receiving bank'}
                    </strong>
                    .
                  </p>
                  <p className="text-[11px] text-[#6C757D] flex items-center gap-1.5 pt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>
                      Uses Google OAuth 2.0 (<code className="font-mono text-[#0B0D11]">gmail.readonly</code>) · Never asks for Gmail passwords
                    </span>
                  </p>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={handleInitiateGmailOAuth}
                    disabled={oauthInitiating || !projectId}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B0D11] text-white hover:bg-[#1E232B] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{oauthInitiating ? 'Starting OAuth...' : 'Connect Gmail'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================================================================== */}
      {/* GOOGLE OAUTH SESSION MODAL */}
      {/* ==================================================================== */}
      {isOAuthModalOpen && oauthSessionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-xl max-w-lg w-full border border-[#E9ECEF] shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#E9ECEF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#0B0D11] text-white flex items-center justify-center font-bold text-xs">
                  VP
                </div>
                <div>
                  <span className="text-xs font-bold text-[#0B0D11] block">
                    Google OAuth 2.0 Session Prepared
                  </span>
                  <span className="text-[10px] font-mono text-[#6C757D] block">
                    POST /api/v1/gmail-connection/connect
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOAuthModalOpen(false)}
                className="text-[#6C757D] hover:text-[#0B0D11] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-950 rounded-lg flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Phase 3A Honest OAuth Boundary:</span>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    VERIPAY NG has generated a cryptographic OAuth <code className="font-mono font-bold">state</code> token bound to project <strong className="text-[#0B0D11]">{projectName}</strong>.
                    Live Google OAuth callback token exchange and Gmail inbox polling belong to <strong>Phase 4 &amp; Phase 5</strong>.
                    Status honestly remains <strong>Not Connected</strong> until real Google OAuth authorization is completed.
                  </p>
                </div>
              </div>

              <div className="space-y-2 p-3.5 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF] font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#6C757D]">Bound Project ID:</span>
                  <span className="font-bold text-[#0B0D11]">{projectId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6C757D]">OAuth State Token:</span>
                  <span className="font-bold text-[#0B0D11]">{oauthSessionData.state}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6C757D]">Requested Scope:</span>
                  <span className="text-emerald-800 font-semibold">gmail.readonly</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-[#0B0D11]">
                    Generated Google OAuth Authorization URL
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAuthUrl}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B0D11] hover:underline cursor-pointer"
                  >
                    {copiedAuthUrl ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-[#0B0D11] text-[#CED4DA] rounded-md font-mono text-[10px] break-all">
                  {oauthSessionData.authUrl}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F8F9FA] border-t border-[#E9ECEF] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsOAuthModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B0D11] text-white hover:bg-[#1E232B] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DISCONNECT CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {isDisconnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-xl max-w-sm w-full border border-[#E9ECEF] shadow-xl overflow-hidden p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-700 flex items-center justify-center mx-auto">
              <Unlink className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h5 className="text-sm font-bold text-[#0B0D11]">
                Disconnect Gmail Account?
              </h5>
              <p className="text-xs text-[#6C757D] mt-1 leading-relaxed">
                Disconnecting{' '}
                <span className="font-mono font-semibold text-[#0B0D11]">{gmailConnection?.email}</span> will pause
                automated bank-alert verification until a mailbox is re-authorized via Google OAuth.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-[#CED4DA] text-[#495057] hover:bg-[#F8F9FA] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={gmailActionLoading}
                onClick={handleConfirmDisconnect}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {gmailActionLoading ? 'Disconnecting...' : 'Disconnect Gmail'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const VeripayAdminSettings = MerchantVeripaySettings;
