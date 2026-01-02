
import React from 'react';
import ReactDOM from 'react-dom';

export const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === 'undefined') return null;
  
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
      {/* Enable pointer events for the modal content itself */}
      <div className="pointer-events-auto w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>,
    document.body
  );
};
