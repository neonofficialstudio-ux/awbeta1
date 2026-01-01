
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  // Base styles with Micro-interactions
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 ease-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.96] hover:scale-[1.02] relative overflow-hidden group";

  // Size styles
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base",
  };

  // Variant styles (Based on AW Tokens + Glows)
  const variantStyles = {
    primary: "bg-[#FFD447] text-black hover:bg-[#E9BD3C] shadow-[0_0_15px_rgba(255,212,71,0.2)] hover:shadow-[0_0_25px_rgba(255,212,71,0.4)] border border-transparent",
    secondary: "bg-[#1B1E23] text-white border border-[#2A2D33] hover:bg-[#23262B] hover:border-[#525252] hover:shadow-md",
    ghost: "bg-transparent text-[#B3B3B3] hover:text-white hover:bg-white/5",
    danger: "bg-[#C0392B] text-white hover:bg-[#E74C3C] shadow-[0_0_15px_rgba(192,57,43,0.2)] hover:shadow-[0_0_20px_rgba(192,57,43,0.4)]",
    success: "bg-[#27AE60] text-white hover:bg-[#2ECC71] shadow-[0_0_15px_rgba(39,174,96,0.2)] hover:shadow-[0_0_20px_rgba(39,174,96,0.4)]",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Ripple Effect Layer (CSS handled via group-active usually, simplistic here) */}
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
      
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2 relative z-10 transition-transform group-hover:-translate-x-0.5">{leftIcon}</span>}
      <span className="relative z-10">{children}</span>
      {!isLoading && rightIcon && <span className="ml-2 relative z-10 transition-transform group-hover:translate-x-0.5">{rightIcon}</span>}
    </button>
  );
};

export default Button;
