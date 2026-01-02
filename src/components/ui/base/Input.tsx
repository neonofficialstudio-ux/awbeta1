
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  fullWidth = true,
  icon,
  className = '',
  id,
  disabled,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`${fullWidth ? 'w-full' : 'inline-block'} ${className}`}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-xs font-bold text-[#B3B3B3] uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            block w-full bg-[#14171C] border rounded-lg text-white placeholder-[#808080]
            focus:outline-none focus:ring-1 focus:ring-[#FFD447] focus:border-[#FFD447]
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
            ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 text-sm
            ${error ? 'border-[#C0392B] focus:border-[#C0392B] focus:ring-[#C0392B]' : 'border-[#2A2D33] hover:border-[#3A3D44]'}
          `}
          disabled={disabled}
          {...props}
        />
      </div>

      {(error || helperText) && (
        <p className={`mt-1 text-xs ${error ? 'text-[#C0392B]' : 'text-[#808080]'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
