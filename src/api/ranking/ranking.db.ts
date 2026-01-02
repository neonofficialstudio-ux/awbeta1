
import { saveToStorage, loadFromStorage } from '../persist/localStorage';

export interface RankingCache {
    lastUpdated: number;
    global: string[]; // List of User IDs in order
    economy: string[];
    missions: string[];
    events: Record<string, string[]>; // EventId -> List of User IDs
}

const RANKING_DB_KEY = 'aw_ranking_db_v5';

export const RankingDB = {
    load: (): RankingCache => {
        const defaultState: RankingCache = {
            lastUpdated: Date.now(),
            global: [],
            economy: [],
            missions: [],
            events: {}
        };
        return loadFromStorage<RankingCache>(RANKING_DB_KEY, defaultState);
    },

    save: (data: RankingCache) => {
        saveToStorage(RANKING_DB_KEY, data);
    },

    updateCache: (type: 'global' | 'economy' | 'missions', orderedIds: string[]) => {
        const current = RankingDB.load();
        current[type] = orderedIds;
        current.lastUpdated = Date.now();
        RankingDB.save(current);
    },

    updateEventCache: (eventId: string, orderedIds: string[]) => {
        const current = RankingDB.load();
        current.events[eventId] = orderedIds;
        current.lastUpdated = Date.now();
        RankingDB.save(current);
    }
};
