import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Database } from 'lucide-react';

export const SignIn: React.FC = () => {
  const { login, navigate, isSupabaseConfigured } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCredentialError, setIsCredentialError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your developer email address.');
      setIsCredentialError(false);
      return;
    }
    if (isSupabaseConfigured && !password) {
      setError('Please enter your password.');
      setIsCredentialError(false);
      return;
    }

    setError(null);
    setIsCredentialError(false);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      const msg: string = err?.message || '';
      console.warn('[SignIn] Authentication status:', msg);
      if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid credentials')) {
        setIsCredentialError(true);
        setError('Invalid email or password. If you have not created an account on this Supabase project yet, please create one first.');
      } else {
        setIsCredentialError(false);
        setError(msg || 'Authentication failed. Please verify your credentials.');
      }
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
          Sign in to Developer Console
        </h2>
        <p className="mt-1.5 text-xs text-[#6C757D]">
          Access your stores, bank verification alerts, and API keys.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Supabase backend status banner */}
        {isSupabaseConfigured ? (
          <div className="mb-4 p-3 bg-white rounded-lg border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-950">Supabase Auth & Database Connected</span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Authenticated session protected with PostgreSQL Row Level Security (RLS).
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-white rounded-lg border border-[#DEE2E6] flex items-start gap-2.5 text-xs text-[#495057] shadow-xs">
            <Database className="w-4 h-4 text-[#495057] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#0B0D11]">Phase 2 Supabase Foundation Active</span>
              <p className="text-[11px] text-[#6C757D] mt-0.5">
                Configure <code className="font-mono text-[#0B0D11]">VITE_SUPABASE_URL</code> to connect live project. Currently in developer evaluation mode.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white py-8 px-6 sm:px-8 rounded-xl border border-[#E9ECEF] shadow-xs">
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {isCredentialError && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/signup')}
                    className="w-full text-xs font-semibold bg-white border-red-200 text-red-800 hover:bg-red-50"
                  >
                    Go to Sign Up Page
                  </Button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0B0D11] mb-1">
                Developer Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CED4DA] rounded-md focus:outline-hidden focus:border-[#0B0D11] focus:ring-1 focus:ring-[#0B0D11] text-[#0B0D11]"
                />
                <Mail className="w-4 h-4 text-[#ADB5BD] absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#0B0D11]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-[11px] text-[#6C757D] hover:text-[#0B0D11] transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required={isSupabaseConfigured}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSupabaseConfigured ? "Enter your password" : "••••••••••••"}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CED4DA] rounded-md focus:outline-hidden focus:border-[#0B0D11] focus:ring-1 focus:ring-[#0B0D11] text-[#0B0D11]"
                />
                <Lock className="w-4 h-4 text-[#ADB5BD] absolute left-3 top-2.5" />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-2"
            >
              Sign In to Console
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E9ECEF] text-center text-xs text-[#6C757D]">
            <span>Don't have a developer account? </span>
            <button
              onClick={() => navigate('/signup')}
              className="font-semibold text-[#0B0D11] hover:underline cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-[#6C757D] hover:text-[#0B0D11] transition-colors"
          >
            ← Back to Veripay NG Homepage
          </button>
        </div>
      </div>
    </div>
  );
};
