
import { getRepository } from "../../api/database/repository.factory";
import { ACHIEVEMENTS_CATALOG } from "./achievement.data";
import { NotificationDispatcher } from "../notifications/notification.dispatcher";
import { EconomyEngineV6 } from "../../api/economy/economyEngineV6";
import { TelemetryPRO } from "../telemetry.pro";
import type { User, AchievementTrigger } from "../../types";
import { updateUserInDb } from "../../api/helpers"; // Needed to persist sync

const repo = getRepository();

export const AchievementEngine = {
    /**
     * Verifica e desbloqueia conquistas baseadas em um gatilho específico.
     */
    checkAndUnlock: (userId: string, trigger: AchievementTrigger, currentValue: number) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) return;

        // Filtrar conquistas do gatilho que o usuário ainda NÃO tem
        const candidates = ACHIEVEMENTS_CATALOG.filter(ach => 
            ach.trigger === trigger && 
            !user.unlockedAchievements.includes(ach.id)
        );

        candidates.forEach(ach => {
            let unlocked = false;
            
            // Lógica de Ranking é invertida (Menor é melhor)
            if (trigger === 'ranking') {
                if (currentValue > 0 && currentValue <= ach.conditionValue) {
                    unlocked = true;
                }
            } else {
                // Lógica padrão (Maior ou igual é melhor)
                if (currentValue >= ach.conditionValue) {
                    unlocked = true;
                }
            }

            if (unlocked) {
                AchievementEngine.unlock(user, ach.id);
            }
        });
    },

    /**
     * Executa o desbloqueio, aplica recompensas e notifica.
     */
    unlock: (user: User, achievementId: string, silent: boolean = false) => {
        const achievement = ACHIEVEMENTS_CATALOG.find(a => a.id === achievementId);
        if (!achievement) return;

        // 1. Persistência (Anti-duplicação já feita no check, mas reforçando)
        if (user.unlockedAchievements.includes(achievementId)) return;

        const updatedUser = {
            ...user,
            unlockedAchievements: [...user.unlockedAchievements, achievementId],
            // Push to pending modal queue (skip if silent sync)
            unseenAchievements: silent ? user.unseenAchievements : [...(user.unseenAchievements || []), achievementId]
        };
        repo.update("users", (u: any) => u.id === user.id, (u: any) => updatedUser);

        // 2. Recompensas (Apenas se não for silent sync para evitar spam de saldo em logins repetidos se o log não persistir, mas aqui persistimos user)
        // Se for sync de correção de dados, assumimos que o usuário já deveria ter ganho ou ganhamos agora.
        // Para segurança, vamos conceder, mas apenas se o usuário "merece".
        
        if (achievement.rewardCoins > 0) {
            EconomyEngineV6.addCoins(user.id, achievement.rewardCoins, `Conquista: ${achievement.title}`);
        }
        if (achievement.rewardXP > 0) {
            EconomyEngineV6.addXP(user.id, achievement.rewardXP, `Conquista: ${achievement.title}`);
        }

        // 3. Notificação & Telemetria
        if (!silent) {
            NotificationDispatcher.systemInfo(
                user.id, 
                "Nova Conquista!", 
                `${achievement.title} desbloqueada.`
            );
        }

        TelemetryPRO.event("achievement_unlocked", { 
            userId: user.id, 
            achievementId: achievement.title,
            rarity: achievement.rarity,
            method: silent ? 'sync' : 'trigger'
        });
        
        console.log(`[AchievementEngine] Unlocked ${achievement.title} for ${user.name} (${silent ? 'Sync' : 'Live'})`);
    },
    
    /**
     * Retorna lista completa para a UI (fundindo dados estáticos com progresso do usuário).
     */
    getUserAchievements: (userId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) return [];
        
        // Mapear status de desbloqueio
        return ACHIEVEMENTS_CATALOG.map(ach => ({
            ...ach,
            unlocked: user.unlockedAchievements.includes(ach.id)
        }));
    },

    /**
     * Syncs achievements based on current stats. 
     * useful for fixing data inconsistencies or migrations.
     */
    syncAchievements: (user: User) => {
        let unlockCount = 0;
        
        // Check all triggers against current stats
        const triggers: { t: AchievementTrigger, v: number }[] = [
            { t: 'mission_complete', v: user.totalMissionsCompleted },
            { t: 'level_up', v: user.level },
            { t: 'check_in_streak', v: user.weeklyCheckInStreak },
            { t: 'coin_accumulated', v: user.coins } // Heuristic
        ];

        // Store Redeem needs explicit check from redemption history
        const redemptionCount = repo.select("redeemedItems").filter((r: any) => r.userId === user.id).length;
        triggers.push({ t: 'store_redeem', v: redemptionCount });

        // Iterate and unlock silently if missing
        triggers.forEach(({ t, v }) => {
             const candidates = ACHIEVEMENTS_CATALOG.filter(ach => 
                ach.trigger === t && 
                !user.unlockedAchievements.includes(ach.id)
            );
            
            candidates.forEach(ach => {
                if (v >= ach.conditionValue) {
                    // Re-fetch user to ensure sequence updates if multiple unlock
                    const freshUser = repo.select("users").find((u:any) => u.id === user.id);
                    if (freshUser) {
                        AchievementEngine.unlock(freshUser, ach.id, true);
                        unlockCount++;
                    }
                }
            });
        });
        
        if (unlockCount > 0) {
            console.log(`[AchievementEngine] Synced ${unlockCount} missing achievements for ${user.name}`);
        }
        
        return unlockCount;
    }
};
