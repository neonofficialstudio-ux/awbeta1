
import React from 'react';

interface ChartContainerProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  height?: string | number;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
  actions,
  className = '',
  height = '300px',
}) => {
  return (
    <div className={`bg-[#1B1E23] border border-[#2A2D33] rounded-xl shadow-sm flex flex-col ${className}`}>
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 py-5 border-b border-[#2A2D33] gap-4">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-white font-chakra">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-[#808080] mt-1 uppercase tracking-wider font-semibold">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      
      <div className="p-6 w-full relative" style={{ height }}>
        {children}
      </div>
    </div>
  );
};

export default ChartContainer;
