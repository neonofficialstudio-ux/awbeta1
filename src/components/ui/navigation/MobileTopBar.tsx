
import React from 'react';

interface MobileTopBarProps {
  onMenuClick: () => void;
  title?: string;
  rightAction?: React.ReactNode;
  className?: string;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ 
  onMenuClick, 
  title = 'Artist World', 
  rightAction,
  className = ''
}) => {
  return (
    <div className={`
      md:hidden fixed top-0 left-0 right-0 z-40
      h-16 bg-[#0D0F12]/90 backdrop-blur-md border-b border-[#2A2D33]
      flex items-center justify-between px-4
      ${className}
    `}>
      <button
        onClick={onMenuClick}
        className="p-2 text-[#B3B3B3] hover:text-white bg-[#1B1E23] rounded-lg border border-[#2A2D33]"
        aria-label="Menu"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <div className="font-chakra font-bold text-lg text-white">
        {title}
      </div>

      <div className="w-10 flex justify-end">
        {rightAction}
      </div>
    </div>
  );
};

export default MobileTopBar;
