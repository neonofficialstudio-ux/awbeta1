
import { saveToStorage, loadFromStorage, removeFromStorage } from '../persist/localStorage';
import type { RankingSession } from '../../types/ranking';

const RANKING_SESSION_KEY = 'aw_ranking_session_v5';

export const RankingSessionEngine = {
    loadRankingSession: (): RankingSession | null => {
        return loadFromStorage<RankingSession | null>(RANKING_SESSION_KEY, null);
    },

    saveRankingSession: (data: Partial<RankingSession>) => {
        const current = RankingSessionEngine.loadRankingSession() || {
            season: new Date().toISOString().slice(0, 7), // YYYY-MM
            lastUpdated: Date.now(),
            userPosition: 0,
            deltas: {}
        };
        
        const updated: RankingSession = {
            ...current,
            ...data,
            lastUpdated: Date.now()
        };

        saveToStorage(RANKING_SESSION_KEY, updated);
        return updated;
    },

    clearRankingSession: () => {
        removeFromStorage(RANKING_SESSION_KEY);
    },

    updateUserPosition: (position: number) => {
        RankingSessionEngine.saveRankingSession({ userPosition: position });
    }
};
