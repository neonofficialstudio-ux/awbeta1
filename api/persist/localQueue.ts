
// api/persist/localQueue.ts
import { saveToStorage, loadFromStorage } from './localStorage';
import type { UsableItemQueueEntry, ArtistOfTheDayQueueEntry } from '../../types';

const QUEUE_ITEMS_KEY = 'aw_queue_items_v5';
const QUEUE_SPOTLIGHT_KEY = 'aw_queue_spotlight_v5';

export const persistQueue = (
    items: UsableItemQueueEntry[], 
    spotlight: ArtistOfTheDayQueueEntry[]
) => {
    saveToStorage(QUEUE_ITEMS_KEY, items);
    saveToStorage(QUEUE_SPOTLIGHT_KEY, spotlight);
};

export const hydrateQueue = () => {
    return {
        items: loadFromStorage<UsableItemQueueEntry[]>(QUEUE_ITEMS_KEY, []),
        spotlight: loadFromStorage<ArtistOfTheDayQueueEntry[]>(QUEUE_SPOTLIGHT_KEY, [])
    };
};
