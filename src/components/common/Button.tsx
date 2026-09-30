import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  // Brand System: Ash, Grey, Black
  // Primary buttons: black, text: white
  // Secondary buttons: ash/grey with dark text
  let variantStyles = 'bg-[#0B0D11] text-white hover:bg-[#1E232B] active:bg-[#000000] border border-[#0B0D11] shadow-xs';

  if (variant === 'secondary') {
    variantStyles = 'bg-[#F1F3F5] text-[#212529] hover:bg-[#E9ECEF] active:bg-[#DEE2E6] border border-[#E9ECEF]';
  } else if (variant === 'outline') {
    variantStyles = 'bg-white text-[#212529] hover:bg-[#F8F9FA] active:bg-[#F1F3F5] border border-[#CED4DA]';
  } else if (variant === 'danger') {
    variantStyles = 'bg-white text-[#DC2626] hover:bg-[#FEF2F2] active:bg-[#FEE2E2] border border-[#FCA5A5]';
  } else if (variant === 'ghost') {
    variantStyles = 'bg-transparent text-[#495057] hover:text-[#0B0D11] hover:bg-[#F1F3F5] border border-transparent';
  }

  let sizeStyles = 'px-3.5 py-2 text-xs font-semibold';
  if (size === 'sm') {
    sizeStyles = 'px-2.5 py-1.5 text-xs font-medium';
  } else if (size === 'lg') {
    sizeStyles = 'px-5 py-2.5 text-sm font-semibold';
  }

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-md transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};
