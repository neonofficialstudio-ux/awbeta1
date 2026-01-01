
import React, { useEffect } from 'react';
import { ModalPortal } from '../overlays/ModalPortal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <ModalPortal>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop with Blur */}
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ease-out animate-[fade-in-up_0.2s]" 
            onClick={onClose}
            aria-hidden="true"
        />

        {/* Content with Cinematic Entrance */}
        <div 
            className={`
            relative w-full ${widthClasses[maxWidth]} mx-auto
            bg-[#121212] border border-[#2A2D33] rounded-2xl shadow-2xl 
            flex flex-col max-h-[90vh] transform transition-all animate-modal-in
            md:w-auto md:min-w-[480px]
            `}
            role="dialog"
            aria-modal="true"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#2A2D33] bg-[#1B1E23] rounded-t-2xl">
            {title ? (
                <h3 className="text-xl font-bold text-white font-chakra tracking-wide text-shadow-glow">{title}</h3>
            ) : (
                <div />
            )}
            <button
                onClick={onClose}
                className="text-[#808080] hover:text-white transition-all p-2 rounded-full hover:bg-white/10 hover:rotate-90 duration-200"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
            {children}
            </div>

            {/* Footer */}
            {footer && (
            <div className="px-8 py-6 border-t border-[#2A2D33] bg-[#1B1E23] rounded-b-2xl flex justify-end gap-4">
                {footer}
            </div>
            )}
        </div>
        </div>
    </ModalPortal>
  );
};

export default Modal;
