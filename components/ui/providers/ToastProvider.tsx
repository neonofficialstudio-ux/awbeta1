
import React, { createContext, useState, useCallback, useRef } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'levelup' | 'coin';

interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

export interface ToastContextType {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ToastItemRenderer: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const bgColors: Record<string, string> = {
      info: 'bg-[#1B1E23] border-[#2980B9] text-[#5DADE2]',
      success: 'bg-[#1B1E23] border-[#27AE60] text-[#2ECC71]',
      warning: 'bg-[#1B1E23] border-[#F39C12] text-[#F1C40F]',
      error: 'bg-[#1B1E23] border-[#C0392B] text-[#E74C3C]',
      levelup: 'bg-gradient-to-r from-purple-900/90 to-[#1B1E23] border-purple-500 text-white',
      coin: 'bg-gradient-to-r from-yellow-900/90 to-[#1B1E23] border-yellow-500 text-yellow-400'
  };

  React.useEffect(() => {
      const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000);
      return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
      <div 
        className={`
            mb-3 w-80 p-4 rounded-lg border-l-4 shadow-2xl flex items-start animate-fade-in-up cursor-pointer pointer-events-auto
            ${bgColors[toast.type] || bgColors.info}
        `}
        onClick={() => onRemove(toast.id)}
      >
          <div>
              <h4 className="font-bold text-sm uppercase">{toast.title}</h4>
              {toast.message && <p className="text-xs opacity-90 mt-1">{toast.message}</p>}
          </div>
      </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastQueueRef = useRef<Omit<ToastMessage, 'id'>[]>([]);
  const processingRef = useRef(false);
  const lastToastTimeRef = useRef(0);

  const processQueue = useCallback(() => {
      if (toastQueueRef.current.length === 0) {
          processingRef.current = false;
          return;
      }

      // Flood Protection: If queue has many items, group them
      if (toastQueueRef.current.length > 3) {
          const count = toastQueueRef.current.length;
          const types = new Set(toastQueueRef.current.map(t => t.type));
          
          // Clear queue
          toastQueueRef.current = [];
          
          const summaryToast: ToastMessage = {
              id: `summary-${Date.now()}`,
              title: "Novas Notificações",
              message: `+${count} atualizações recebidas (Coins, XP, Missões)`,
              type: types.has('error') ? 'warning' : 'info',
              duration: 4000
          };
          
          setToasts(prev => [...prev.slice(-2), summaryToast]); // Keep last 2 + summary
          processingRef.current = false;
          return;
      }

      const nextToast = toastQueueRef.current.shift();
      if (nextToast) {
          const id = Math.random().toString(36).substr(2, 9);
          setToasts(prev => [...prev.slice(-4), { id, ...nextToast }]); // Limit max visible toasts
          
          lastToastTimeRef.current = Date.now();
          
          // Delay next processing slightly
          setTimeout(() => {
              processQueue();
          }, 300);
      }
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    toastQueueRef.current.push(toast);
    
    if (!processingRef.current) {
        processingRef.current = true;
        processQueue();
    }
  }, [processQueue]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-24 right-4 z-[9000] flex flex-col items-end pointer-events-none">
        {toasts.map((toast) => (
            <ToastItemRenderer key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
