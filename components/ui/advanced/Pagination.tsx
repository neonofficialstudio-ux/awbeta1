
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`
          px-3 py-2 rounded-lg text-sm font-bold border transition-all
          ${currentPage === 1 
            ? 'bg-[#1B1E23] border-[#2A2D33] text-[#808080] cursor-not-allowed' 
            : 'bg-[#23262B] border-[#3A3D44] text-white hover:bg-[#2A2D33] hover:border-[#FFD447]'
          }
        `}
      >
        Anterior
      </button>

      {/* Pages (Hidden on small mobile) */}
      <div className="hidden sm:flex space-x-1">
        {start > 1 && (
           <>
            <button 
                onClick={() => onPageChange(1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold bg-[#1B1E23] text-[#B3B3B3] border border-[#2A2D33] hover:text-white"
            >
                1
            </button>
            {start > 2 && <span className="w-9 h-9 flex items-center justify-center text-[#808080]">...</span>}
           </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`
              w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold border transition-all
              ${currentPage === page
                ? 'bg-[#FFD447] text-black border-[#FFD447]'
                : 'bg-[#1B1E23] text-[#B3B3B3] border-[#2A2D33] hover:text-white hover:border-[#3A3D44]'
              }
            `}
          >
            {page}
          </button>
        ))}

        {end < totalPages && (
           <>
            {end < totalPages - 1 && <span className="w-9 h-9 flex items-center justify-center text-[#808080]">...</span>}
            <button 
                onClick={() => onPageChange(totalPages)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold bg-[#1B1E23] text-[#B3B3B3] border border-[#2A2D33] hover:text-white"
            >
                {totalPages}
            </button>
           </>
        )}
      </div>
      
      {/* Mobile Indicator */}
      <div className="sm:hidden text-sm text-[#B3B3B3] font-mono px-2">
          {currentPage} / {totalPages}
      </div>

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`
          px-3 py-2 rounded-lg text-sm font-bold border transition-all
          ${currentPage === totalPages
            ? 'bg-[#1B1E23] border-[#2A2D33] text-[#808080] cursor-not-allowed' 
            : 'bg-[#23262B] border-[#3A3D44] text-white hover:bg-[#2A2D33] hover:border-[#FFD447]'
          }
        `}
      >
        Próximo
      </button>
    </div>
  );
};

export default Pagination;
