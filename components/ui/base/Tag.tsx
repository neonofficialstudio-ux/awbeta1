
import React from 'react';

export type TagVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

interface TagProps {
  label: string;
  variant?: TagVariant;
  icon?: React.ReactNode;
  className?: string;
}

const Tag: React.FC<TagProps> = ({ label, variant = 'neutral', icon, className = '' }) => {
  const variants = {
    neutral: 'bg-[#2A2D33] text-[#B3B3B3] border-[#3A3D44]',
    info: 'bg-[#2980B9]/20 text-[#5DADE2] border-[#2980B9]/50',
    success: 'bg-[#27AE60]/20 text-[#2ECC71] border-[#27AE60]/50',
    warning: 'bg-[#F39C12]/20 text-[#F1C40F] border-[#F39C12]/50',
    danger: 'bg-[#C0392B]/20 text-[#E74C3C] border-[#C0392B]/50',
    brand: 'bg-[#7A31FF]/20 text-[#A47DFF] border-[#7A31FF]/50',
  };

  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border
      ${variants[variant]} ${className}
    `}>
      {icon && <span className="mr-1.5 -ml-0.5">{icon}</span>}
      {label}
    </span>
  );
};

export default Tag;
