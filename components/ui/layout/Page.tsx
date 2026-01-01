
import React from 'react';

interface PageProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

const Page: React.FC<PageProps> = ({ 
  children, 
  title, 
  subtitle, 
  actions,
  className = ''
}) => {
  return (
    <div className={`flex flex-col min-h-full w-full ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            {title && (
              <h1 className="text-2xl md:text-3xl font-bold text-white font-chakra tracking-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-[#B3B3B3] mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      )}
      
      <div className="flex-1 animate-fade-in-up">
        {children}
      </div>
    </div>
  );
};

export default Page;
