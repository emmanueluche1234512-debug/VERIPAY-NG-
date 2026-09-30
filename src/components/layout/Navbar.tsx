import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { ShieldCheck, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { navigate, isAuthenticated } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xs border-b border-[#E9ECEF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-md bg-[#0B0D11] text-white flex items-center justify-center font-bold text-sm tracking-wider">
              VP
            </div>
            <span className="text-base font-bold tracking-tight text-[#0B0D11]">
              VERIPAY NG
            </span>
          </button>
        </div>

        {/* Zone 2: 4–6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#495057]">
          <a href="#how-it-works" className="hover:text-[#0B0D11] transition-colors">
            How It Works
          </a>
          <a href="#architecture" className="hover:text-[#0B0D11] transition-colors">
            Architecture
          </a>
          <a href="#security" className="hover:text-[#0B0D11] transition-colors">
            Security Model
          </a>
          <button onClick={() => navigate('/docs')} className="hover:text-[#0B0D11] transition-colors cursor-pointer">
            Documentation
          </button>
          <a href="#faq" className="hover:text-[#0B0D11] transition-colors">
            FAQ
          </a>
        </nav>

        {/* Zone 3: 1–2 primary actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          {isAuthenticated ? (
            <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/signin')}>
                Sign In
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-[#495057] hover:text-[#0B0D11] hover:bg-[#F1F3F5] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E9ECEF] bg-white px-4 pt-2 pb-5 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-[#495057]">
            <a 
              href="#how-it-works" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-[#0B0D11]"
            >
              How It Works
            </a>
            <a 
              href="#architecture" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-[#0B0D11]"
            >
              Architecture
            </a>
            <a 
              href="#security" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-[#0B0D11]"
            >
              Security Model
            </a>
            <button 
              onClick={() => { setMobileMenuOpen(false); navigate('/docs'); }}
              className="py-1.5 text-left hover:text-[#0B0D11]"
            >
              Documentation
            </button>
            <a 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-[#0B0D11]"
            >
              FAQ
            </a>
          </nav>

          <div className="pt-3 border-t border-[#E9ECEF] flex flex-col gap-2">
            {isAuthenticated ? (
              <Button 
                variant="primary" 
                onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => { setMobileMenuOpen(false); navigate('/signin'); }}
                  className="w-full"
                >
                  Sign In
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
                  className="w-full"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
