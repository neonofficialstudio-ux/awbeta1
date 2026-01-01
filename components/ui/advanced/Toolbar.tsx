
import React from 'react';

interface ToolbarProps {
  start?: React.ReactNode;
  center?: React.ReactNode;
  end?: React.ReactNode;
  className?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({ start, center, end, className = '' }) => {
  return (
    <div className={`flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6 ${className}`}>
      {start && (
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          {start}
        </div>
      )}
      
      {center && (
        <div className="flex-1 flex justify-center w-full md:w-auto">
          {center}
        </div>
      )}
      
      {end && (
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          {end}
        </div>
      )}
    </div>
  );
};

export default Toolbar;
