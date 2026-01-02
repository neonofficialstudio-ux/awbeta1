
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  color?: 'gold' | 'purple' | 'green' | 'blue' | 'neutral';
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  subtext, 
  color = 'neutral',
  className = '' 
}) => {
  
  const colors = {
    gold: 'text-[#FFD447]',
    purple: 'text-[#7A31FF]',
    green: 'text-[#27AE60]',
    blue: 'text-[#2980B9]',
    neutral: 'text-white',
  };

  return (
    <div className={`bg-[#1B1E23] p-6 rounded-xl border border-[#2A2D33] h-full flex flex-col justify-between ${className}`}>
      <div className="mb-2">
        <h5 className="text-xs font-bold text-[#808080] uppercase tracking-wider">
          {title}
        </h5>
      </div>
      <div>
        <p className={`text-3xl font-bold font-chakra mb-1 ${colors[color]}`}>
          {value}
        </p>
        {subtext && (
          <p className="text-xs text-[#B3B3B3]">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
