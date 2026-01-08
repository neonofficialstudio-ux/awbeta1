// api/helpers.ts
import type { User, SubscriptionEvent, SubscriptionEventType, AchievementTrigger, Mission } from '../types';
import type { AWNotification } from '../types/notification';
import { normalizeUserBasic, normalizeUserEconomy } from './core/normalizeUser';
import { PLAN_HIERARCHY } from './economy/economy';
import { simulateNetworkLatency } from './simulation/networkLatency';
import { maybeFailRequest } from './simulation/networkFailures';
import { NotificationEngine } from '../services/notifications/notification.engine';
import { DiagnosticCore, LogType } from '../services/diagnostic.core';
import { isMockProvider, isSupabaseProvider, assertNotMockInSupabase } from './core/backendGuard';

// A simple deep clone that preserves functions, unlike JSON.parse(JSON.stringify(obj))
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (typeof obj === 'function') {
      return obj; // Return function references as-is
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = deepClone(obj[key]);
    }
  }

  return newObj as T;
}

export const withLatency = async <T,>(data: T | (() => T | Promise<T>)): Promise<T> => {
    // ✅ LANÇAMENTO / SUPABASE: sem latência simulada e sem falha aleatória.
    // Isso estava causando timeouts no AuthGate (checkAuthStatus) e “F5 cai pro login”.
    if (!isSupabaseProvider()) {
        await simulateNetworkLatency();
        await maybeFailRequest(); // Simula falhas apenas no MOCK/dev
    }

    try {
        const result = typeof data === 'function' ? (data as () => T | Promise<T>)() : data;
        const resolved = result instanceof Promise ? await result : result;

        // Em supabase, deepClone é ok, mas manter por compatibilidade
        return deepClone(resolved);
    } catch (e) {
        DiagnosticCore.errors.capture(e, { context: 'withLatencyWrapper' });
        throw e;
    }
};

// Universal Logging Hook (V9.0)
export const logEvent = (type: LogType, data: any, userId?: string) => {
    DiagnosticCore.record(type, data, userId);
};

// V4.0 Update: Bridge to Notification Engine
export const createNotification = (userId: string, title: string, description: string, linkTo?: any): AWNotification => {
    // Map legacy generic notifications to 'system_info' type by default
    return NotificationEngine.create(userId, 'system_info', title, description, linkTo);
};

export const checkAndGrantAchievements = (user: User, trigger: AchievementTrigger) => {
    if (!isMockProvider()) {
        assertNotMockInSupabase("achievements");
        throw new Error("Supabase mode: achievements not implemented yet. Previously used mockData.");
    }
    const db = require('./mockData');
    let updatedUser = { ...user };
    const newNotifications: AWNotification[] = [];

    const achievementsToCheck = db.achievementsData.filter(ach => ach.trigger === trigger && !updatedUser.unlockedAchievements.includes(ach.id));

    for (const achievement of achievementsToCheck) {
        let conditionMet = false;
        switch(trigger) {
            case 'mission_complete':
                if (updatedUser.totalMissionsCompleted >= achievement.conditionValue) {
                    conditionMet = true;
                }
                break;
            case 'level_up':
                if (updatedUser.level >= achievement.conditionValue) {
                    conditionMet = true;
                }
                break;
            case 'store_redeem':
                 const redemptionCount = db.redeemedItemsData.filter(ri => ri.userId === user.id).length;
                 if (redemptionCount >= achievement.conditionValue) {
                     conditionMet = true;
                 }
                break;
            case 'check_in_streak':
                 if (updatedUser.weeklyCheckInStreak >= achievement.conditionValue) {
                     conditionMet = true;
                 }
                break;
        }

        if (conditionMet) {
            updatedUser.unlockedAchievements.push(achievement.id);
            // Add to unseen queue for modal
            updatedUser.unseenAchievements = [...(updatedUser.unseenAchievements || []), achievement.id];

            updatedUser.coins += achievement.rewardCoins;
            const now = new Date();
            
            // Use Legacy direct insert for mockDB consistency within helper, 
            // but DiagnosticCore will pick up future events.
            db.coinTransactionsLogData.unshift({
                id: `ct-ach-${now.getTime()}`,
                userId: user.id,
                date: now.toLocaleString('pt-BR'),
                dateISO: now.toISOString(),
                description: `Conquista: ${achievement.title}`,
                amount: achievement.rewardCoins,
                type: 'earn',
                source: 'achievement_reward',
            });
            
            const notif = NotificationEngine.create(
                user.id, 
                'system_info', 
                'Conquista Desbloqueada!', 
                `Você desbloqueou "${achievement.title}" e ganhou ${achievement.rewardCoins} moedas!`, 
                { view: 'achievements' }
            );
            newNotifications.push(notif);
            
            logEvent('telemetry', { action: 'achievement_unlocked', achievementId: achievement.id }, user.id);
        }
    }

    return { updatedUser, newNotifications };
};

