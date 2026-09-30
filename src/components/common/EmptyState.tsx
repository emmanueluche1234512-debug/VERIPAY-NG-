import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 md:p-14 bg-white rounded-lg border border-[#E9ECEF]">
      {icon && (
        <div className="p-3 bg-[#F8F9FA] rounded-md text-[#495057] mb-4 border border-[#E9ECEF]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#0B0D11] tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-[#6C757D] max-w-sm mt-1 mb-6 leading-relaxed">
        {description}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {actionLabel && onAction && (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
