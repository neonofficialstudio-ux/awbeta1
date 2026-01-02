
import { getRepository } from "../../api/database/repository.factory";
import { normalizeUserRankData } from "../../api/ranking/normalizeUserRankData";
import type { User, RankingUser } from "../../types";
import { RankingSessionEngine } from "../../api/ranking/session";
import { SeasonEngine } from "../../api/ranking/seasonEngine";

const repo = getRepository();

export const SeasonRankingEngine = {
    /**
     * Calculates the season (monthly) ranking.
     * Primary: Monthly Missions Completed.
     * Secondary: XP (Tie-breaker).
     */
    getSeasonRanking: (currentUserId?: string): RankingUser[] => {
        const allUsers = repo.select("users") as User[];
        const activeUsers = allUsers.filter(u => u.role === 'user' && !u.isBanned);

        const sortedUsers = activeUsers.sort((a, b) => {
            // 1. Monthly Missions
            if (b.monthlyMissionsCompleted !== a.monthlyMissionsCompleted) {
                return b.monthlyMissionsCompleted - a.monthlyMissionsCompleted;
            }
            // 2. Total XP (Tie-breaker)
            return b.xp - a.xp;
        });

        const rankingList = sortedUsers.map((user, index) => {
            const rank = index + 1;
            const isCurrentUser = user.id === currentUserId;
            
            if (isCurrentUser) {
                // We can store season rank specifically if needed
                // RankingSessionEngine.updateSeasonPosition(rank); 
            }

            return normalizeUserRankData(user, rank, isCurrentUser);
        });

        return rankingList;
    },

    updateSeasonScore: () => {
        // Triggered on mission completion
        RankingSessionEngine.saveRankingSession({ lastUpdated: Date.now() });
    },

    resetSeason: () => {
        return SeasonEngine.resetSeason();
    }
};
