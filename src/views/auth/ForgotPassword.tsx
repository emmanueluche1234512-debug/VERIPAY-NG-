import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const { resetPassword, navigate, isSupabaseConfigured } = useApp();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        await resetPassword(email);
      }
      setSubmitted(true);
    } catch (err: any) {
      console.error('Password recovery error:', err);
      setError(err?.message || 'Failed to send recovery email. Please try again.');
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
          Reset Your Password
        </h2>
        <p className="mt-1.5 text-xs text-[#6C757D]">
          Enter your developer email to receive a password recovery link.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-xl border border-[#E9ECEF] shadow-xs">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#0B0D11]">
                Check Your Email
              </h3>
              <p className="mt-1.5 text-xs text-[#6C757D] leading-relaxed">
                We've sent a password reset link to <strong className="text-[#0B0D11]">{email}</strong>. 
                Follow the link in the email to set a new password.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  size="md" 
                  onClick={() => navigate('/signin')}
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          ) : (
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
                    placeholder="dev@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CED4DA] rounded-md focus:outline-hidden focus:border-[#0B0D11] focus:ring-1 focus:ring-[#0B0D11] text-[#0B0D11]"
                  />
                  <Mail className="w-4 h-4 text-[#ADB5BD] absolute left-3 top-2.5" />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full mt-2"
              >
                Send Reset Link
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-[#E9ECEF] text-center text-xs text-[#6C757D]">
            <span>Remembered your password? </span>
            <button
              onClick={() => navigate('/signin')}
              className="font-semibold text-[#0B0D11] hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
