import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Lock, Mail, User, Building2, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SignUp: React.FC = () => {
  const { signup, navigate, isSupabaseConfigured } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const immediateSession = await signup(fullName, email, password, company);
      if (!immediateSession) {
        // Email confirmation is required by Supabase project settings
        setConfirmationNotice(
          `Confirmation email sent to ${email}. Please check your inbox and verify your email to log in.`
        );
      }
    } catch (err: any) {
      console.warn('[SignUp] Registration notice:', err?.message);
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <button 
          onClick={() => navigate('/')} 
          className="inline-flex items-center gap-2 mb-6 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-md bg-[#0B0D11] text-white flex items-center justify-center font-bold text-sm">
            VP
          </div>
          <span className="text-base font-bold tracking-tight text-[#0B0D11]">
            VERIPAY NG
          </span>
        </button>

        <h2 className="text-2xl font-bold tracking-tight text-[#0B0D11]">
          Create Developer Account
        </h2>
        <p className="mt-1.5 text-xs text-[#6C757D]">
          Start verifying bank-transfer payments for your projects.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Security / RLS Note */}
        <div className="mb-4 p-3 bg-white rounded-lg border border-[#DEE2E6] flex items-start gap-2.5 text-xs text-[#495057] shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#0B0D11]">PostgreSQL Tenant Isolation:</span>
            <p className="text-[11px] text-[#6C757D] mt-0.5">
              Registration initializes your profile in <code className="font-mono text-[#0B0D11]">public.profiles</code>. Default role is restricted to 'developer'.
            </p>
          </div>
        </div>

        <div className="bg-white py-8 px-6 sm:px-8 rounded-xl border border-[#E9ECEF] shadow-xs">
          {confirmationNotice ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#0B0D11]">
                Check Your Email
              </h3>
              <p className="mt-2 text-xs text-[#6C757D] leading-relaxed">
                {confirmationNotice}
              </p>
              <div className="mt-6">
                <Button variant="primary" size="md" onClick={() => navigate('/signin')} className="w-full">
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#0B0D11] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Samuel Okafor"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CED4DA] rounded-md focus:outline-hidden focus:border-[#0B0D11] focus:ring-1 focus:ring-[#0B0D11] text-[#0B0D11]"
                    />
                    <User className="w-4 h-4 text-[#ADB5BD] absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B0D11] mb-1">
                    Developer / Work Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="dev@yourbusiness.ng"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CED4DA] rounded-md focus:outline-hidden focus:border-[#0B0D11] focus:ring-1 focus:ring-[#0B0D11] text-[#0B0D11]"
                    />
                    <Mail className="w-4 h-4 text-[#ADB5BD] absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B0D11] mb-1">
                    Company / Store Name (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Samuel Fashion Store"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CED4DA] rounded-md focus:outline-hidden focus:border-[#0B0D11] focus:ring-1 focus:ring-[#0B0D11] text-[#0B0D11]"
                    />
                    <Building2 className="w-4 h-4 text-[#ADB5BD] absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B0D11] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CED4DA] rounded-md focus:outline-hidden focus:border-[#0B0D11] focus:ring-1 focus:ring-[#0B0D11] text-[#0B0D11]"
                    />
                    <Lock className="w-4 h-4 text-[#ADB5BD] absolute left-3 top-2.5" />
                  </div>
                  <p className="text-[10px] text-[#6C757D] mt-1">
                    Must be at least 8 characters.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={loading}
                  className="w-full mt-2"
                >
                  Create Account
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-[#E9ECEF] text-center text-xs text-[#6C757D]">
            <span>Already have an account? </span>
            <button
              onClick={() => navigate('/signin')}
              className="font-semibold text-[#0B0D11] hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-[#6C757D] hover:text-[#0B0D11] transition-colors"
          >
            ← Back to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};
