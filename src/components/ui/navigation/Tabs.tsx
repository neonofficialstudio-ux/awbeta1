
import React, { useRef, useEffect } from 'react';

interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'solid' | 'segmented';
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ 
  items, 
  activeTab, 
  onChange, 
  variant = 'underline',
  className = ''
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const baseButton = "flex items-center justify-center px-4 py-3 text-sm font-medium transition-all duration-300 whitespace-nowrap relative group";

  const variants = {
    underline: {
      container: "border-b border-[#2A2D33]",
      buttonActive: "text-[#FFD447] border-b-2 border-[#FFD447] text-shadow-glow",
      buttonInactive: "text-[#B3B3B3] hover:text-white border-b-2 border-transparent hover:border-[#3A3D44]",
    },
    solid: {
      container: "p-1 bg-[#14171C] rounded-lg inline-flex",
      buttonActive: "bg-[#2A2D33] text-white shadow-sm rounded-md shadow-[0_0_10px_rgba(0,0,0,0.2)] ring-1 ring-white/5",
      buttonInactive: "text-[#808080] hover:text-[#B3B3B3] rounded-md hover:bg-white/5",
    },
    segmented: {
      container: "bg-[#1B1E23] border border-[#2A2D33] rounded-lg overflow-hidden inline-flex divide-x divide-[#2A2D33]",
      buttonActive: "bg-[#FFD447] text-black font-bold shadow-inner",
      buttonInactive: "bg-transparent text-[#B3B3B3] hover:bg-[#23262B] hover:text-white",
    }
  };

  // Logic: Only scroll if element is NOT visible, and do it instantly (no animation)
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement;
      
      if (activeElement) {
        const container = scrollContainerRef.current;
        
        // Get current scroll position and dimensions
        const containerLeft = container.scrollLeft;
        const containerRight = containerLeft + container.clientWidth;
        const tabLeft = activeElement.offsetLeft;
        const tabRight = tabLeft + activeElement.clientWidth;

        // Check if tab is fully visible
        const isFullyVisible = tabLeft >= containerLeft && tabRight <= containerRight;

        // Only adjust if NOT fully visible (e.g. partially cut off)
        if (!isFullyVisible) {
            const targetScrollLeft = tabLeft - (container.clientWidth / 2) + (activeElement.clientWidth / 2);
            
            container.scrollTo({
              left: targetScrollLeft,
              behavior: 'auto' // 'auto' removes the rolling animation (makes it instant)
            });
        }
      }
    }
  }, [activeTab]);

  return (
    <div 
      ref={scrollContainerRef}
      className={`overflow-x-auto no-scrollbar ${className}`}
    >
      <nav className={`flex ${variants[variant].container}`} aria-label="Tabs">
        {items.map((tab) => (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              ${baseButton}
              ${activeTab === tab.id ? variants[variant].buttonActive : variants[variant].buttonInactive}
            `}
          >
            {tab.icon && <span className={`mr-2 transition-colors ${activeTab === tab.id ? 'text-current' : 'text-gray-500 group-hover:text-gray-300'}`}>{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full transition-colors ${activeTab === tab.id ? 'bg-[#FFD447]/20 text-[#FFD447]' : 'bg-[#2A2D33] text-gray-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;
