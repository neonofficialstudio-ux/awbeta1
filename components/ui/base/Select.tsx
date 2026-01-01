
import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  options: Option[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  error,
  disabled = false,
  fullWidth = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleToggle = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`${fullWidth ? 'w-full' : 'inline-block'} relative text-left ${className}`}
    >
      {label && (
        <label className="block text-xs font-bold text-[#B3B3B3] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          flex items-center justify-between w-full bg-[#14171C] border rounded-lg px-3 py-2.5 text-sm text-left
          transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-[#FFD447]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${error ? 'border-[#C0392B]' : isOpen ? 'border-[#FFD447]' : 'border-[#2A2D33] hover:border-[#3A3D44]'}
        `}
      >
        <span className={`block truncate ${selectedOption ? 'text-white' : 'text-[#808080]'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="pointer-events-none ml-2">
          <svg className={`h-4 w-4 text-[#808080] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-[#1B1E23] border border-[#2A2D33] rounded-lg shadow-xl max-h-60 overflow-auto py-1 animate-fade-in-up">
          {options.length > 0 ? (
            options.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  cursor-pointer select-none relative py-2.5 pl-3 pr-9 text-sm transition-colors
                  ${option.value === value ? 'bg-[#FFD447]/10 text-[#FFD447]' : 'text-[#B3B3B3] hover:bg-white/5 hover:text-white'}
                `}
              >
                <span className={`block truncate ${option.value === value ? 'font-semibold' : 'font-normal'}`}>
                  {option.label}
                </span>
                {option.value === value && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#FFD447]">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="py-2 px-3 text-sm text-[#808080]">Nenhuma opção</div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-[#C0392B]">{error}</p>
      )}
    </div>
  );
};

export default Select;
