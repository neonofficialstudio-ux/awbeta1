import {
    fetchLeaderboard,
    fetchMonthlyLeaderboard,
    fetchRankingCycles as fetchRankingCyclesSupabase,
} from "../supabase/economy";
import { config } from "../../core/config";

export const fetchRankingData = async (type: 'mensal' | 'geral' = 'mensal', limit = 50, offset = 0) => {
    if (config.backendProvider === 'supabase') {
        if (type === 'mensal') {
            const response = await fetchMonthlyLeaderboard(limit, offset);
            if (!response.success) {
                console.error('[API] fetchRankingData mensal failed', response.error);
                return [];
            }
            return response.leaderboard;
        }

        const response = await fetchLeaderboard(limit, offset);
        if (!response.success) {
            console.error('[API] fetchRankingData supabase failed', response.error);
            return [];
        }
        return response.leaderboard;
    }
    return [];
};

export const fetchRankingCycles = async (limit = 5) => {
    if (config.backendProvider !== 'supabase') return [];
    const res = await fetchRankingCyclesSupabase(limit);
    if (!res.success) {
        console.error('[API] fetchRankingCycles failed', res.error);
        return [];
    }
    return res.cycles || [];
};
