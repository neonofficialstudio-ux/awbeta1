
import { RankingEngine } from "../../services/ranking/ranking.engine";
import { SeasonEngine } from "./seasonEngine";
import { config } from "../../core/config";
import { getSupabase } from "../supabase/client";
import { mapProfileToUser } from "../supabase/mappings";
import { normalizeUserRankData } from "./normalizeUserRankData";
import { SanityGuard } from "../../services/sanity.guard";

export const rankingAPI = {
    getGlobalRanking: (currentUserId?: string) => {
        if (config.useSupabase) {
            const sb = getSupabase();
            return sb!.from('profiles')
                .select('*')
                .order('xp', { ascending: false })
                .limit(50)
                .then(({ data }: any) => {
                    return (data || []).map((p: any, i: number) => {
                        const user = mapProfileToUser(p);
                        const safeUser = SanityGuard.user(user);
                        const rawRankData = normalizeUserRankData(safeUser, i + 1, safeUser.id === currentUserId);
                        return SanityGuard.ranking(rawRankData);
                    });
                });
        }
        return RankingEngine.getGlobalRanking(currentUserId);
    },
    
    getEconomyRanking: RankingEngine.getEconomyRanking,
    getMissionRanking: RankingEngine.getMissionRanking,
    
    getEventRanking: RankingEngine.getEventRanking,
    getEventRankingVIP: (eventId: string, currentUserId?: string) => RankingEngine.getEventRanking(eventId, currentUserId, 'vip'),
    getEventRankingNormal: (eventId: string, currentUserId?: string) => RankingEngine.getEventRanking(eventId, currentUserId, 'normal'),

    getUserPosition: (userId: string, type: 'global' | 'economy' = 'global') => {
        return 0; 
    },

    getRanking: async (currentUserId?: string, type: 'mensal' | 'geral' = 'mensal') => {
        if (config.useSupabase) {
             const sb = getSupabase();
             const sortCol = type === 'mensal' ? 'monthly_missions_completed' : 'xp';
             
             const { data } = await sb!.from('profiles')
                .select('*')
                .order(sortCol, { ascending: false })
                .limit(50);
             
             return (data || []).map((p: any, i: number) => {
                const user = mapProfileToUser(p);
                const safeUser = SanityGuard.user(user);
                const rawRankData = normalizeUserRankData(safeUser, i + 1, safeUser.id === currentUserId);
                return SanityGuard.ranking(rawRankData);
            });
        }

        if (type === 'mensal') return RankingEngine.getMissionRanking(currentUserId);
        return RankingEngine.getGlobalRanking(currentUserId);
    },

    getSeasonInfo: SeasonEngine.checkSeasonStatus,
    refresh: () => SeasonEngine.checkSeasonStatus(),
};
