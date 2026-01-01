
import React from 'react';

interface FormFieldProps {
  label?: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({ 
  label, 
  description, 
  error, 
  children, 
  htmlFor, 
  className = '',
  required = false
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label 
          htmlFor={htmlFor} 
          className="block text-sm font-medium text-[#B3B3B3] mb-1.5"
        >
          {label}
          {required && <span className="text-[#C0392B] ml-1">*</span>}
        </label>
      )}
      
      {children}

      {error && (
        <p className="mt-1.5 text-xs text-[#C0392B] animate-fade-in-up">
          {error}
        </p>
      )}

      {!error && description && (
        <p className="mt-1.5 text-xs text-[#808080]">
          {description}
        </p>
      )}
    </div>
  );
};

export default FormField;
