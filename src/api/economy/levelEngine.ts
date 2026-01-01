
import type { User } from '../../types';
import { LedgerEngine } from './ledgerEngine';
import { createNotification } from '../helpers';
import { LEVEL_UP_BONUS_AMOUNT, LEVEL_UP_BONUS_MILESTONE } from './economy-constants';

export const LevelEngine = {
    /**
     * Formula: Level N requires ~ 1000 * N XP (Linear/Geometric hybrid in V6)
     * Returns current level and XP needed for next level.
     */
    calculateLevel: (totalXp: number): { level: number; xpToNextLevel: number } => {
        if (totalXp < 1000) return { level: 1, xpToNextLevel: 1000 };
        
        // Logic: Level = 1 + sqrt(1 + 8*XP/1000) / 2
        const level = Math.floor((1 + Math.sqrt(1 + 8 * totalXp / 1000)) / 2);
        const nextLevelXp = Math.floor(1000 * (level) * (level + 1) / 2);
        
        return { 
            level, 
            xpToNextLevel: nextLevelXp 
        };
    },

    /**
     * Checks for level up and applies bonuses.
     * Returns mutation instructions, does NOT mutate user object directly.
     */
    processProgression: (user: User, newTotalXp: number) => {
        const { level: newLevel, xpToNextLevel } = LevelEngine.calculateLevel(newTotalXp);
        const oldLevel = user.level;
        
        const bonuses: { coins: number; notifications: any[] } = { coins: 0, notifications: [] };

        if (newLevel > oldLevel) {
            // Calculate Level Up Bonuses
            for (let i = oldLevel + 1; i <= newLevel; i++) {
                if (i % LEVEL_UP_BONUS_MILESTONE === 0) {
                    bonuses.coins += LEVEL_UP_BONUS_AMOUNT;
                    
                    // Record Ledger for Bonus
                    // We calculate theoretical balance here, actual update happens in EconomyEngine
                    const projectedBalance = user.coins + bonuses.coins;
                    
                    LedgerEngine.recordTransaction(
                        user.id, 
                        'COIN',
                        LEVEL_UP_BONUS_AMOUNT, 
                        'earn', 
                        'level_up_bonus', 
                        `Bônus Nível ${i}`,
                        projectedBalance
                    );

                    bonuses.notifications.push(
                        createNotification(
                            user.id,
                            `Nível ${i} Alcançado!`,
                            `Você recebeu um bônus de ${LEVEL_UP_BONUS_AMOUNT} LC!`
                        )
                    );
                }
            }
        }

        return {
            newLevel,
            newXpToNextLevel: xpToNextLevel,
            bonusCoins: bonuses.coins,
            notifications: bonuses.notifications
        };
    },

    getLevelProgress: (user: User) => {
        const BASE_XP = 1000;
        const currentLevelStartXP = user.level <= 1 ? 0 : Math.floor(BASE_XP * (user.level - 1) * (user.level) / 2);
        const progressXP = Math.max(0, user.xp - currentLevelStartXP);
        
        const nextLevelThreshold = user.xpToNextLevel;
        const levelRange = nextLevelThreshold - currentLevelStartXP;
        
        const safeRange = levelRange > 0 ? levelRange : 1000;
        const percentage = Math.min(100, Math.max(0, (progressXP / safeRange) * 100));
        
        return {
            currentLevelStartXP,
            percentage
        };
    }
};
