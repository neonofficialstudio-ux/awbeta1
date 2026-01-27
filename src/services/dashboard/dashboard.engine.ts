// services/dashboard/dashboard.engine.ts
import { getRepository } from "../../api/database/repository.factory";
import { EconomyEngineV6 } from "../../api/economy/economyEngineV6";
import { CheckinEngineV4 } from "../../api/economy/checkin";
import { EventSessionEngine } from "../../api/events/session";
import { QueueEngineV5 } from "../../api/queue/queueEngineV5";
import { GlobalRankingEngine } from "../../services/ranking/globalRanking.engine";
import { TelemetryPRO } from "../../services/telemetry.pro";
import { FloatingIndicatorsEngine } from "./floatingIndicators.engine";
import type { User, TransactionSource } from "../../types";

const repo = getRepository();

export const DashboardEngine = {
    /**
     * Aggregates all critical user data for the dashboard in one sync pass.
     */
    getDashboardSnapshot: (userId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) return null;

        // 1. Economy Stats (source of truth from backend profile)

        // 2. Active Event
        const activeEvent = EventSessionEngine.getActiveEvent();
        const eventSession = user.eventSession;

        // 3. Queue Status
        const userQueue = QueueEngineV5.getQueueForUser(userId);
        
        // 4. Rank
        const rank = GlobalRankingEngine.calculateUserPosition(userId);

        return {
            userProfile: user,
            economy: {
                coins: user.coins,
                xp: user.xp,
                level: user.level,
                xpToNextLevel: user.xpToNextLevel
            },
            activeEvent: activeEvent ? {
                id: activeEvent.id,
                title: activeEvent.title,
                session: eventSession
            } : null,
            productionQueue: {
                count: userQueue.length,
                items: userQueue.slice(0, 3)
            },
            ranking: {
                position: rank
            }
        };
    },

    /**
     * Applies an Economy Delta (Coins) and syncs Dashboard.
     */
    applyEconomyDelta: async (user: User, deltaCoins: number, source: TransactionSource, description: string) => {
        let updatedUser = { ...user };
        
        if (deltaCoins > 0) {
            const res = await EconomyEngineV6.addCoins(user.id, deltaCoins, description);
            if (res.success && res.updatedUser) updatedUser = res.updatedUser;
        } else if (deltaCoins < 0) {
            const res = await EconomyEngineV6.spendCoins(user.id, Math.abs(deltaCoins), description);
            if (res.success && res.updatedUser) updatedUser = res.updatedUser;
        }

        // Sync Snapshot logic would go here or be triggered by caller
        return updatedUser;
    },

    /**
     * Applies XP Gain and syncs Dashboard (Level up check included).
     */
    applyXPGain: async (user: User, deltaXp: number, source: TransactionSource, description: string) => {
        // Validate non-negative visual regression
        const validatedXp = FloatingIndicatorsEngine.validateDelta(user.xp, user.xp + deltaXp, 'xp') - user.xp;
        
        const res = await EconomyEngineV6.addXP(user.id, validatedXp, description);
        
        // Telemetry
        TelemetryPRO.event("dashboard_xp_sync", { userId: user.id, delta: validatedXp, newLevel: res.updatedUser.level });

        return res;
    },

    /**
     * Process Check-in and return fully synced user state for Dashboard.
     */
    processCheckIn: async (userId: string) => {
        // Since CheckinEngineV4.performCheckin might use sync logic internally, we wrap it to ensure consistency if it evolves or if we want to force async pattern for dashboard ops.
        // However, CheckinEngineV4 uses CurrencySyncEngine which uses LedgerEngine (sync).
        // BUT we are migrating to V6 Economy everywhere.
        // Ideally CheckinEngineV4 should use EconomyEngineV6.
        // EconomyEngineV6 has `processCheckIn` which IS async.
        // So we should delegate to EconomyEngineV6 here.
        
        const result = await EconomyEngineV6.processCheckIn(userId);
        
        if (!result.success || !result.updatedUser || !result.data) {
             throw new Error(result.error || "Check-in failed");
        }

        // Force Ranking Sync
        GlobalRankingEngine.updateGlobalScore(userId, result.updatedUser.xp, result.updatedUser.totalMissionsCompleted);

        TelemetryPRO.event("dashboard_checkin_sync", { 
            userId, 
            streak: result.data.newStreak, 
            coins: result.data.coinsGained 
        });

        // Map V6 result to expected dashboard format (legacy compatibility)
        return {
             updatedUser: result.updatedUser,
             coinsGained: result.data.coinsGained,
             isBonus: result.data.isBonus,
             streak: result.data.newStreak,
             notifications: result.data.notifications
        };
    },
    
    /**
     * Specialized getter for Floating Indicators to ensure stability
     */
    getFloatingIndicatorsData: (userId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if(!user) return null;
        
        return {
            coins: user.coins,
            xp: user.xp,
            level: user.level
        };
    }
};
