
import React from 'react';

export type ProgressVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'primary',
  showLabel = false,
  label,
  size = 'md',
  className = '',
  animate = true,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  // Enhanced Gradients
  const variants = {
    primary: 'bg-gradient-to-r from-[#E9BD3C] to-[#FFD447] shadow-[0_0_10px_rgba(255,212,71,0.3)]',
    secondary: 'bg-gradient-to-r from-[#7A31FF] to-[#00E8FF] shadow-[0_0_10px_rgba(0,232,255,0.3)]',
    success: 'bg-gradient-to-r from-[#27AE60] to-[#2ECC71] shadow-[0_0_10px_rgba(39,174,96,0.3)]',
    warning: 'bg-gradient-to-r from-[#F39C12] to-[#F1C40F] shadow-[0_0_10px_rgba(243,156,18,0.3)]',
    danger: 'bg-gradient-to-r from-[#C0392B] to-[#E74C3C] shadow-[0_0_10px_rgba(192,57,43,0.3)]',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider">
              {label}
            </span>
          )}
          {showLabel && (
            <span className="text-xs font-mono text-white">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div className={`w-full bg-[#0D0F12] rounded-full overflow-hidden border border-[#2A2D33] ${sizes[size]} relative`}>
        <div
          className={`h-full rounded-full relative overflow-hidden ${variants[variant]} ${animate ? 'transition-all duration-1000 ease-out' : ''}`}
          style={{ width: `${percentage}%` }}
        >
            {/* Shimmer Overlay */}
            {percentage > 0 && (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shine-sweep pointer-events-none"></div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
