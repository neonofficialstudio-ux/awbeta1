
import { RankingSessionEngine } from "../../api/ranking/session";

export const RankingDeltaEngine = {
    /**
     * Computes the change in rank.
     * Positive change means rank improved (e.g. 10 -> 5 = +5).
     */
    computeDelta: (previousRank: number, currentRank: number): number => {
        if (previousRank === 0) return 0; // New entry
        return previousRank - currentRank; 
    },

    /**
     * Saves the delta for a specific user in the session.
     */
    saveDelta: (userId: string, change: number) => {
        const session = RankingSessionEngine.loadRankingSession();
        if (session) {
            const newDeltas = { ...session.deltas, [userId]: change };
            RankingSessionEngine.saveRankingSession({ deltas: newDeltas });
        }
    },

    getUserDelta: (userId: string): number => {
        const session = RankingSessionEngine.loadRankingSession();
        return session?.deltas[userId] || 0;
    },

    /**
     * Runs a full delta calculation for all users (e.g. after a batch update).
     * Assumes 'previous' snapshot is stored or passed. For V5, we use simple memory.
     */
    processRankUpdates: (previousRanks: Record<string, number>, currentRanks: Record<string, number>) => {
        for (const userId in currentRanks) {
            const prev = previousRanks[userId] || 0;
            const curr = currentRanks[userId];
            const delta = RankingDeltaEngine.computeDelta(prev, curr);
            if (delta !== 0) {
                RankingDeltaEngine.saveDelta(userId, delta);
            }
        }
    }
};
