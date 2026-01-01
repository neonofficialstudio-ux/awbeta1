
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  icon, 
  trend, 
  className = '' 
}) => {
  return (
    <div className={`bg-[#23262B] p-5 rounded-xl border border-[#2A2D33] ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-bold text-[#808080] uppercase tracking-wider">
          {label}
        </p>
        {icon && (
          <div className="text-[#FFD447] opacity-80">
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-end gap-2">
        <h4 className="text-2xl font-bold text-white font-chakra">
          {value}
        </h4>
        {trend && (
          <span className={`text-xs font-bold mb-1 ${trend.isPositive ? 'text-[#27AE60]' : 'text-[#C0392B]'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
