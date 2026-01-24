
import type { User } from '../../types';
import { LedgerEngine } from './ledgerEngine';
import { createNotification } from '../helpers';
import { SubscriptionEngineV5 } from '../subscriptions/subscriptionEngineV5';

export const CheckinEngineV2 = {
    canCheckIn: (user: User): boolean => {
        if (!user.lastCheckIn) return true;
        const today = new Date().setHours(0,0,0,0);
        const last = new Date(user.lastCheckIn).setHours(0,0,0,0);
        return last < today;
    },

    process: (user: User) => {
        if (!CheckinEngineV2.canCheckIn(user)) {
            throw new Error("Check-in já realizado hoje.");
        }

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0,0,0,0);

        const lastDate = user.lastCheckIn ? new Date(user.lastCheckIn) : null;
        if (lastDate) lastDate.setHours(0,0,0,0);

        // Streak Logic
        let newStreak = 1;
        if (lastDate && lastDate.getTime() === yesterday.getTime()) {
            newStreak = (user.weeklyCheckInStreak || 0) + 1;
        }

        // Rewards
        const multiplier = SubscriptionEngineV5.getMultiplier(user);
        let baseCoin = Math.floor(1 * multiplier); // 1 Coin base * multiplier
        let bonusCoin = 0;
        const notifications = [];

        // 7-Day Bonus
        let isBonus = false;
        if (newStreak >= 7) {
            bonusCoin = Math.floor(10 * multiplier);
            isBonus = true;
            newStreak = 0; // Reset after bonus
            notifications.push(
                createNotification(user.id, "Bônus Semanal!", `Você completou 7 dias! +${bonusCoin} LC.`)
            );
        }

        const totalCoins = baseCoin + bonusCoin;

        // Ledger
        LedgerEngine.recordTransaction(
            user.id, 
            'COIN',
            totalCoins, 
            'earn', 
            'daily_check_in', 
            isBonus ? 'Check-in + Bônus Semanal' : 'Check-in Diário',
            user.coins + totalCoins
        );

        return {
            coinsGained: totalCoins,
            newStreak,
            lastCheckIn: today.toISOString(),
            notifications,
            isBonus
        };
    }
};
