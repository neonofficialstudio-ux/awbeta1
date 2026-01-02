
import React from 'react';

interface TableResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const TableResponsiveWrapper: React.FC<TableResponsiveWrapperProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`w-full overflow-hidden rounded-xl border border-[#2A2D33] bg-[#1B1E23] shadow-sm ${className}`}>
      <div className="w-full overflow-x-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
};

export default TableResponsiveWrapper;
