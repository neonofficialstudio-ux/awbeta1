
import type { User, Mission, MissionSubmission, CoinTransaction, RedeemedItem, UsableItemQueueEntry } from '../../types';
import * as db from '../mockData';
import { calculateLevelFromXp, getDailyMissionLimit, calculateDiscountedPrice, PLAN_MULTIPLIERS, LEVEL_UP_BONUS_MILESTONE } from '../economy/economy';
import { addPerformanceLog } from '../logs/performance';
import { SanitizeString, SanitizeArray } from '../../core/sanitizer.core'; // Updated import
import { validateEconomyRulesSafe } from './economy.safe';

interface EconomyError {
  userId: string;
  type: string;
  message: string;
}

export interface EconomyReport {
  timestamp: number;
  summary: {
    usersChecked: number;
    errorsFound: number;
  };
  errors: EconomyError[];
}

// 1. User Balance Integrity
const checkUserBalance = (user: User): EconomyError[] => {
  const errors: EconomyError[] = [];
  if (user.coins < 0) {
    errors.push({ userId: user.id, type: 'BALANCE_NEGATIVE_COINS', message: `Saldo negativo de coins: ${user.coins}` });
  }
  if (user.xp < 0) {
    errors.push({ userId: user.id, type: 'BALANCE_NEGATIVE_XP', message: `XP negativo: ${user.xp}` });
  }
  return errors;
};

// 2. Mission Rewards Multiplier Check (Historical Audit)
const checkMissionRewards = (user: User): EconomyError[] => {
  const errors: EconomyError[] = [];
  const userLogs = SanitizeArray(db.missionCompletionLogData).filter((log: any) => log.userId === user.id).slice(0, 20); // Audit last 20
  
  const planMultiplier = PLAN_MULTIPLIERS[user.plan] || 1;

  userLogs.forEach((log: any) => {
    const mission = db.missionsData.find(m => m.id === log.missionId);
    if (mission) {
        // V2.0 Rule: XP should match base XP. Coins should match Base * Multiplier.
        // Note: This is heuristic because user plan might have changed since completion.
        // We assume plan stability for basic diagnostics.
        
        const isEventMission = !!(mission as any).eventId; // Or check log type/source if available in future

        if (!isEventMission) {
             const expectedCoins = Math.floor(mission.coins * planMultiplier);
             
             // Check Coin Multiplier application (heuristic)
             if (planMultiplier > 1 && log.coinsGained < expectedCoins && log.coinsGained > 0) {
                 // Only flag if it looks like it WASN'T multiplied when it should have been
                  errors.push({ userId: user.id, type: 'MISSION_COIN_MULTIPLIER_MISSING', message: `Coins (${log.coinsGained}) menor que esperado (${expectedCoins}) para plano ${user.plan}` });
             }

             // Check XP Flat rule (heuristic)
             // XP gained should match base XP roughly
             if (log.xpGained !== mission.xp) {
                 // It might be okay if it's legacy data, but flagging for review in V2.0
                 // Only flag if XP is significantly higher (indicating old multiplier logic)
                 if (log.xpGained >= mission.xp * 1.1 && planMultiplier > 1) {
                     errors.push({ userId: user.id, type: 'MISSION_XP_MULTIPLIER_DETECTED', message: `XP (${log.xpGained}) parece multiplicado (Base: ${mission.xp}). V2.0 exige XP fixo.` });
                 }
             }
        }
        
        // Base safeguard
        if (log.xpGained < mission.xp) {
             errors.push({ userId: user.id, type: 'MISSION_REWARD_UNDERPAY', message: `Ganho de XP (${log.xpGained}) menor que base da missão (${mission.xp})` });
        }
    }
  });
  return errors;
};

// 3. Daily Limits Check
const checkDailyLimits = (user: User): EconomyError[] => {
  const errors: EconomyError[] = [];
  const limit = getDailyMissionLimit(user.plan);
  
  if (limit !== null) {
    const today = new Date().toISOString().split('T')[0];
    const submissionsToday = SanitizeArray(db.missionSubmissionsData).filter((s: any) => 
        s.userId === user.id && 
        SanitizeString(s.submittedAtISO).startsWith(today)
    ).length;

    if (submissionsToday > limit) {
        errors.push({ userId: user.id, type: 'DAILY_LIMIT_EXCEEDED', message: `Limite diário excedido: ${submissionsToday}/${limit}` });
    }
  }
  return errors;
};

// 4. Level Progression Integrity
const checkLevelProgression = (user: User): EconomyError[] => {
  const errors: EconomyError[] = [];
  const { level: calcLevel } = calculateLevelFromXp(user.xp);
  
  if (user.level !== calcLevel) {
    errors.push({ userId: user.id, type: 'LEVEL_MISMATCH', message: `Nível real (${user.level}) difere do calculado pelo XP (${calcLevel})` });
  }
  return errors;
};

