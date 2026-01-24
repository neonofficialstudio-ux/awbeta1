// api/economy/economy.ts
import type { User, Mission, CoinTransaction } from '../../types';
import { EconomyEngineV6 } from './economyEngineV6';
import { SubscriptionEngineV5 } from '../subscriptions/subscriptionEngineV5';
import { LedgerEngine } from '../../services/economy/ledger.engine'; // Core Ledger Service

// ✔️ IMPORTA OS MULTIPLICADORES OFICIAIS
export * from './economy-constants';

// Legacy Helpers (Forwarded to V5/V6 Engines)
export const getDailyMissionLimit = (plan: User['plan']): number | null => {
    // Create dummy user for engine compatibility
    const limit = SubscriptionEngineV5.getDailyMissionLimit({ plan } as User);
    return limit === Infinity ? null : limit;
};

export const applyPlanMultiplier = (baseAmount: number, plan: User['plan']): number => {
    return Math.floor(baseAmount * SubscriptionEngineV5.getMultiplier({ plan } as User));
};

export const calculateDiscountedPrice = (price: number, plan: User['plan']): number => {
    return SubscriptionEngineV5.discount.calculatePrice({ plan } as User, price);
};

export const calculateLevelFromXp = (xp: number) => {
    // Forwarding to V6 Level Engine Logic logic (replicated here for synchronous access without full engine)
    if (xp < 1000) return { level: 1, xpToNextLevel: 1000 };
    const level = Math.floor((1 + Math.sqrt(1 + 8 * xp / 1000)) / 2);
    return { level, xpToNextLevel: Math.floor(1000 * level * (level + 1) / 2) };
};

export const xpForLevelStart = (level: number): number => {
    if (level <= 1) return 0;
    return Math.floor(1000 * (level - 1) * level / 2);
};

// --- ACTION PROCESSORS (Now using V6 Engine) ---

export const calculateMissionRewards = async (user: User, mission: Mission) => {
    // ✅ AW Contract:
    // Economia real é aplicada no backend (approve_mission_submission/admin_approve_submission_atomic + ledger trigger).
    // Aqui é somente PREVIEW para UI.
    const xpGained = Math.floor(mission.xp);
    const coinsGained = Math.floor(mission.coins);

    // Apply XP (Atomic V6)
    // Não aplicar saldo no front
    const xpResult = { ok: true };
    const updatedUser = user;
    const notifications: string[] = [];

    // Apply Coins (Atomic V6)
    const coinResult = { ok: true };
    
    return {
        updatedUser,
        notifications,
        xpGained,
        coinsGained,
        newTransactions: [] // Transactions handled internally by LedgerEngine
    };
};

export const evaluateCheckIn = async (user: User) => {
    const result = await EconomyEngineV6.processCheckIn(user.id);
    return {
        updatedUser: result.updatedUser,
        notifications: result.data.notifications,
        coinsGained: result.data.coinsGained,
        isBonus: result.data.isBonus,
        streak: result.data.newStreak,
        newTransactions: [] // Transactions handled internally by LedgerEngine
    };
};

export const processStorePurchase = async (user: User, price: number, itemName: string) => {
    // Forward to V6 Engine
    const result = await EconomyEngineV6.spendCoins(user.id, price, `Compra: ${itemName}`);
    
    // Construct legacy transaction-like object return for compatibility
    const mockTransaction = {
        id: `tx-legacy-${Date.now()}`,
        userId: user.id,
        amount: -price,
        type: 'spend',
        source: 'store_purchase',
        description: `Compra: ${itemName}`,
        date: new Date().toLocaleString('pt-BR'),
        dateISO: new Date().toISOString()
    } as CoinTransaction;

    return { 
        success: result.success, 
        updatedUser: result.updatedUser || user,
        error: result.error,
        transaction: result.success ? mockTransaction : undefined
    };
};

