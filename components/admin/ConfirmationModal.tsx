import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmButtonText?: string;
  confirmButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmButtonText, confirmButtonClass }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121212] w-full rounded-t-2xl sm:rounded-xl border-t sm:border border-gray-800 p-6 md:p-8 sm:max-w-md animate-fade-in-up"
        style={{ animationDuration: '0.3s' }}
      >
        <h2 className="text-2xl font-bold text-red-500 mb-4">{title}</h2>
        <div className="text-gray-300 mb-6">{message}</div>
        <div className="flex flex-col sm:flex-row-reverse gap-3">
          <button
            onClick={onConfirm}
            className={`py-3 px-6 rounded-lg text-white font-bold transition-colors w-full sm:w-auto ${confirmButtonClass || 'bg-red-600 hover:bg-red-500'}`}
          >
            {confirmButtonText || 'Confirmar'}
          </button>
          <button
            onClick={onClose}
            className="py-3 px-6 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors font-semibold w-full sm:w-auto"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
