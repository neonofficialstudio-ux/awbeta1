
import { getRepository } from "../../api/database/repository.factory";
import type { User, Participation, EventRankingEntry } from "../../types";
import { EventSessionEngine } from "../../api/events/session";
import { CacheService } from "../../services/performance/cache.service";

const repo = getRepository();

export const EventRankingEngineV5 = {
    getEventRank: (eventId: string) => {
         const scoreLogs = repo.select("event_score_log").filter((l: any) => l.eventId === eventId);
         
         const scores: Record<string, number> = {};
         scoreLogs.forEach((l: any) => {
             scores[l.userId] = (scores[l.userId] || 0) + l.pointsGained;
         });
         
         return Object.entries(scores).map(([userId, score]) => ({ userId, score })).sort((a,b) => b.score - a.score);
    },

    /**
     * Generates the leaderboard for a specific event.
     * Supports Normal and VIP filtering.
     * Performance Pack V1.0: Cached for 5s to reduce load during live events.
     */
    getEventRanking: (eventId: string, currentUserId?: string): EventRankingEntry[] => {
        const cacheKey = `event_ranking_${eventId}_${currentUserId || 'anon'}`;
        
        return CacheService.remember(cacheKey, 5000, () => {
            const scoreLogs = repo.select("event_score_log").filter((l: any) => l.eventId === eventId);
            const participants = repo.select("participations").filter((p: any) => p.eventId === eventId);
            const allUsers = repo.select("users");

            // 1. Aggregate Scores
            const scores: Record<string, number> = {};
            scoreLogs.forEach((log: any) => {
                scores[log.userId] = (scores[log.userId] || 0) + log.pointsGained;
            });

            // 2. Map to Leaderboard Structure
            const leaderboard = participants.map((p: Participation) => {
                const user = allUsers.find((u: any) => u.id === p.userId);
                if (!user) return null;
                
                const score = scores[user.id] || 0;
                const passType = p.isGolden ? 'vip' : 'normal';

                // For event stats
                const userEventMissions = repo.select("eventMissionSubmissions")
                    .filter((s: any) => s.eventId === eventId && s.userId === user.id && s.status === 'approved');

                return {
                    userId: user.id,
                    userName: user.artisticName || user.name,
                    userAvatar: user.avatarUrl,
                    score,
                    passType,
                    xp: user.xp, // Global XP as ref
                    missionsCompleted: userEventMissions.length,
                    rank: 0, // Calculated below
                    isCurrentUser: user.id === currentUserId
                } as EventRankingEntry;
            }).filter((item): item is EventRankingEntry => item !== null);

            // 3. Sort by Score (Desc)
            leaderboard.sort((a, b) => b.score - a.score);

            // 4. Assign Ranks
            leaderboard.forEach((entry, index) => {
                entry.rank = index + 1;
            });

            return leaderboard;
        });
    },

    getEventRankingNormal: (eventId: string) => {
        const all = EventRankingEngineV5.getEventRanking(eventId);
        return all.filter(r => r.passType === 'normal');
    },

    getEventRankingVIP: (eventId: string) => {
        const all = EventRankingEngineV5.getEventRanking(eventId);
        return all.filter(r => r.passType === 'vip');
    },

    updateEventScore: (eventId: string, userId: string, points: number) => {
         repo.insert("event_score_log", {
            id: `esl-${Date.now()}`,
            userId,
            eventId,
            eventMissionId: 'manual_or_system',
            pointsGained: points,
            timestamp: new Date().toISOString()
         });
         // Invalidate cache on update
         CacheService.invalidate(`event_ranking_${eventId}`);
    }
};
