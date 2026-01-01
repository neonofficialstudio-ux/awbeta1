
import { getRepository } from "../../api/database/repository.factory";
import { RankingDB } from "../../api/ranking/ranking.db";
import { normalizeUserRankData } from "../../api/ranking/normalizeUserRankData";
import type { User, RankingUser, Participation } from "../../types";

const repo = getRepository();

export const RankingEngine = {
    // --- GLOBAL RANKING (XP Based) ---
    getGlobalRanking: (currentUserId?: string): RankingUser[] => {
        const users = repo.select("users").filter((u: any) => u.role === 'user' && !u.isBanned) as User[];
        
        // Sort: XP (Desc) -> Missions (Desc) -> JoinDate (Asc) [Seniority wins ties]
        users.sort((a, b) => {
            if (b.xp !== a.xp) return b.xp - a.xp;
            if (b.totalMissionsCompleted !== a.totalMissionsCompleted) return b.totalMissionsCompleted - a.totalMissionsCompleted;
            return new Date(a.joinedISO || 0).getTime() - new Date(b.joinedISO || 0).getTime();
        });

        // Update Cache
        RankingDB.updateCache('global', users.map(u => u.id));

        return users.map((u, i) => normalizeUserRankData(u, i + 1, u.id === currentUserId));
    },

    // --- ECONOMY RANKING (Wealth Based) ---
    getEconomyRanking: (currentUserId?: string): RankingUser[] => {
        const users = repo.select("users").filter((u: any) => u.role === 'user' && !u.isBanned) as User[];
        
        // Sort: Coins (Desc) -> XP (Desc) -> JoinDate (Asc)
        users.sort((a, b) => {
            if (b.coins !== a.coins) return b.coins - a.coins;
            if (b.xp !== a.xp) return b.xp - a.xp;
            return new Date(a.joinedISO || 0).getTime() - new Date(b.joinedISO || 0).getTime();
        });

        RankingDB.updateCache('economy', users.map(u => u.id));

        return users.map((u, i) => normalizeUserRankData(u, i + 1, u.id === currentUserId));
    },

    // --- MISSION RANKING (Activity Based) ---
    getMissionRanking: (currentUserId?: string): RankingUser[] => {
        const users = repo.select("users").filter((u: any) => u.role === 'user' && !u.isBanned) as User[];
        
        // Sort: Total Missions (Desc) -> Monthly Missions (Desc) -> XP (Desc)
        users.sort((a, b) => {
            if (b.totalMissionsCompleted !== a.totalMissionsCompleted) return b.totalMissionsCompleted - a.totalMissionsCompleted;
            if (b.monthlyMissionsCompleted !== a.monthlyMissionsCompleted) return b.monthlyMissionsCompleted - a.monthlyMissionsCompleted;
            return b.xp - a.xp;
        });

        RankingDB.updateCache('missions', users.map(u => u.id));

        return users.map((u, i) => normalizeUserRankData(u, i + 1, u.id === currentUserId));
    },

    // --- EVENT RANKING (Points Based) ---
    getEventRanking: (eventId: string, currentUserId?: string, filterType: 'all' | 'vip' | 'normal' = 'all'): any[] => {
        const scoreLogs = repo.select("event_score_log").filter((l: any) => l.eventId === eventId);
        const participations = repo.select("participations").filter((p: any) => p.eventId === eventId);
        const users = repo.select("users") as User[];

        // Aggregate Scores
        const scores: Record<string, number> = {};
        scoreLogs.forEach((log: any) => {
            scores[log.userId] = (scores[log.userId] || 0) + log.pointsGained;
        });

        // Build Ranking List
        let rankedParticipants = participations.map((p: Participation) => {
            const user = users.find((u: any) => u.id === p.userId);
            if (!user || user.isBanned) return null;
            
            const score = scores[user.id] || 0;
            
            return {
                user,
                score,
                isGolden: !!p.isGolden,
                passType: p.isGolden ? 'vip' : 'normal',
            };
        }).filter(Boolean);

        // Filter
        if (filterType === 'vip') {
            rankedParticipants = rankedParticipants.filter((p: any) => p.isGolden);
        } else if (filterType === 'normal') {
            rankedParticipants = rankedParticipants.filter((p: any) => !p.isGolden);
        }

        // Sort: Score (Desc) -> XP (Desc) -> JoinDate (Asc)
        rankedParticipants.sort((a: any, b: any) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.user.xp !== a.user.xp) return b.user.xp - a.user.xp;
             return new Date(a.user.joinedISO || 0).getTime() - new Date(b.user.joinedISO || 0).getTime();
        });

        // Save IDs to Cache for this event
        if (filterType === 'all') {
            RankingDB.updateEventCache(eventId, rankedParticipants.map((p: any) => p.user.id));
        }

        // Format Output
        return rankedParticipants.map((entry: any, index: number) => ({
            userId: entry.user.id,
            userName: entry.user.artisticName || entry.user.name,
            userAvatar: entry.user.avatarUrl,
            score: entry.score,
            passType: entry.passType,
            xp: entry.user.xp,
            rank: index + 1,
            isCurrentUser: entry.user.id === currentUserId
        }));
    },

    // --- TRIGGERS ---
    updateGlobalScore: (userId: string, xp: number, missionsCompleted: number) => {
        // In V6, sorting is computed on read, but we can invalidate cache here if needed
    },

    updateEconomyScore: (userId: string) => {
         // Placeholder
    },

    recalculateAll: () => {
        RankingEngine.getGlobalRanking();
        RankingEngine.getEconomyRanking();
        RankingEngine.getMissionRanking();
        return true;
    }
};
