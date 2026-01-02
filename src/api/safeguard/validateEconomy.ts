// api/safeguard/validateEconomy.ts
import type { User } from '../../types';
import { PLAN_HIERARCHY, getDailyMissionLimit, calculateLevelFromXp, BASE_MISSION_REWARDS } from '../economy/economy';
import { ensureNonNegative } from './validateInputs';

export const validateMissionReward = (xp: number, coins: number): boolean => {
    xp = ensureNonNegative(xp);
    coins = ensureNonNegative(coins);

    // Check if rewards match any of the standard tiers
    const tiers = Object.values(BASE_MISSION_REWARDS);
    return tiers.some(tier => tier.xp === xp && tier.coins === coins);
};

export const validatePlanMultiplier = (plan: User['plan']): boolean => {
    return Object.keys(PLAN_HIERARCHY).includes(plan);
};

export const validateDailyLimit = (plan: User['plan'], count: number): boolean => {
    const limit = getDailyMissionLimit(plan);
    if (limit === null) return true; // Unlimited
    return count < limit;
};

export const ensureLevelIntegrity = (user: User): User => {
    const { level: correctLevel, xpToNextLevel: correctXpToNext } = calculateLevelFromXp(user.xp);
    if (user.level !== correctLevel || user.xpToNextLevel !== correctXpToNext) {
        return {
            ...user,
            level: correctLevel,
            xpToNextLevel: correctXpToNext,
        };
    }
    return user;
};
