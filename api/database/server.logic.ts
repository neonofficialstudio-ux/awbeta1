
import type { User, Mission, StoreItem, UsableItem, CoinPack } from '../../types';
import * as db from '../mockData';
import { normalizePlan } from '../subscriptions/normalizePlan';
import { LEVEL_UP_BONUS_AMOUNT, LEVEL_UP_BONUS_MILESTONE } from '../economy/economy-constants';

/**
 * SERVER LOGIC SIMULATOR
 * Este arquivo contém a "Verdade Absoluta" do sistema.
 * Em produção, estas funções seriam PostgreSQL Stored Procedures ou Edge Functions.
 * O Frontend NÃO deve importar isso diretamente, apenas via repository.rpc().
 */

export const ServerLogic = {
    
    // --- ECONOMY RPCs ---

    add_coins: (userId: string, amount: number, source: string): { success: boolean, newBalance: number, error?: string, updatedUser?: User } => {
        const user = db.allUsersData.find(u => u.id === userId);
        if (!user) return { success: false, newBalance: 0, error: "User not found" };

        if (amount <= 0) return { success: false, newBalance: user.coins, error: "Invalid amount" };

        // Atomic Update
        user.coins += Math.floor(amount);
        
        // Audit Log (Server Side)
        db.coinTransactionsLogData.unshift({
            id: `tx-srv-${Date.now()}`,
            userId,
            amount: Math.floor(amount),
            type: 'earn',
            source: 'admin_adjustment', // Simplification for generic add
            description: source,
            date: new Date().toLocaleString('pt-BR'),
            dateISO: new Date().toISOString()
        });

        return { success: true, newBalance: user.coins, updatedUser: user };
    },

    spend_coins: (userId: string, amount: number, description: string): { success: boolean, newBalance: number, error?: string, updatedUser?: User } => {
        const user = db.allUsersData.find(u => u.id === userId);
        if (!user) return { success: false, newBalance: 0, error: "User not found" };

        if (user.coins < amount) return { success: false, newBalance: user.coins, error: "Saldo insuficiente" };

        // Atomic Update
        user.coins -= Math.floor(amount);

        // Audit Log
        db.coinTransactionsLogData.unshift({
            id: `tx-srv-${Date.now()}`,
            userId,
            amount: -Math.floor(amount),
            type: 'spend',
            source: 'store_purchase',
            description,
            date: new Date().toLocaleString('pt-BR'),
            dateISO: new Date().toISOString()
        });

        return { success: true, newBalance: user.coins, updatedUser: user };
    },

    add_xp: (userId: string, amount: number, source: string): { success: boolean, user: User, levelUp: boolean } => {
        const user = db.allUsersData.find(u => u.id === userId);
        if (!user) throw new Error("User not found");

        const oldLevel = user.level;
        user.xp += Math.floor(amount);

        // Server-side Level Calculation
        const { level: newLevel, xpToNextLevel } = ServerLogic._calculateLevel(user.xp);
        user.level = newLevel;
        user.xpToNextLevel = xpToNextLevel;

        let levelUp = false;
        if (newLevel > oldLevel) {
            levelUp = true;
            // Grant Level Up Bonus (Server Side Authority)
            for (let i = oldLevel + 1; i <= newLevel; i++) {
                if (i % LEVEL_UP_BONUS_MILESTONE === 0) {
                    user.coins += LEVEL_UP_BONUS_AMOUNT;
                    db.coinTransactionsLogData.unshift({
                         id: `tx-lvl-${Date.now()}`, userId, amount: LEVEL_UP_BONUS_AMOUNT, type: 'earn', source: 'level_up_bonus', description: `Bônus Nível ${i}`, date: new Date().toLocaleString(), dateISO: new Date().toISOString()
                    });
                }
            }
        }

        return { success: true, user, levelUp };
    },

    // --- STORE RPCs ---

    purchase_item: (userId: string, itemId: string): { success: boolean, error?: string, user?: User, redeemedItem?: any } => {
        const user = db.allUsersData.find(u => u.id === userId);
        const item = [...db.storeItemsData, ...db.usableItemsData].find(i => i.id === itemId);

        if (!user || !item) return { success: false, error: "Item ou usuário inválido" };
        if (item.isOutOfStock) return { success: false, error: "Item esgotado" };

        // Server-Side Price Calculation (Prevents client tampering)
        const discount = ServerLogic._getPlanDiscount(user.plan);
        const finalPrice = Math.floor(item.price * (1 - discount));

        if (user.coins < finalPrice) return { success: false, error: "Saldo insuficiente" };

        // Atomic Transaction
        user.coins -= finalPrice;
        
        // Inventory Add
        const redeemed = {
            id: `ri-${Date.now()}`,
            userId,
            userName: user.name,
            itemId: item.id,
            itemName: item.name,
            itemPrice: finalPrice,
            redeemedAt: new Date().toLocaleString(),
            redeemedAtISO: new Date().toISOString(),
            coinsBefore: user.coins + finalPrice,
            coinsAfter: user.coins,
            status: 'Redeemed'
        };
        db.redeemedItemsData.unshift(redeemed as any);

        // Audit
        db.coinTransactionsLogData.unshift({
            id: `tx-store-${Date.now()}`,
            userId,
            amount: -finalPrice,
            type: 'spend',
            source: 'store_purchase',
            description: `Compra: ${item.name}`,
            date: new Date().toLocaleString(),
            dateISO: new Date().toISOString()
        });

        return { success: true, user, redeemedItem: redeemed };
    },

    // --- MISSION RPCs ---

    approve_mission: (submissionId: string, adminId: string): { success: boolean, user?: User } => {
        const sub = db.missionSubmissionsData.find(s => s.id === submissionId);
        if (!sub || sub.status !== 'pending') return { success: false };

        const user = db.allUsersData.find(u => u.id === sub.userId);
        const mission = db.missionsData.find(m => m.id === sub.missionId);

        if (!user || !mission) return { success: false };

        // Server-side Reward Calculation
        const multiplier = ServerLogic._getPlanMultiplier(user.plan);
        const xp = mission.xp; // XP usually flat
        const coins = Math.floor(mission.coins * multiplier); // Coins multiplied

        user.xp += xp;
        user.coins += coins;
        
        // Recalc Level
        const { level, xpToNextLevel } = ServerLogic._calculateLevel(user.xp);
        user.level = level;
        user.xpToNextLevel = xpToNextLevel;

        // Update Stats
        user.totalMissionsCompleted++;
        user.monthlyMissionsCompleted++;
        user.completedMissions.push(mission.id);
        user.pendingMissions = user.pendingMissions.filter(id => id !== mission.id);

        sub.status = 'approved';

        return { success: true, user };
    },

    // --- INTERNAL HELPERS (Private) ---
    
    _calculateLevel: (xp: number) => {
        if (xp < 1000) return { level: 1, xpToNextLevel: 1000 };
        const level = Math.floor((1 + Math.sqrt(1 + 8 * xp / 1000)) / 2);
        const nextLevelXp = Math.floor(1000 * level * (level + 1) / 2);
        return { level, xpToNextLevel: nextLevelXp };
    },

    _getPlanMultiplier: (planName: string) => {
        const plan = normalizePlan(planName);
        // Using the constants directly to avoid circular dependency with Engine
        const map: Record<string, number> = {
            'Free Flow': 1,
            'free': 1,
            'Artista em Ascensão': 3, // V10 Multiplier
            'ascensao': 3,
            'Artista Profissional': 5,
            'profissional': 5,
            'Hitmaker': 10,
            'hitmaker': 10
        };
        return map[plan] || 1;
    },

    _getPlanDiscount: (planName: string) => {
        const plan = normalizePlan(planName);
        if (plan === 'Hitmaker') return 0.10;
        if (plan === 'Artista Profissional') return 0.05;
        return 0;
    }
};
