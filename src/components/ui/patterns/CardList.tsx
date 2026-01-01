
import React from 'react';

interface CardListProps {
  children: React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

const CardList: React.FC<CardListProps> = ({ 
  children, 
  className = '',
  emptyMessage = 'Nenhum item encontrado.'
}) => {
  
  const hasChildren = React.Children.count(children) > 0;

  if (!hasChildren) {
    return (
      <div className="py-12 px-4 text-center bg-[#1B1E23]/50 border-2 border-dashed border-[#2A2D33] rounded-xl">
        <p className="text-[#808080] text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
      {children}
    </div>
  );
};

export default CardList;
