import React from 'react';
import { OrderStatus, ReviewStatus, AlertType } from '../../types';

interface StatusBadgeProps {
  status: OrderStatus | ReviewStatus | AlertType | 'active' | 'revoked' | 'disabled' | 'success' | 'failed' | 'retrying' | 'not_connected' | 'not_configured' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase();

  // Ash + Grey + Black system: status colors used strictly & sparingly
  let dotColor = 'bg-[#6C757D]'; // Default grey
  let textColor = 'text-[#495057]';
  let label = status.replace(/_/g, ' ');

  if (['verified', 'approved', 'active', 'success', 'credit'].includes(normalized)) {
    dotColor = 'bg-[#16A34A]';
    textColor = 'text-[#15803D]';
  } else if (['pending', 'manual_review', 'retrying', 'warning'].includes(normalized)) {
    dotColor = 'bg-[#D97706]';
    textColor = 'text-[#B45309]';
  } else if (['failed', 'rejected', 'expired', 'cancelled', 'revoked', 'debit', 'withdrawal'].includes(normalized)) {
    dotColor = 'bg-[#DC2626]';
    textColor = 'text-[#B91C1C]';
  } else if (['not_connected', 'not_configured', 'disabled', 'unmatched', 'neutral'].includes(normalized)) {
    dotColor = 'bg-[#ADB5BD]';
    textColor = 'text-[#6C757D]';
  }

  const sizeClasses = size === 'sm' ? 'text-[11px] py-0.5' : 'text-xs py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium tracking-tight capitalize ${textColor} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
