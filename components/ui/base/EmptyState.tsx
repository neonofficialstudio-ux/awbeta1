
import React from 'react';
import Button from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-10 bg-[#1B1E23]/30 rounded-xl border-2 border-dashed border-[#2A2D33] ${className}`}>
      {icon && (
        <div className="mb-4 p-4 bg-[#2A2D33] rounded-full text-[#808080]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-[#808080] text-sm max-w-sm mb-6">{description}</p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="secondary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
