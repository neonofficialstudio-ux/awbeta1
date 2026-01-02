
import type { Mission } from '../../types';
import { BASE_MISSION_REWARDS } from '../economy/economy';
import { safeDate } from '../utils/dateSafe';

export const normalizeMissionData = (mission: Mission): Mission => {
    const validTypes: Mission['type'][] = ['instagram', 'tiktok', 'creative', 'special', 'youtube'];
    const normalizedMission = { ...mission };

    if (!validTypes.includes(normalizedMission.type)) {
        normalizedMission.type = 'creative';
    }

    const safeDeadline = safeDate(normalizedMission.deadline);
    
    if (!safeDeadline) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        normalizedMission.deadline = tomorrow.toISOString();
    } else {
        // Ensure consistent ISO format
        normalizedMission.deadline = safeDeadline.toISOString();
    }
    
    const safeCreated = safeDate(normalizedMission.createdAt);
    if (!safeCreated) {
        normalizedMission.createdAt = new Date().toISOString();
    } else {
        normalizedMission.createdAt = safeCreated.toISOString();
    }
    
    normalizedMission.xp = normalizedMission.xp ?? 0;
    normalizedMission.coins = normalizedMission.coins ?? 0;

    return normalizedMission;
};

// This is the function user called `validateMissionType`
export const normalizeMissionRewards = (mission: Mission): Mission => {
    const tiers = [BASE_MISSION_REWARDS.curta, BASE_MISSION_REWARDS.media, BASE_MISSION_REWARDS.longa];
    const currentReward = { xp: mission.xp, coins: mission.coins };

    let closestTier = tiers[0];
    let minDistance = Infinity;

    for (const tier of tiers) {
        // Simple distance formula
        const distance = Math.sqrt(Math.pow(tier.xp - currentReward.xp, 2) + Math.pow(tier.coins - currentReward.coins, 2));
        if (distance < minDistance) {
            minDistance = distance;
            closestTier = tier;
        }
    }
    
    // If it's already a perfect match, no change needed
    if (mission.xp === closestTier.xp && mission.coins === closestTier.coins) {
        return mission;
    }

    return {
        ...mission,
        xp: closestTier.xp,
        coins: closestTier.coins,
    };
};
