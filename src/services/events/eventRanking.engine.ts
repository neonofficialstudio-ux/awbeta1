
import { getRepository } from "../../api/database/repository.factory";
import type { EventRankingEntry } from "../../types";

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
        void eventId;
        void currentUserId;
        return [];
    },

    getEventRankingNormal: (eventId: string) => {
        void eventId;
        return [];
    },

    getEventRankingVIP: (eventId: string) => {
        void eventId;
        return [];
    },

    updateEventScore: (eventId: string, userId: string, points: number) => {
        void eventId;
        void userId;
        void points;
        // Eventos desativados: não registra score.
    }
};
