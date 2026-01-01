
import React, { createContext, useContext, useState, useCallback } from 'react';

interface ModalContextType {
  showModal: (content: React.ReactNode, id?: string) => void;
  hideModal: (id?: string) => void;
  clearModals: () => void;
}

interface ActiveModal {
  id: string;
  content: React.ReactNode;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<ActiveModal[]>([]);

  const showModal = useCallback((content: React.ReactNode, id = 'default-modal') => {
    setModals((prev) => [...prev.filter(m => m.id !== id), { id, content }]);
  }, []);

  const hideModal = useCallback((id = 'default-modal') => {
    setModals((prev) => prev.filter((modal) => modal.id !== id));
  }, []);

  const clearModals = useCallback(() => {
    setModals([]);
  }, []);

  return (
    <ModalContext.Provider value={{ showModal, hideModal, clearModals }}>
      {children}
      {modals.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          {modals.map((modal) => (
             <div key={modal.id} className="pointer-events-auto w-full h-full flex items-center justify-center">
                {modal.content}
             </div>
          ))}
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useGlobalModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useGlobalModal must be used within a ModalProvider');
  }
  return context;
};
