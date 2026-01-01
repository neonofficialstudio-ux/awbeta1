
import React, { useState, useMemo } from 'react';
import type { Notification, AdminTab, StoreTab, InventoryTab } from '../types';
import { BellIcon } from '../constants';
import { useAppContext } from '../constants';

const Notifications: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { notifications } = state;
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggle = () => setIsOpen(!isOpen);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.linkTo) {
      const { view, tab, subTab } = notification.linkTo;
      if (tab) {
        if (view === 'admin') {
          dispatch({ type: 'SET_ADMIN_TAB', payload: { tab: tab as AdminTab, subTab } });
        } else if (view === 'store') {
          dispatch({ type: 'SET_STORE_TAB', payload: tab as StoreTab });
        } else if (view === 'inventory') {
          dispatch({ type: 'SET_INVENTORY_TAB', payload: tab as InventoryTab });
        }
      } else {
        dispatch({ type: 'SET_VIEW', payload: view });
      }
    }
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: { id: notification.id } });
    setIsOpen(false);
  };
  
  const handleMarkAllAsRead = () => {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
  };

  // Phase 11: Anti-Duplicate Rendering Logic
  // Filters consecutive identical messages to clean up UI clutter
  const uniqueNotifications = useMemo(() => {
      const seen = new Set<string>();
      return notifications.filter(n => {
          // Generate a content hash based on title + desc + day
          const key = `${n.title}-${n.description}-${new Date(parseInt(n.id.split('-')[2] || '0')).getDate()}`;
          // Allow multiple if they are different types, but dedup exact content spam
          // Exception for 'system_info' which might be generic
          if (seen.has(key) && n.type !== 'coins_added') return false;
          seen.add(key);
          return true;
      });
  }, [notifications]);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={handleToggle} className="relative p-3 bg-goldenYellow-500 rounded-full shadow-lg hover:bg-goldenYellow-400 transition-colors">
          <BellIcon className="w-6 h-6 text-black" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>


      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={handleToggle}></div>
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-[#121212] border-l border-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 flex justify-between items-center border-b border-gray-800">
          <h2 className="text-xl font-bold">Notificações</h2>
          <button onClick={handleToggle} className="text-gray-400 hover:text-white w-10 h-10 flex items-center justify-center text-3xl rounded-full hover:bg-gray-800 transition-colors">
            &times;
          </button>
        </div>

        <div className="p-4">
            <button 
                onClick={handleMarkAllAsRead} 
                disabled={unreadCount === 0}
                className="text-sm text-goldenYellow-400 hover:underline disabled:text-gray-500 disabled:cursor-not-allowed">
                Marcar todas como lidas
            </button>
        </div>

        <ul className="overflow-y-auto h-[calc(100vh-120px)]">
          {uniqueNotifications.map(notification => (
            <li
              key={notification.id}
              className={`border-b border-gray-800 ${
                !notification.read ? 'bg-goldenYellow-500/10' : ''
              }`}
            >
              <button
                onClick={() => handleNotificationClick(notification)}
                className="w-full text-left p-4 hover:bg-gray-800/50 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                disabled={!notification.linkTo}
              >
                <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{notification.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{notification.description}</p>
                      <p className="text-xs text-gray-500 mt-2">{notification.timestamp}</p>
                    </div>
                    {!notification.read && (
                      <div
                        title="Marcar como lida"
                        className="mt-1 w-3 h-3 bg-goldenYellow-400 rounded-full flex-shrink-0 ml-4"
                      ></div>
                    )}
                </div>
              </button>
            </li>
          ))}
           {uniqueNotifications.length === 0 && (
              <li className="text-center text-gray-500 p-8">
                Nenhuma notificação por aqui.
              </li>
            )}
        </ul>
      </div>
    </>
  );
};

export default Notifications;
