
import React, { useState } from 'react';
import Button from '../base/Button';

interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
  className?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({ children, onReset, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-[#1B1E23] border border-[#2A2D33] rounded-xl p-4 mb-6 ${className}`}>
      <div className="flex justify-between items-center md:hidden mb-4">
        <span className="text-sm font-bold text-[#808080] uppercase tracking-wider">Filtros</span>
        <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#FFD447] text-sm font-semibold hover:underline"
        >
            {isExpanded ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      <div className={`
        flex-col gap-4
        ${isExpanded ? 'flex' : 'hidden md:flex'}
        md:flex-row md:items-end md:flex-wrap
      `}>
        {children}
        
        {onReset && (
          <div className="mt-2 md:mt-0 md:ml-auto">
            <Button variant="ghost" size="sm" onClick={onReset}>
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
