
import React from 'react';

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}

interface SidebarMenuProps {
  items: MenuItem[];
  className?: string;
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex flex-col space-y-1 ${className}`}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          className={`
            flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group
            ${item.isActive 
              ? 'bg-[#FFD447] text-black shadow-[0_0_15px_rgba(255,212,71,0.3)]' 
              : 'text-[#B3B3B3] hover:bg-[#1B1E23] hover:text-white'
            }
          `}
        >
          {item.icon && (
            <span className={`mr-3 ${item.isActive ? 'text-black' : 'text-[#808080] group-hover:text-[#FFD447]'}`}>
              {item.icon}
            </span>
          )}
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default SidebarMenu;
