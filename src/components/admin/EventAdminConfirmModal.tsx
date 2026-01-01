
import React from 'react';
import { ModalPortal } from '../ui/overlays/ModalPortal';
import { ShieldIcon } from '../../constants';

interface EventAdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  isProcessing?: boolean;
}

const EventAdminConfirmModal: React.FC<EventAdminConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
        <div 
            className="bg-[#121212] w-full max-w-md rounded-2xl border border-red-500/30 shadow-[0_0_50px_rgba(220,38,38,0.2)] p-8 flex flex-col items-center text-center animate-pop-in"
            onClick={e => e.stopPropagation()}
        >
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-6 border border-red-500/40">
            <ShieldIcon className="w-8 h-8 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-black text-white font-chakra uppercase tracking-wide mb-3">
            {title}
          </h2>
          
          <div className="text-gray-400 text-sm leading-relaxed mb-8">
            {description}
          </div>

          <div className="flex w-full gap-4">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-4 rounded-xl font-bold text-gray-400 hover:text-white bg-[#1A1A1A] hover:bg-[#222] border border-[#333] transition-all uppercase text-xs tracking-widest"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 py-4 rounded-xl font-black text-white bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                  "Confirmar"
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default EventAdminConfirmModal;
