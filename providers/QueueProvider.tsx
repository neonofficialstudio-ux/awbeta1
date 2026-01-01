
import React, { useEffect } from 'react';
import { QueueEngineV5, startQueueWorker, stopQueueWorker } from '../api/queue/index';

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    console.log("[QueueProvider] V4.2 Persistent Queue Active (Manual Mode)");
    
    // Initialize Worker - DISABLED to prevent auto-completion
    // The admin must manually process queue items now.
    // startQueueWorker();

    return () => {
        stopQueueWorker();
    };
  }, []);

  return <>{children}</>;
};
