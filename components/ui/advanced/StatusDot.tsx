
import React from 'react';

export type StatusType = 'online' | 'offline' | 'active' | 'pending' | 'error';

interface StatusDotProps {
  status: StatusType;
  pulse?: boolean;
  className?: string;
  label?: string;
}

const StatusDot: React.FC<StatusDotProps> = ({ status, pulse = false, className = '', label }) => {
  const colors = {
    online: 'bg-[#27AE60]',
    offline: 'bg-[#808080]',
    active: 'bg-[#2980B9]',
    pending: 'bg-[#F39C12]',
    error: 'bg-[#C0392B]',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex h-3 w-3">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors[status]}`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${colors[status]}`}></span>
      </div>
      {label && <span className="text-sm text-[#B3B3B3]">{label}</span>}
    </div>
  );
};

export default StatusDot;
