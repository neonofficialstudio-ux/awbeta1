
import { AchievementEngine } from "./achievement.engine";
import { getRepository } from "../../api/database/repository.factory";

const repo = getRepository();

export const AchievementTracker = {
    trackMissionProgress: (userId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (user) {
            AchievementEngine.checkAndUnlock(userId, 'mission_complete', user.totalMissionsCompleted);
        }
    },

    trackEconomyProgress: (userId: string) => {
        // Calcula total gasto/acumulado se necessário, ou usa saldo atual para alguns checks
        // Para 'coin_accumulated', idealmente teríamos um campo 'totalCoinsEarned' no user.
        // Usaremos o saldo atual como proxy simples ou varreremos ledger se crítico.
        // V6 EconomyEngine deve atualizar stats.
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (user) {
            // Heurística simples: Saldo atual para 'acumulado' neste MVP
            AchievementEngine.checkAndUnlock(userId, 'coin_accumulated', user.coins);
        }
    },
    
    trackStorePurchase: (userId: string) => {
        const redeemedCount = repo.select("redeemedItems").filter((r: any) => r.userId === userId).length;
        AchievementEngine.checkAndUnlock(userId, 'store_redeem', redeemedCount);
    },

    trackLevelProgress: (userId: string, level: number) => {
        AchievementEngine.checkAndUnlock(userId, 'level_up', level);
    },

    trackCheckInStreak: (userId: string, streak: number) => {
        AchievementEngine.checkAndUnlock(userId, 'check_in_streak', streak);
    },

    trackRankingProgress: (userId: string, rank: number) => {
        AchievementEngine.checkAndUnlock(userId, 'ranking', rank);
    }
};