// 5. Streak System Validation
const checkStreakSystem = (user: User): EconomyError[] => {
  const errors: EconomyError[] = [];
  if (user.weeklyCheckInStreak > 7) {
    errors.push({ userId: user.id, type: 'STREAK_OVERFLOW', message: `Streak maior que 7 dias: ${user.weeklyCheckInStreak}` });
  }
  
  const now = new Date();
  const lastCheckIn = user.lastCheckIn ? new Date(user.lastCheckIn) : null;
  if (lastCheckIn) {
      const diffTime = Math.abs(now.getTime() - lastCheckIn.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      // Tolerance of 2 days (today + yesterday) to keep streak. If > 2 days, streak should be 0.
      if (diffDays > 2 && user.weeklyCheckInStreak > 0) {
           errors.push({ userId: user.id, type: 'STREAK_STALE', message: `Streak mantido (${user.weeklyCheckInStreak}) apesar de inatividade (${diffDays} dias)` });
      }
  }
  return errors;
};

// 6. Store Transaction Validation
const checkStoreTransactions = (user: User): EconomyError[] => {
    const errors: EconomyError[] = [];
    const redemptions = SanitizeArray(db.redeemedItemsData).filter((r: any) => r.userId === user.id);
    
    redemptions.forEach((redemption: any) => {
        const storeItem = [...db.storeItemsData, ...db.usableItemsData].find(i => i.id === redemption.itemId);
        if (storeItem) {
            const expectedPrice = calculateDiscountedPrice(storeItem.price, user.plan);
            // Allow small variance or check if redemption price stored is drastically different
            // Note: user plan might have changed since purchase, so this is a soft check
            if (redemption.itemPrice > storeItem.price) {
                errors.push({ userId: user.id, type: 'STORE_PRICE_INFLATED', message: `Item resgatado por valor maior que o original (${redemption.itemPrice} > ${storeItem.price})` });
            }
        }
        if (redemption.coinsAfter < 0) {
             errors.push({ userId: user.id, type: 'STORE_NEGATIVE_BALANCE', message: `Compra resultou em saldo negativo` });
        }
    });
    return errors;
};

// 7. Queue Integrity
const checkQueueItems = (user: User): EconomyError[] => {
    const errors: EconomyError[] = [];
    // Check Usable Item Queue
    const inQueue = SanitizeArray(db.usableItemQueueData).filter((q: any) => q.userId === user.id);
    const now = new Date().getTime();
    
    inQueue.forEach((item: any) => {
        // Use safeString fallback for timestamps to prevent crashes
        const queuedAtStr = SanitizeString(item.queuedAt);
        const queuedTime = queuedAtStr ? new Date(queuedAtStr).getTime() : now;
        
        const daysInQueue = (now - queuedTime) / (1000 * 60 * 60 * 24);
        if (daysInQueue > 7) {
             errors.push({ userId: user.id, type: 'QUEUE_STAGNATION', message: `Item na fila há mais de 7 dias (${item.itemName})` });
        }
    });

    return errors;
};

// 8. Inventory Integrity
const checkInventory = (user: User): EconomyError[] => {
     const errors: EconomyError[] = [];
     // Ensure items in inventory (not consumed) are valid references
     const activeItems = SanitizeArray(db.redeemedItemsData).filter((r: any) => r.userId === user.id && r.status !== 'Refunded');
     activeItems.forEach((item: any) => {
         const exists = [...db.storeItemsData, ...db.usableItemsData].some(i => i.id === item.itemId);
         if (!exists) {
             errors.push({ userId: user.id, type: 'INVENTORY_ORPHAN', message: `Item de inventário refere-se a produto inexistente ID: ${item.itemId}` });
         }
     });
     return errors;
};

// --- MAIN FUNCTION ---

export const runEconomySanityCheck = (): EconomyReport => {
    const report: EconomyReport = {
        timestamp: Date.now(),
        summary: { usersChecked: 0, errorsFound: 0 },
        errors: []
    };

    const users = SanitizeArray(db.allUsersData).filter((u: any) => u.role === 'user');
    report.summary.usersChecked = users.length;

    users.forEach((user: any) => {
        const userErrors: EconomyError[] = [
            ...checkUserBalance(user),
            ...checkMissionRewards(user),
            ...checkDailyLimits(user),
            ...checkLevelProgression(user),
            ...checkStreakSystem(user),
            ...checkStoreTransactions(user),
            ...checkQueueItems(user),
            ...checkInventory(user)
        ];

        if (userErrors.length > 0) {
            report.errors.push(...userErrors);
            
            // Log to Performance System
            SanitizeArray(userErrors).forEach((err: any) => {
                addPerformanceLog({
                    type: 'economy',
                    source: 'sanity_check',
                    details: {
                        userId: err.userId,
                        issue: err.type,
                        description: err.message
                    }
                });
            });
        }
    });
    
    // Validate Global Rules using the single source
    const globalErrors = validateEconomyRulesSafe([]); // Just triggering it for static analysis if needed
    if (globalErrors.length > 0) {
        // This path is mostly symbolic as validateEconomyRulesSafe checks array input
    }

    report.summary.errorsFound = report.errors.length;
    return report;
};
