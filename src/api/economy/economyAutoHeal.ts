
// api/economy/economyAutoHeal.ts

import type { User, StoreItem, UsableItem } from '../../types';

type HealResult = {
    fixed: boolean;
    message?: string;
    user?: User;
    reward?: { xp: number; coins: number };
};

const logHeal = (message: string) => {
    console.info(`%c[ECONOMY AUTO-HEAL] ${message}`, 'color: #34d399; font-weight: bold;');
};

export const autoFixNegativeCoins = (user: User): HealResult => {
    if (user.coins < 0) {
        const message = `Negative coins detected (${user.coins}). Reset to 0.`;
        logHeal(message);
        return { fixed: true, message, user: { ...user, coins: 0 } };
    }
    return { fixed: false };
};

export const autoFixNegativeXp = (user: User): HealResult => {
    if (user.xp < 0) {
        const message = `Negative XP detected (${user.xp}). Reset to 0.`;
        logHeal(message);
        return { fixed: true, message, user: { ...user, xp: 0 } };
    }
    return { fixed: false };
};

export const autoFixInvalidLevel = (user: User): HealResult => {
    if (user.level < 1) {
        const message = `Invalid level detected (${user.level}). Reset to 1.`;
        logHeal(message);
        return { fixed: true, message, user: { ...user, level: 1 } };
    }
    return { fixed: false };
};

export const autoFixCounters = (user: User): HealResult => {
    let fixed = false;
    let newUser = { ...user };
    
    if (newUser.monthlyMissionsCompleted < 0) {
        newUser.monthlyMissionsCompleted = 0;
        fixed = true;
    }
    if (newUser.totalMissionsCompleted < 0) {
        newUser.totalMissionsCompleted = 0;
        fixed = true;
    }
    
    if (fixed) {
        const message = 'Negative mission counters detected. Reset to 0.';
        logHeal(message);
        return { fixed: true, message, user: newUser };
    }
    return { fixed: false };
};

export const autoFixOverflowRewards = (reward: { xp: number; coins: number }): HealResult => {
    let fixed = false;
    const newReward = { ...reward };
    
    if (newReward.coins < 0) {
        newReward.coins = 0;
        fixed = true;
    }
    if (newReward.xp < 0) {
        newReward.xp = 0;
        fixed = true;
    }
    
    if (fixed) {
        const message = 'Negative rewards detected. Reset to 0.';
        logHeal(message);
        return { fixed: true, message, reward: newReward };
    }
    return { fixed: false };
};

export const autoFixPlanMismatch = (user: User, item: StoreItem | UsableItem): HealResult => {
     if (user.plan === 'Free Flow' && 'rarity' in item) {
         const message = 'Plan mismatch detected (Free Flow vs Store Item). Logged for review.';
         logHeal(message);
         return { fixed: true, message };
     }
     return { fixed: false };
};

// Composite helper to run all user fixes
export const applyUserHeals = (user: User): User => {
    let currentUser = { ...user };
    
    const coinResult = autoFixNegativeCoins(currentUser);
    if (coinResult.fixed && coinResult.user) currentUser = coinResult.user;
    
    const xpResult = autoFixNegativeXp(currentUser);
    if (xpResult.fixed && xpResult.user) currentUser = xpResult.user;
    
    const levelResult = autoFixInvalidLevel(currentUser);
    if (levelResult.fixed && levelResult.user) currentUser = levelResult.user;
    
    const counterResult = autoFixCounters(currentUser);
    if (counterResult.fixed && counterResult.user) currentUser = counterResult.user;
    
    return currentUser;
};
