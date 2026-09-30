import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let widthClass = 'max-w-md';
  if (maxWidth === 'sm') widthClass = 'max-w-sm';
  if (maxWidth === 'lg') widthClass = 'max-w-lg';
  if (maxWidth === 'xl') widthClass = 'max-w-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Modal overlay: black with appropriate transparency */}
      <div 
        className="fixed inset-0 bg-[#0B0D11]/70 backdrop-blur-xs transition-opacity duration-150" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${widthClass} bg-white rounded-lg border border-[#DEE2E6] shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E9ECEF]">
          <div>
            <h3 id="modal-title" className="text-base font-semibold text-[#0B0D11] tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#6C757D] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-[#6C757D] hover:text-[#0B0D11] hover:bg-[#F1F3F5] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
