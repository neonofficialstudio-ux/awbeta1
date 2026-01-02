
import { getRepository } from '../../api/database/repository.factory';
import { GlobalRankingEngine } from '../ranking/globalRanking.engine';
import { EventRankingEngineV5 } from '../ranking/eventRanking.engine';

const repo = getRepository();

export const MissionRankingEngine = {
    /**
     * Increments user's mission score and updates relevant rankings.
     */
    incrementUserMissionScore: (userId: string, xpGained: number, eventId?: string) => {
        const user = repo.select("users").find((u:any) => u.id === userId);
        if (!user) return;

        // 1. Update Global Ranking (XP Based)
        GlobalRankingEngine.updateGlobalScore(userId, user.xp + xpGained, user.totalMissionsCompleted + 1);

        // 2. Update Event Ranking if applicable
        if (eventId) {
            // Assuming Points = XP for simplicity in V4.2, or derived
            const points = xpGained; 
            // Corrected method name and argument order (eventId first)
            EventRankingEngineV5.updateEventScore(eventId, userId, points);
        }
    }
};