export const processEventEntry = async (user: User, cost: number, eventName: string, isGolden: boolean) => {
    // Forward to V6 Engine
    const result = await EconomyEngineV6.spendCoins(user.id, cost, `Inscrição: ${eventName} ${isGolden ? '(Golden)' : ''}`);

    const mockTransaction = {
        id: `tx-legacy-${Date.now()}`,
        userId: user.id,
        amount: -cost,
        type: 'spend',
        source: 'event_entry',
        description: `Inscrição: ${eventName}`,
        date: new Date().toLocaleString('pt-BR'),
        dateISO: new Date().toISOString()
    } as CoinTransaction;

    return {
        success: result.success,
        updatedUser: result.updatedUser || user,
        error: result.error,
        transaction: result.success ? mockTransaction : undefined
    };
};

export const processBuyJackpotTicket = async (user: User, price: number) => {
    // Forward to V6 Engine
     const result = await EconomyEngineV6.spendCoins(user.id, price, 'Jackpot Ticket');
     
     const mockTransaction = {
        id: `tx-legacy-${Date.now()}`,
        userId: user.id,
        amount: -price,
        type: 'spend',
        source: 'jackpot_entry',
        description: 'Jackpot Ticket',
        date: new Date().toLocaleString('pt-BR'),
        dateISO: new Date().toISOString()
    } as CoinTransaction;

    return {
        success: result.success,
        updatedUser: result.updatedUser || user,
        potIncrement: Math.floor(price * 0.5), // Calculation logic stays here for now or moves to Jackpot engine
        newTicket: result.success ? {
            id: `JKT-${Math.floor(Math.random() * 10000)}`,
            userId: user.id,
            userName: user.name,
            purchasedAt: new Date().toISOString()
        } : undefined,
        error: result.error,
        transaction: result.success ? mockTransaction : undefined
    };
};

export const processAdminAdjustment = async (user: User, adjustments: { coins?: number, xp?: number }, reason: string, type: 'admin_adjustment' | 'punishment' = 'admin_adjustment') => {
    let updatedUser = { ...user };
    
    if (adjustments.coins) {
        if (adjustments.coins > 0) {
            const result = await EconomyEngineV6.addCoins(user.id, adjustments.coins, reason);
            updatedUser = result.updatedUser!;
        } else {
            // For punishment (negative), we might need to force spend even if it goes to 0?
            // V6 spendCoins ensures balance doesn't drop below zero.
            const spendAmount = Math.abs(adjustments.coins);
            // Check balance first to avoid error if we want to just drain
            const amountToSpend = Math.min(user.coins, spendAmount);
            
            if (amountToSpend > 0) {
                 const result = await EconomyEngineV6.spendCoins(user.id, amountToSpend, reason);
                 updatedUser = result.updatedUser!;
            }
        }
    }
    
    if (adjustments.xp) {
         if (adjustments.xp > 0) {
            const result = await EconomyEngineV6.addXP(user.id, adjustments.xp, reason);
            updatedUser = result.updatedUser!;
         } else {
             // XP Reduction (Manual Ledger Record needed as Engine doesn't have reduceXP yet)
             const deductXP = Math.abs(adjustments.xp);
             const finalXP = Math.max(0, user.xp - deductXP);
             
             LedgerEngine.recordTransaction(user.id, 'XP', -deductXP, 'spend', 'punishment', reason, finalXP);
             // Update user locally for return
             updatedUser.xp = finalXP;
             // Note: This partial update needs to be persisted by caller or we add a reduceXP method to Engine
             // For now, returning updatedUser allows caller (AdminEngine) to persist.
         }
    }
    
    return { updatedUser };
};

export const processJackpotWin = async (user: User, amount: number, roundId?: string) => {
    const result = await EconomyEngineV6.addCoins(user.id, amount, `Jackpot Win ${roundId ? `(${roundId})` : ''}`);
    return { updatedUser: result.updatedUser! };
};

export const calculateJackpotInjection = (currentValue: number, amount: number): number => {
    return currentValue + amount;
};

export const processEventMissionReward = (user: User, mission: any) => {
    return {
        xp: mission.xp,
        coins: mission.coins || 0
    };
};
