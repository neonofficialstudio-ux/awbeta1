
import React from 'react';

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  noPadding?: boolean;
}

const Section: React.FC<SectionProps> = ({ 
  children, 
  title, 
  description, 
  className = '',
  noPadding = false
}) => {
  return (
    <section className={`bg-[#1B1E23] border border-[#2A2D33] rounded-xl overflow-hidden shadow-sm ${className}`}>
      {(title || description) && (
        <div className="px-6 py-5 border-b border-[#2A2D33]">
          {title && (
            <h3 className="text-lg font-bold text-white font-chakra">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-[#808080] mt-1">
              {description}
            </p>
          )}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </section>
  );
};

export default Section;
