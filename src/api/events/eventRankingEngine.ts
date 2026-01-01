
// api/events/eventRankingEngine.ts
import { getRepository } from "../database/repository.factory";
import type { User, RankingUser, Participation } from "../../types";
import { normalizeUserRankData } from "../ranking/normalizeUserRankData";

const repo = getRepository();

export const EventRankingEngine = {
    /**
     * Generates the leaderboard specific to an event.
     * Merges user data with event score logs.
     */
    getRanking: (eventId: string, currentUserId?: string): any[] => {
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

            return {
                user,
                score: scoresByUser[user.id] || 0,
                isGolden: !!p.isGolden,
                rank: 0, // Calculated below
                isCurrentUser: user.id === currentUserId
            };
        }).filter(Boolean);

        // 3. Sort by Score (Desc)
        leaderboard.sort((a: any, b: any) => b.score - a.score);

        // 4. Assign Ranks
        leaderboard.forEach((entry: any, index: number) => {
            entry.rank = index + 1;
        });

        return leaderboard;
    },

    /**
     * Adds points to a user's event score.
     * Validates rules before adding.
     */
    addPoints: (userId: string, eventId: string, missionId: string, points: number) => {
        if (points <= 0) return;

        repo.insert("event_score_log", {
            id: `esl-${Date.now()}-${Math.random()}`,
            userId,
            eventId,
            eventMissionId: missionId,
            pointsGained: points,
            timestamp: new Date().toISOString()
        });
    }
};
