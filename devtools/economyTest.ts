// devtools/economyTest.ts
import { EconomyEngineV6 } from "../api/economy/economyEngineV6";
import { CheckinEngineV4 } from "../api/economy/checkin";
import { SubscriptionMultiplierEngine } from "../services/economy/subscriptionMultiplier.engine";
import { MissionRewardEngine } from "../services/missions/reward.engine";
import { getRepository } from "../api/database/repository.factory";
import type { User } from "../types";

const repo = getRepository();

export const EconomyTest = {
    simulateXP: async () => {
        console.group("Economy Test: Simulate XP Gain");
        const userId = `sim-xp-${Date.now()}`;
        repo.insert("users", { 
            id: userId, coins: 0, xp: 0, level: 1, plan: 'Free Flow', name: 'Sim User', role: 'user' 
        });

        const res = await EconomyEngineV6.addXP(userId, 1500, "Test");
        console.log("Result:", res);
        
        if (res.updatedUser.level > 1) {
             console.log("%c[PASS] Level Up triggered correctly.", "color: green");
        } else {
             console.error("[FAIL] Level Up failed.");
        }
        console.groupEnd();
    },

    simulateLC: async () => {
        console.group("Economy Test: Simulate LC Transaction");
        const userId = `sim-lc-${Date.now()}`;
        repo.insert("users", { id: userId, coins: 100, role: 'user' });

        await EconomyEngineV6.addCoins(userId, 50, "Grant");
        try {
             await EconomyEngineV6.spendCoins(userId, 200, "Fail Spend");
             console.error("[FAIL] Should throw on insufficient funds");
        } catch(e) {
             console.log("%c[PASS] Insufficient funds check works.", "color: green");
        }
        
        await EconomyEngineV6.spendCoins(userId, 100, "Success Spend");
        const user = repo.select("users").find((u:any) => u.id === userId);
        
        if (user.coins === 50) {
             console.log("%c[PASS] Balance correct (100 + 50 - 100 = 50).", "color: green");
        } else {
             console.error(`[FAIL] Balance incorrect: ${user.coins}`);
        }
        console.groupEnd();
    },

    simulateMissionRun: async () => {
        console.group("Economy Test: Mission Reward (Multiplier)");
        const userId = `sim-mission-${Date.now()}`;
        repo.insert("users", { 
            id: userId, plan: 'Hitmaker', coins: 0, xp: 0, 
            completedMissions: [], pendingMissions: [], monthlyMissionsCompleted: 0, totalMissionsCompleted: 0,
            unlockedAchievements: []
        });
        
        const missionId = `m-${Date.now()}`;
        repo.insert("missions", { id: missionId, title: "Test", xp: 100, coins: 10 });
        
        // This is synchronous in the service but calls async economy internally in a real world
        // But MissionRewardEngine implementation uses CurrencySyncEngine which is synchronous (based on `services/economy/sync.engine.ts` implementation using LedgerEngine synchronous)
        // Wait, LedgerEngine writes to memory synchronously.
        // BUT `CurrencySyncEngine` in `services/economy/sync.engine.ts` uses `LedgerEngine` which is synchronous, and `LevelEngine`.
        // However, `EconomyEngineV6` which we made async, is DIFFERENT from `CurrencySyncEngine`.
        // `MissionRewardEngine` uses `CurrencySyncEngine`.
        // `CurrencySyncEngine` in my plan was NOT modified to be async because it uses `LedgerEngine` directly.
        // Let's check `services/economy/sync.engine.ts`.
        // It imports `LedgerEngine`. `LedgerEngine` methods are synchronous.
        // So `MissionRewardEngine` remains synchronous for now?
        // Wait, `MissionRewardEngine` might be used by `approveMission`.
        // `approveMission` in `services/missions/submission.engine.ts` uses `EconomyEngineV6` which is async.
        
        // Ah, `MissionRewardEngine` in `services/missions/reward.engine.ts` is likely legacy or alternative path.
        // Let's check `services/missions/reward.engine.ts`.
        // It imports `CurrencySyncEngine`.
        
        const res = MissionRewardEngine.applyMissionReward(userId, missionId);
        console.log("Mission Result:", res);
        
        // Hitmaker = 1.5x
        if (res.updatedUser.coins === 15 && res.updatedUser.xp === 150) {
             console.log("%c[PASS] Multiplier applied (1.5x).", "color: green");
        } else {
             console.error(`[FAIL] Multiplier logic broken. Got XP:${res.updatedUser.xp} LC:${res.updatedUser.coins}`);
        }
        console.groupEnd();
    },

    simulateWeeklyCheckin: async () => {
        console.group("Economy Test: Weekly Checkin");
        const userId = `sim-checkin-${Date.now()}`;
        // Set up user on day 6 streak
        repo.insert("users", { 
            id: userId, coins: 0, weeklyCheckInStreak: 6, 
            lastCheckIn: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            plan: 'Free Flow' 
        });
        
        const res = CheckinEngineV4.performCheckin(userId);
        console.log("Checkin Result:", res);
        
        if (res.isBonus && res.coinsGained > 10) { // 1 base + 10 bonus
             console.log("%c[PASS] Weekly bonus granted.", "color: green");
        } else {
             console.error("[FAIL] Bonus missing.");
        }
        console.groupEnd();
    }
};