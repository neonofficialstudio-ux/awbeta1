
import React from 'react';

type BannerVariant = 'info' | 'warning' | 'danger' | 'success';

interface InfoBannerProps {
  title: string;
  message?: string;
  variant?: BannerVariant;
  action?: React.ReactNode;
  className?: string;
}

const InfoBanner: React.FC<InfoBannerProps> = ({ 
  title, 
  message, 
  variant = 'info', 
  action,
  className = '' 
}) => {
  
  const styles = {
    info: {
      bg: 'bg-[#2980B9]/10',
      border: 'border-[#2980B9]/30',
      icon: 'text-[#2980B9]',
      title: 'text-[#5DADE2]',
    },
    warning: {
      bg: 'bg-[#F39C12]/10',
      border: 'border-[#F39C12]/30',
      icon: 'text-[#F39C12]',
      title: 'text-[#F1C40F]',
    },
    danger: {
      bg: 'bg-[#C0392B]/10',
      border: 'border-[#C0392B]/30',
      icon: 'text-[#C0392B]',
      title: 'text-[#E74C3C]',
    },
    success: {
      bg: 'bg-[#27AE60]/10',
      border: 'border-[#27AE60]/30',
      icon: 'text-[#27AE60]',
      title: 'text-[#2ECC71]',
    }
  };

  const currentStyle = styles[variant];

  return (
    <div className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center gap-4 ${currentStyle.bg} ${currentStyle.border} ${className}`}>
      <div className="flex gap-3 flex-1">
        <div className={`flex-shrink-0 mt-0.5 ${currentStyle.icon}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className={`text-sm font-bold ${currentStyle.title}`}>{title}</h4>
          {message && <p className="text-sm text-[#B3B3B3] mt-1 leading-relaxed">{message}</p>}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0 self-end md:self-center">
          {action}
        </div>
      )}
    </div>
  );
};

export default InfoBanner;
