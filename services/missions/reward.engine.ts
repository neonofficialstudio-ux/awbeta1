
import { getRepository } from "../../api/database/repository.factory";
import { SubscriptionMultiplierEngine } from "../economy/subscriptionMultiplier.engine";
import { CurrencySyncEngine } from "../economy/sync.engine";
import { createNotification } from "../../api/helpers";
import { RankingEngine } from "../ranking/ranking.engine";
import type { Mission, User } from "../../types";
import { EventSessionEngine } from "../../api/events/session";

const repo = getRepository();

export const MissionRewardEngine = {
    /**
     * Calculates and applies rewards for a mission.
     * Handles duplicates, multipliers, and event syncing.
     */
    applyMissionReward: (userId: string, missionId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        const mission = repo.select("missions").find((m: any) => m.id === missionId);
        
        if (!user || !mission) throw new Error("Dados inválidos.");

        // 1. Validate Duplicates
        if (user.completedMissions.includes(missionId)) {
            return { success: false, error: "Missão já recompensada.", updatedUser: user, notifications: [] };
        }

        // 2. Calculate Multipliers
        const { total: xpTotal } = SubscriptionMultiplierEngine.calculateBonus(mission.xp, user.plan);
        const { total: lcTotal } = SubscriptionMultiplierEngine.calculateBonus(mission.coins, user.plan);

        // 3. Apply Economy (Sync Engine handles Ledger & Level Up & Global Ranking)
        const xpResult = CurrencySyncEngine.applyXPGain(userId, xpTotal, 'mission_completion', `Missão: ${mission.title}`);
        let currentUser = xpResult.updatedUser;
        
        let lcResult = null;
        if (lcTotal > 0) {
            lcResult = CurrencySyncEngine.applyLCGain(userId, lcTotal, 'mission_completion', `Missão: ${mission.title}`);
            currentUser = lcResult.updatedUser;
        }

        // 4. Update Mission Lists & Ranking Metrics
        const updatedUser = {
            ...currentUser,
            completedMissions: [...currentUser.completedMissions, missionId],
            pendingMissions: currentUser.pendingMissions.filter((id: string) => id !== missionId),
            monthlyMissionsCompleted: currentUser.monthlyMissionsCompleted + 1,
            totalMissionsCompleted: currentUser.totalMissionsCompleted + 1
        };
        repo.update("users", (u: any) => u.id === userId, (u: any) => updatedUser);
        
        // Update Mission Specific Ranking
        RankingEngine.getMissionRanking(userId);

        // 5. Event Integration
        const eventSession = EventSessionEngine.loadEventSession(userId);
        if (eventSession) {
             // If linked, logic goes here
        }

        // 6. Notifications
        const notifications = [...(xpResult.notifications || [])];
        notifications.push(createNotification(
            userId, 
            'Missão Concluída!', 
            `Você ganhou ${xpTotal} XP e ${lcTotal} Coins.`
        ));

        return { success: true, updatedUser, notifications };
    }
};
