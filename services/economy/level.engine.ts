
import type { User } from "../../types";
import { LedgerEngine } from "./ledger.engine";
import { createNotification } from "../../api/helpers";

const BASE_XP = 1000;
const LEVEL_BONUS_MILESTONE = 5;
const LEVEL_BONUS_AMOUNT = 50;

export const LevelEngine = {
    /**
     * Calculates level based on total XP.
     * Formula: Triangular progression approximation.
     */
    computeLevelInfo: (totalXp: number) => {
        if (totalXp < BASE_XP) return { level: 1, xpToNextLevel: BASE_XP };
        
        // Logic: Level = 1 + sqrt(1 + 8*XP/1000) / 2 
        const level = Math.floor((1 + Math.sqrt(1 + 8 * totalXp / BASE_XP)) / 2);
        const xpForNext = Math.floor(BASE_XP * (level) * (level + 1) / 2);
        
        return { 
            level, 
            xpToNextLevel: xpForNext 
        };
    },

    /**
     * Checks for level up and grants rewards.
     * Returns notifications and any coin bonus amount.
     */
    processLevelUp: (user: User, newTotalXp: number) => {
        const { level: newLevel, xpToNextLevel } = LevelEngine.computeLevelInfo(newTotalXp);
        const oldLevel = user.level;
        
        const result = {
            newLevel,
            newXpToNextLevel: xpToNextLevel,
            bonusCoins: 0,
            notifications: [] as any[]
        };

        if (newLevel > oldLevel) {
            // Grant Level Up Bonuses
            for (let i = oldLevel + 1; i <= newLevel; i++) {
                // Every 5 levels logic
                if (i % LEVEL_BONUS_MILESTONE === 0) {
                    result.bonusCoins += LEVEL_BONUS_AMOUNT;
                    
                    // We record the ledger later in the Sync Engine when applying the full state
                    // But we generate the notification here
                    result.notifications.push(
                        createNotification(
                            user.id,
                            `Nível ${i} Alcançado!`,
                            `Você recebeu um bônus de ${LEVEL_BONUS_AMOUNT} LC!`
                        )
                    );
                }
            }
            
            if (result.notifications.length === 0) {
                 result.notifications.push(createNotification(user.id, `Level Up!`, `Você alcançou o nível ${newLevel}!`));
            }
        }

        return result;
    },
    
    getLevelProgress: (user: User) => {
        const currentLevelStartXP = user.level <= 1 ? 0 : Math.floor(BASE_XP * (user.level - 1) * (user.level) / 2);
        const progressXP = user.xp - currentLevelStartXP;
        const levelRange = user.xpToNextLevel - currentLevelStartXP;
        const percentage = Math.min(100, Math.max(0, (progressXP / levelRange) * 100));
        
        return {
            currentLevelStartXP,
            percentage
        };
    }
};
