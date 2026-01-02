
import React from 'react';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'neon';

interface BadgeProps {
  label: string;
  tier?: BadgeTier;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ label, tier = 'bronze', className = '' }) => {
  const tiers = {
    bronze: 'bg-gradient-to-b from-[#CD7F32] to-[#8B4513] text-white border-[#A0522D]',
    silver: 'bg-gradient-to-b from-[#E0E0E0] to-[#7F8C8D] text-[#2C3E50] border-[#BDC3C7]',
    gold: 'bg-gradient-to-b from-[#FFD700] to-[#B8860B] text-[#3E2723] border-[#DAA520]',
    neon: 'bg-black border-[#7A31FF] text-[#A47DFF] shadow-[0_0_10px_rgba(122,49,255,0.4)]',
  };

  return (
    <span className={`
      inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
      shadow-sm ${tiers[tier]} ${className}
    `}>
      {label}
    </span>
  );
};

export default Badge;
