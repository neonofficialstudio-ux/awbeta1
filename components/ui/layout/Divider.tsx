
import React from 'react';

interface DividerProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

const Divider: React.FC<DividerProps> = ({ 
  className = '', 
  orientation = 'horizontal' 
}) => {
  if (orientation === 'vertical') {
    return <div className={`w-px h-full bg-[#3A3D44] mx-2 ${className}`} />;
  }
  
  return <hr className={`w-full border-t border-[#3A3D44] my-4 ${className}`} />;
};

export default Divider;
