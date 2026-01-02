
import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
}

function Table<T>({ 
  data, 
  columns, 
  keyExtractor, 
  isLoading = false, 
  emptyMessage = 'Nenhum dado encontrado.' 
}: TableProps<T>) {
  
  if (isLoading) {
    return (
      <div className="w-full space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-[#1B1E23] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-[#808080] bg-[#1B1E23]/50 rounded-lg border border-dashed border-[#2A2D33]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#2A2D33] shadow-sm animate-fade-in-up">
      <table className="w-full text-sm text-left text-[#B3B3B3]">
        <thead className="text-xs text-[#808080] uppercase bg-[#1B1E23] border-b border-[#2A2D33]">
          <tr>
            {columns.map((col, index) => (
              <th key={index} scope="col" className={`px-6 py-4 font-bold tracking-wider border-b-2 border-transparent hover:border-[#3A3D44] transition-colors ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A2D33]">
          {data.map((item, rowIndex) => (
            <tr 
              key={keyExtractor(item)} 
              className="bg-[#0D0F12] hover:bg-[#1B1E23] transition-colors duration-150 group"
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={`px-6 py-4 whitespace-nowrap group-hover:text-white transition-colors ${col.className || ''}`}>
                  {typeof col.accessor === 'function' 
                    ? col.accessor(item) 
                    : (item[col.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
