
import { RankingEngine } from "../../services/ranking/ranking.engine";
import { SeasonEngine } from "./seasonEngine";

export const rankingAPI = {
    // Core Rankings
    getGlobalRanking: RankingEngine.getGlobalRanking,
    getEconomyRanking: RankingEngine.getEconomyRanking,
    getMissionRanking: RankingEngine.getMissionRanking,
    
    // Event Rankings
    getEventRanking: RankingEngine.getEventRanking,
    getEventRankingVIP: (eventId: string, currentUserId?: string) => RankingEngine.getEventRanking(eventId, currentUserId, 'vip'),
    getEventRankingNormal: (eventId: string, currentUserId?: string) => RankingEngine.getEventRanking(eventId, currentUserId, 'normal'),

    // Helpers
    getUserPosition: (userId: string, type: 'global' | 'economy' = 'global') => {
        const list = type === 'economy' ? RankingEngine.getEconomyRanking(userId) : RankingEngine.getGlobalRanking(userId);
        const user = list.find(r => r.isCurrentUser);
        return user ? user.rank : 0;
    },

    // Legacy / Compatibility Mappers
    getRanking: (currentUserId?: string, type: 'mensal' | 'geral' = 'mensal') => {
        // 'Mensal' maps to Mission Activity in V5 context as season usually relates to activity
        // 'Geral' maps to Global XP
        if (type === 'mensal') return RankingEngine.getMissionRanking(currentUserId);
        return RankingEngine.getGlobalRanking(currentUserId);
    },

    getSeasonInfo: SeasonEngine.checkSeasonStatus,
    refresh: () => SeasonEngine.checkSeasonStatus(),
};
