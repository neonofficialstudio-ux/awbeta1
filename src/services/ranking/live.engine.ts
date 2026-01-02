
import { TelemetryPRO } from "../telemetry.pro";
import { RankingDeltaEngine } from "./delta.engine";
import { GlobalRankingEngine } from "./globalRanking.engine";

export const LiveRankingEngine = {
    generateLiveFeed: () => {
        // Placeholder for websocket feed
        return {
            type: "ranking_feed",
            timestamp: Date.now()
        };
    },

    /**
     * Checks if a user's rank has changed significantly and emits telemetry.
     */
    detectRankingChanges: (userId: string, oldRank: number, newRank: number) => {
        const delta = RankingDeltaEngine.computeDelta(oldRank, newRank);
        
        if (delta > 0) {
            // User Climbed
            TelemetryPRO.event("ranking_climb", { userId, oldRank, newRank, delta });
        } else if (delta < 0) {
            // User Dropped
             TelemetryPRO.event("ranking_drop", { userId, oldRank, newRank, delta });
        }

        if (newRank <= 3 && oldRank > 3) {
             TelemetryPRO.event("ranking_podium_entry", { userId });
        }
    },

    detectUserClimbOrDrop: (userId: string) => {
        const delta = RankingDeltaEngine.getUserDelta(userId);
        return {
            hasChanged: delta !== 0,
            direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
            amount: Math.abs(delta)
        };
    }
};
