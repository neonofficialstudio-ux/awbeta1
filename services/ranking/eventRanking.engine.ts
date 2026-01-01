
import { getRepository } from "../../api/database/repository.factory";
import type { User, Participation, EventRankingEntry } from "../../types";
import { EventSessionEngine } from "../../api/events/session";

const repo = getRepository();

export const EventRankingEngineV5 = {
    /**
     * Generates the leaderboard for a specific event.
     * Supports Normal and VIP filtering.
     */
    getEventRanking: (eventId: string, currentUserId?: string): EventRankingEntry[] => {
        const scoreLogs = repo.select("event_score_log").filter((l: any) => l.eventId === eventId);
        const participants = repo.select("participations").filter((p: any) => p.eventId === eventId);
        const allUsers = repo.select("users");

        // 1. Aggregate Scores
        const scoresByUser: Record<string, number> = {};
        scoreLogs.forEach((log: any) => {
            scoresByUser[log.userId] = (scoresByUser[log.userId] || 0) + log.pointsGained;
        });

        // 2. Map to Leaderboard Structure
        const leaderboard = participants.map((p: Participation) => {
            const user = allUsers.find((u: any) => u.id === p.userId);
            if (!user) return null;
            
            const score = scoresByUser[user.id] || 0;
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
        }).filter(Boolean);

        // 3. Sort by Score (Desc)
        leaderboard.sort((a: any, b: any) => b.score - a.score);

        // 4. Assign Ranks
        leaderboard.forEach((entry: any, index: number) => {
            entry.rank = index + 1;
        });

        return leaderboard;
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
        // This is handled by eventTelemetry / scoreLog in EventEngineV7
        // This is a helper for manual or forced updates if needed
    }
};
