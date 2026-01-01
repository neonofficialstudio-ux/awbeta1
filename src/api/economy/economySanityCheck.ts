
import type { User, Mission, StoreItem, UsableItem, EventMission } from '../../types';
import { PLAN_MULTIPLIERS, BASE_MISSION_REWARDS, getDailyMissionLimit, calculateLevelFromXp } from './economy';

type SanityResult = {
    ok: boolean;
    reason?: string;
};

export const checkCoinsNeverNegative = (user: User): SanityResult => {
    if (user.coins < 0) {
        return { ok: false, reason: `User ${user.id} has negative coins: ${user.coins}` };
    }
    return { ok: true };
};

export const checkXpNeverNegative = (user: User): SanityResult => {
    if (user.xp < 0) {
        return { ok: false, reason: `User ${user.id} has negative XP: ${user.xp}` };
    }
    return { ok: true };
};

export const checkUserEconomyBounds = (user: User): SanityResult => {
    const coinsCheck = checkCoinsNeverNegative(user);
    if (!coinsCheck.ok) return coinsCheck;
    return checkXpNeverNegative(user);
};

export const checkRewardMatchesMissionType = (mission: Mission | EventMission, calculatedReward: { xp: number, coins: number }): SanityResult => {
    // Logic: Calculated reward should generally be >= base reward (due to multipliers)
    // Unless there's a penalty logic (none currently).
    if (calculatedReward.xp < mission.xp || ('coins' in mission && calculatedReward.coins < mission.coins)) {
        return { ok: false, reason: `Calculated reward (XP:${calculatedReward.xp}, LC:${calculatedReward.coins}) is lower than mission base (XP:${mission.xp}, LC:${'coins' in mission ? mission.coins : 0})` };
    }
    return { ok: true };
};

export const checkMultipliersCorrect = (user: User, baseReward: number, finalReward: number): SanityResult => {
    const multiplier = PLAN_MULTIPLIERS[user.plan] || 1.0;
    const expectedMin = Math.floor(baseReward * multiplier);
    // Allow 1 unit variance for rounding differences
    if (Math.abs(finalReward - expectedMin) > 1) {
        return { ok: false, reason: `Multiplier mismatch for ${user.plan}. Base: ${baseReward}, Exp: ${expectedMin}, Got: ${finalReward}` };
    }
    return { ok: true };
};

export const checkLevelUpCorrect = (user: User): SanityResult => {
    const { level: calculatedLevel } = calculateLevelFromXp(user.xp);
    if (user.level !== calculatedLevel) {
        return { ok: false, reason: `Level integrity failed. User XP ${user.xp} implies level ${calculatedLevel}, but user has level ${user.level}` };
    }
    return { ok: true };
};

export const checkDailyLimitsRespected = (user: User, submissionCountToday: number): SanityResult => {
    const limit = getDailyMissionLimit(user.plan);
    if (limit !== null && submissionCountToday > limit) {
        return { ok: false, reason: `Daily limit exceeded for ${user.plan}. Limit: ${limit}, Count: ${submissionCountToday}` };
    }
    return { ok: true };
};

export const checkStorePriceIntegrity = (item: StoreItem | UsableItem): SanityResult => {
    if (item.price < 0) {
        return { ok: false, reason: `Item ${item.name} has negative price: ${item.price}` };
    }
    return { ok: true };
};

export const checkPlanRestrictions = (user: User, item: StoreItem | UsableItem): SanityResult => {
    if (user.plan === 'Free Flow' && !('rarity' in item)) {
        // Usable items (no rarity) are typically restricted for Free Flow in this logic
        return { ok: false, reason: `Free Flow user attempted restricted item: ${item.name}` };
    }
    return { ok: true };
};
