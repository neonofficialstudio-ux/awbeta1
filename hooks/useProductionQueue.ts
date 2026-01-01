
import { useState, useEffect } from 'react';
import { QueueEngineV5 } from '../api/queue/queueEngineV5';
import type { UsableItemQueueEntry } from '../types';
import { useAppContext } from '../constants';

export const useProductionQueue = () => {
    const { state } = useAppContext();
    const { activeUser } = state;
    const [queue, setQueue] = useState<UsableItemQueueEntry[]>([]);

    useEffect(() => {
        if (!activeUser) return;

        const sync = () => {
            const userQueue = QueueEngineV5.getQueueForUser(activeUser.id);
            setQueue(userQueue);
        };

        sync(); // Initial sync

        // Event listener instead of polling
        const listener = () => sync();
        QueueEngineV5.addEventListener('update', listener);

        return () => {
            QueueEngineV5.removeEventListener('update', listener);
        };
    }, [activeUser]);

    return queue;
};
