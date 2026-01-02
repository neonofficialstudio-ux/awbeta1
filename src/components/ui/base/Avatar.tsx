
import React from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  size?: AvatarSize;
  isVip?: boolean;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt, 
  fallback, 
  size = 'md', 
  isVip = false, 
  className = '' 
}) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl',
  };

  const vipGlow = isVip ? 'ring-2 ring-[#FFD447] shadow-[0_0_15px_rgba(255,212,71,0.5)]' : '';

  return (
    <div className={`relative inline-block ${sizes[size]} ${className}`}>
      <div className={`
        relative w-full h-full rounded-full overflow-hidden bg-[#2A2D33] flex items-center justify-center
        ${vipGlow}
      `}>
        {src ? (
          <img src={src} alt={alt || fallback} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-white">{fallback.substring(0, 2).toUpperCase()}</span>
        )}
      </div>
      {isVip && (
        <div className="absolute -bottom-1 -right-1 bg-[#FFD447] text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-[#121212]">
          VIP
        </div>
      )}
    </div>
  );
};

export default Avatar;
