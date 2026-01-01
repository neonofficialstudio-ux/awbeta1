import type { UsableItemQueueEntry } from '../../types';

export const normalizeQueueItem = (queueItem: UsableItemQueueEntry): UsableItemQueueEntry => {
    const normalized = { ...queueItem };
    
    if (!normalized.queuedAt || isNaN(new Date(normalized.queuedAt).getTime())) {
        normalized.queuedAt = new Date().toISOString();
    }

    // Assuming no status field to normalize based on current type, but this is where it would go.

    return normalized;
};
