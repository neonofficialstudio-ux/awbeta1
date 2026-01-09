
import React from 'react';
import Button from '../base/Button';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon?: React.ReactNode;
  category?: string;
}

interface NotificationPanelProps {
  notifications: NotificationItem[];
  onMarkAllRead?: () => void;
  onClear?: () => void;
  onItemClick?: (id: string) => void;
  className?: string;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onMarkAllRead,
  onClear,
  onItemClick,
  className = '',
}) => {
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  return (
    <div className={`bg-[#1B1E23] border border-[#2A2D33] rounded-xl shadow-xl flex flex-col w-full max-w-sm ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2A2D33] flex justify-between items-center">
        <h3 className="font-bold text-white">Notificações</h3>
        <div className="flex gap-2">
          {onMarkAllRead && (
            <button onClick={onMarkAllRead} className="text-[10px] uppercase font-bold text-[#FFD447] hover:underline">
              Ler Todas
            </button>
          )}
          {onClear && (
            <button onClick={onClear} className="text-[10px] uppercase font-bold text-[#808080] hover:text-white hover:underline">
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar max-h-96">
        {safeNotifications.length > 0 ? (
          safeNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => onItemClick && onItemClick(item.id)}
              className={`
                p-4 border-b border-[#2A2D33] last:border-0 cursor-pointer transition-colors
                ${item.read ? 'bg-transparent hover:bg-[#23262B]' : 'bg-[#FFD447]/5 hover:bg-[#FFD447]/10'}
              `}
            >
              <div className="flex gap-3">
                {item.icon && (
                  <div className="flex-shrink-0 mt-1 text-[#B3B3B3]">
                    {item.icon}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm font-bold ${item.read ? 'text-[#B3B3B3]' : 'text-white'}`}>
                      {item.title}
                    </h4>
                    {!item.read && <span className="w-2 h-2 rounded-full bg-[#FFD447] mt-1.5"></span>}
                  </div>
                  <p className="text-xs text-[#808080] leading-relaxed mb-2">
                    {item.message}
                  </p>
                  <div className="flex justify-between items-center">
                     {item.category && (
                       <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-[#2A2D33] text-[#B3B3B3] rounded">
                         {item.category}
                       </span>
                     )}
                     <span className="text-[10px] text-[#808080]">
                        {item.timestamp}
                     </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-[#808080]">
            <p className="text-sm">Nenhuma notificação recente.</p>
          </div>
        )}
      </div>

      {/* Footer (Optional View All) */}
      <div className="p-3 border-t border-[#2A2D33] bg-[#23262B] rounded-b-xl">
        <Button variant="ghost" size="sm" fullWidth>
          Ver Histórico Completo
        </Button>
      </div>
    </div>
  );
};

export default NotificationPanel;