const normalizeUser = (user: User): User => {
    let normalizedUser = normalizeUserBasic(user);
    normalizedUser = normalizeUserEconomy(normalizedUser);
    return normalizedUser;
}


export const updateUserInDb = (userToUpdate: User) => {
    if (!isMockProvider()) {
        assertNotMockInSupabase("users");
        throw new Error("Supabase mode: user update helper not implemented yet. Previously used mockData.");
    }
    const db = require('./mockData');
    const updatedUser = normalizeUser(userToUpdate);
    const userIndex = db.allUsersData.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) {
        const oldUser = db.allUsersData[userIndex];
        // Log subscription changes if plan is different
        if (oldUser.plan !== updatedUser.plan) {
            let eventType: SubscriptionEventType = 'UPGRADE';
            const oldPlanLevel = PLAN_HIERARCHY[oldUser.plan];
            const newPlanLevel = PLAN_HIERARCHY[updatedUser.plan];

            if (newPlanLevel < oldPlanLevel) {
                eventType = updatedUser.plan === 'Free Flow' ? 'CANCEL' : 'DOWNGRADE';
            }
            const newLogEntry: SubscriptionEvent = {
                id: `se-${Date.now()}`,
                userId: updatedUser.id,
                userName: updatedUser.name,
                oldPlan: oldUser.plan,
                newPlan: updatedUser.plan,
                changedAt: new Date().toISOString(),
                eventType,
                userLevelAtEvent: oldUser.level,
            };
            updatedUser.subscriptionHistory = [newLogEntry, ...(updatedUser.subscriptionHistory || [])];
            
            logEvent('audit', { action: 'subscription_change', oldPlan: oldUser.plan, newPlan: updatedUser.plan }, updatedUser.id);
        }
        
        let finalUser = updatedUser;
        // Check for level-up achievements
        if (updatedUser.level > oldUser.level) {
            const { updatedUser: userAfterAchievements, newNotifications } = checkAndGrantAchievements(updatedUser, 'level_up');
            finalUser = userAfterAchievements;
        }

        db.allUsersData[userIndex] = finalUser;
    }
    return updatedUser;
};

// Helper to prepare a mission object from the generator's data
export const prepareGeneratedMission = (generatedMission: any): Mission => {
    let missionTypeEnum: Mission['type'] = 'creative';
    const platformLower = safeString(generatedMission.platform).toLowerCase();
    if (platformLower.includes('instagram')) {
        missionTypeEnum = 'instagram';
    } else if (platformLower.includes('tiktok')) {
        missionTypeEnum = 'tiktok';
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 2); // Default 2 day deadline

    const missionToCreate: Mission = {
        id: '', // Empty id signifies creation
        createdAt: '',
        status: 'active',
        title: generatedMission.title,
        description: generatedMission.description,
        xp: generatedMission.xp,
        coins: generatedMission.coins,
        type: missionTypeEnum,
        actionUrl: '',
        deadline: deadline.toISOString(),
    };

    return missionToCreate;
};

// --- V5.0 UTILITIES ---

/**
 * Safely converts any value to string and handles undefined/null.
 */
export const safeString = (value: any): string => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return String(value);
};

export const safeBoolean = (value: any, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    return Boolean(value ?? fallback);
};

export const safeNumber = (value: any): number => {
    if (typeof value === 'number' && !isNaN(value)) return value;
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Marks the unseen raffle win as seen for the user in the database immediately.
 */
export const markRaffleWinAsSeen = (userId: string) => {
    const user = db.allUsersData.find(u => u.id === userId);
    if (user) {
        const updatedUser = { ...user, unseenRaffleWin: undefined };
        updateUserInDb(updatedUser);
        return { updatedUser };
    }
    return { updatedUser: null };
};
