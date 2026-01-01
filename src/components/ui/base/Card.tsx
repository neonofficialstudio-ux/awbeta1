
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> & {
  Header: React.FC<{ children: React.ReactNode; className?: string }>;
  Body: React.FC<{ children: React.ReactNode; className?: string; noPadding?: boolean }>;
  Footer: React.FC<{ children: React.ReactNode; className?: string }>;
} = ({ children, className = '', noPadding = false, onClick }) => {
  return (
    <div 
      className={`
        bg-[#1B1E23] border border-[#2A2D33] rounded-xl shadow-lg overflow-hidden 
        transition-all duration-300 ease-out
        ${onClick ? 'cursor-pointer hover:border-[#3A3D44] hover:-translate-y-1 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99]' : ''} 
        ${className}
      `}
      onClick={onClick}
    >
      <div className={`${noPadding ? '' : 'p-5'}`}>
        {children}
      </div>
    </div>
  );
};

const Header: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`border-b border-[#2A2D33] pb-4 mb-4 ${className}`}>
    {children}
  </div>
);

const Body: React.FC<{ children: React.ReactNode; className?: string; noPadding?: boolean }> = ({ children, className = '', noPadding = false }) => (
  <div className={`${noPadding ? '' : 'p-0'} ${className}`}>
    {children}
  </div>
);

const Footer: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`border-t border-[#2A2D33] pt-4 mt-4 ${className}`}>
    {children}
  </div>
);

Card.Header = Header;
Card.Body = Body;
Card.Footer = Footer;

export default Card;
