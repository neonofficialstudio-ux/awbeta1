
import { getRepository } from "../database/repository.factory";
import { CurrencySyncEngine } from "../../services/economy/sync.engine";
import { createNotification } from "../helpers";
import { SubscriptionMultiplierEngine } from "../../services/economy/subscriptionMultiplier.engine";
import type { User } from "../../types";

const repo = getRepository();
const CHECKIN_STREAK_BONUS_DAY = 7;
const CHECKIN_BASE_REWARD = 1;
const CHECKIN_STREAK_BONUS = 10;

export const CheckinEngineV4 = {
    canCheckin: (userId: string): boolean => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) return false;
        
        if (!user.lastCheckIn) return true;
        
        const today = new Date().setHours(0,0,0,0);
        const last = new Date(user.lastCheckIn).setHours(0,0,0,0);
        return last < today;
    },

    performCheckin: (userId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) throw new Error("User not found");
        
        if (!CheckinEngineV4.canCheckin(userId)) {
            throw new Error("Check-in já realizado hoje.");
        }

        const now = new Date();
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastDate = user.lastCheckIn ? new Date(user.lastCheckIn) : null;
        if (lastDate) lastDate.setHours(0,0,0,0);

        // Streak Logic
        let newStreak = 1;
        if (lastDate && lastDate.getTime() === yesterday.getTime()) {
            newStreak = (user.weeklyCheckInStreak || 0) + 1;
        }

        // Reward Calculation with Multiplier
        const multiplier = SubscriptionMultiplierEngine.getMultiplier(user.plan);
        const baseCoins = Math.floor(CHECKIN_BASE_REWARD * multiplier);
        let bonusCoins = 0;
        let isBonus = false;

        const notifications: any[] = [];

        // Apply Base Reward
        let syncResult = CurrencySyncEngine.applyLCGain(userId, baseCoins, 'daily_check_in', `Check-in Diário (Dia ${newStreak})`);
        let currentUser = syncResult.updatedUser;

        // Apply Bonus Reward
        if (newStreak >= CHECKIN_STREAK_BONUS_DAY) {
            bonusCoins = Math.floor(CHECKIN_STREAK_BONUS * multiplier);
            isBonus = true;
            newStreak = 0; // Reset streak
            
            const bonusResult = CurrencySyncEngine.applyLCGain(userId, bonusCoins, 'weekly_bonus', 'Bônus Semanal de Check-in');
            currentUser = bonusResult.updatedUser;
            
            notifications.push(createNotification(userId, "Bônus Semanal!", `Você completou 7 dias! +${bonusCoins} Coins.`));
        }

        // Update User Date/Streak
        const updatedUser = {
            ...currentUser,
            lastCheckIn: now.toISOString(),
            weeklyCheckInStreak: newStreak
        };
        repo.update("users", (u: any) => u.id === userId, (u: any) => updatedUser);

        return {
            success: true,
            updatedUser,
            coinsGained: baseCoins + bonusCoins,
            streak: newStreak,
            isBonus,
            notifications
        };
    }
};
