
import { getRepository } from "../../api/database/repository.factory";
import { normalizeUserRankData } from "../../api/ranking/normalizeUserRankData";
import type { User, RankingUser } from "../../types";
import { RankingSessionEngine } from "../../api/ranking/session";
import { SanityGuard } from "../../services/sanity.guard";

const repo = getRepository();

export const GlobalRankingEngine = {
    /**
     * Calculates the global ranking based on total XP.
     * Secondary sort criteria: Total Missions Completed.
     */
    getGlobalRanking: (currentUserId?: string): RankingUser[] => {
        const allUsers = repo.select("users") as User[];
        const activeUsers = allUsers.filter(u => u.role === 'user' && !u.isBanned);

        const sortedUsers = activeUsers.sort((a, b) => {
            // 1. Total XP
            if (b.xp !== a.xp) return b.xp - a.xp;
            // 2. Total Missions (Tie-breaker)
            return b.totalMissionsCompleted - a.totalMissionsCompleted;
        });

        const rankingList = sortedUsers.map((user, index) => {
            // Guard User before creating rank item
            const safeUser = SanityGuard.user(user);
            
            const rank = index + 1;
            const isCurrentUser = safeUser.id === currentUserId;
            
            if (isCurrentUser) {
                RankingSessionEngine.updateUserPosition(rank);
            }
            
            // SanityGuard.ranking applies final normalization for UI
            const rawRankData = normalizeUserRankData(safeUser, rank, isCurrentUser);
            return SanityGuard.ranking(rawRankData);
        });

        return rankingList;
    },

    /**
     * Updates score for a specific user (triggered by Economy Engine).
     */
    updateGlobalScore: (userId: string, xp: number, missionsCompleted: number) => {
        RankingSessionEngine.saveRankingSession({ lastUpdated: Date.now() });
    },

    calculateUserPosition: (userId: string): number => {
        const ranking = GlobalRankingEngine.getGlobalRanking(userId);
        const entry = ranking.find(r => r.isCurrentUser);
        return entry ? entry.rank : 0;
    }
};
