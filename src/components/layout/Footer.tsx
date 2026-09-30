import React from 'react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { navigate } = useApp();

  return (
    <footer className="border-t border-[#E9ECEF] bg-white text-[#495057]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#0B0D11] text-white flex items-center justify-center font-bold text-xs">
                VP
              </div>
              <span className="text-sm font-bold tracking-tight text-[#0B0D11]">
                VERIPAY NG
              </span>
            </div>
            <p className="text-xs text-[#6C757D] leading-relaxed">
              Bank-transfer payment verification service for Nigerian businesses and developers. Automated alert ingestion with deterministic matching.
            </p>
            <div className="pt-2 text-[11px] text-[#6C757D]">
              <span className="font-semibold text-[#0B0D11]">Notice:</span> Veripay NG is a verification utility, not a payment gateway or custodian. We do not hold funds or collect bank credentials.
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#0B0D11] tracking-wider uppercase mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('/dashboard')} className="hover:text-[#0B0D11] transition-colors cursor-pointer">
                  Developer Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/docs')} className="hover:text-[#0B0D11] transition-colors cursor-pointer">
                  API Reference
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/projects')} className="hover:text-[#0B0D11] transition-colors cursor-pointer">
                  Store Management
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/webhooks')} className="hover:text-[#0B0D11] transition-colors cursor-pointer">
                  Webhook Infrastructure
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#0B0D11] tracking-wider uppercase mb-3">
              Security & Rules
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#security" className="hover:text-[#0B0D11] transition-colors">
                  Zero Credential Model
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-[#0B0D11] transition-colors">
                  Deterministic Engine
                </a>
              </li>
              <li>
                <button onClick={() => navigate('/manual-review')} className="hover:text-[#0B0D11] transition-colors cursor-pointer">
                  Manual Review Audit
                </button>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#0B0D11] transition-colors">
                  Anti-Replay Protection
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#0B0D11] tracking-wider uppercase mb-3">
              Developer Resources
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('/signin')} className="hover:text-[#0B0D11] transition-colors cursor-pointer">
                  Console Sign In
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/signup')} className="hover:text-[#0B0D11] transition-colors cursor-pointer">
                  Create Developer Account
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/docs')} className="hover:text-[#0B0D11] transition-colors cursor-pointer">
                  Quick Start Guide
                </button>
              </li>
              <li className="pt-2 text-[11px] text-[#ADB5BD]">
                Engine Version 1.0 (Phase 1 Baseline)
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#E9ECEF] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6C757D] gap-4">
          <p>© {new Date().getFullYear()} Veripay NG. Built for bank-transfer verification in Nigeria.</p>
          <div className="flex items-center gap-6">
            <span>Ash / Grey / Black Design Standard</span>
            <span>Deterministic Reconciliation</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
