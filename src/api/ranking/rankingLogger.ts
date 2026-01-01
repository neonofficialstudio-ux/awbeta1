
import { TelemetryPRO } from "../../services/telemetry.pro";

export const RankingLogger = {
    logRankChange: (userId: string, oldRank: number, newRank: number) => {
        if (oldRank === newRank) return;
        
        const change = oldRank - newRank; // Positive means moved up (e.g. 10 -> 5 = +5)
        
        if (newRank === 1) {
            TelemetryPRO.event("ranking_new_leader", { userId });
        } else if (newRank <= 10 && oldRank > 10) {
            TelemetryPRO.event("ranking_top10_entry", { userId });
        } else if (change > 0) {
            // Only log significant moves to reduce noise
             if (change > 5) {
                TelemetryPRO.event("ranking_climb", { userId, change, newRank });
             }
        }
    },

    logSeasonReset: (seasonName: string, count: number) => {
        TelemetryPRO.event("season_reset", { seasonName, usersProcessed: count });
    },

    logSnapshot: (topUsers: string[]) => {
        // Log minimal data for audit
        TelemetryPRO.metric("ranking_snapshot", topUsers.length);
    }
};
