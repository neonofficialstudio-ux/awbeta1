
import { getRepository } from "../../api/database/repository.factory";
import { LedgerEngine } from "./ledger.engine";
import { LevelEngine } from "../../api/economy/levelEngine";
import { rankingAPI } from "../../api/ranking/index";
import type { User, TransactionSource } from "../../types";

const repo = getRepository();

export const CurrencySyncEngine = {
    /**
     * Applies XP gain, checks for level up, updates Ledger, and syncs User.
     */
    applyXPGain: (userId: string, amount: number, source: TransactionSource, description: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) throw new Error("User not found");

        const safeAmount = Math.max(0, amount);
        const newTotalXp = user.xp + safeAmount;
        
        // 1. Process Level Up Logic
        const levelResult = LevelEngine.processProgression(user, newTotalXp);
        
        // 2. Record XP in Ledger
        LedgerEngine.recordTransaction(userId, 'XP', safeAmount, 'earn', source, description, user.xp);
        
        // 3. Handle Bonus Coins from Level Up
        let newTotalCoins = user.coins;
        if (levelResult.bonusCoins > 0) {
            LedgerEngine.recordTransaction(
                userId, 
                'COIN', 
                levelResult.bonusCoins, 
                'earn', 
                'level_up_bonus', 
                `Bônus Nível ${levelResult.newLevel}`, 
                user.coins
            );
            newTotalCoins += levelResult.bonusCoins;
        }

        // 4. Update User State
        const updatedUser = {
            ...user,
            xp: newTotalXp,
            level: levelResult.newLevel,
            xpToNextLevel: levelResult.newXpToNextLevel,
            coins: newTotalCoins
        };
        
        repo.update("users", (u: any) => u.id === userId, (u: any) => updatedUser);

        // 5. Sync Ranking
        rankingAPI.getGlobalRanking(userId); // Trigger refresh logic internally if needed
        
        return {
            success: true,
            updatedUser,
            notifications: levelResult.notifications
        };
    },

    /**
     * Applies Coin Gain securely.
     */
    applyLCGain: (userId: string, amount: number, source: TransactionSource, description: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) throw new Error("User not found");

        const safeAmount = Math.max(0, amount);
        const newTotalCoins = user.coins + safeAmount;

        // 1. Record Ledger
        LedgerEngine.recordTransaction(userId, 'COIN', safeAmount, 'earn', source, description, user.coins);

        // 2. Update User
        const updatedUser = { ...user, coins: newTotalCoins };
        repo.update("users", (u: any) => u.id === userId, (u: any) => updatedUser);

        return { success: true, updatedUser };
    },

    /**
     * Applies Coin Spend securely (Validates balance).
     */
    applyLCSpend: (userId: string, amount: number, source: TransactionSource, description: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) throw new Error("User not found");

        const safeAmount = Math.max(0, amount);

        if (user.coins < safeAmount) {
            return { success: false, error: "Saldo insuficiente", updatedUser: user };
        }

        const newTotalCoins = user.coins - safeAmount;

        // 1. Record Ledger (Negative amount implies spend in some views, but we store magnitude and type 'spend')
        LedgerEngine.recordTransaction(userId, 'COIN', -safeAmount, 'spend', source, description, user.coins);

        // 2. Update User
        const updatedUser = { ...user, coins: newTotalCoins };
        repo.update("users", (u: any) => u.id === userId, (u: any) => updatedUser);

        return { success: true, updatedUser };
    }
};
