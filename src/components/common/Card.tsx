import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'white' | 'ash';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'white',
  padding = 'md'
}) => {
  const bgStyles = variant === 'white' ? 'bg-white' : 'bg-[#F8F9FA]';

  let padStyles = 'p-5';
  if (padding === 'none') padStyles = 'p-0';
  else if (padding === 'sm') padStyles = 'p-3.5';
  else if (padding === 'lg') padStyles = 'p-7';

  return (
    <div className={`rounded-lg border border-[#E9ECEF] ${bgStyles} ${padStyles} ${className}`}>
      {children}
    </div>
  );
};
