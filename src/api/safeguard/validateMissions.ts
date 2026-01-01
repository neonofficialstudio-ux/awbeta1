// api/safeguard/validateMissions.ts
import type { Mission } from '../../types';
import { ensureString, ensureNumber } from './validateInputs';

export const validateMissionStructure = (mission: Partial<Mission>): boolean => {
    return (
        ensureString(mission.title).length > 0 &&
        ensureString(mission.description).length > 0 &&
        ensureNumber(mission.xp) > 0 &&
        ensureNumber(mission.coins) > 0 &&
        ensureString(mission.deadline).length > 0
    );
};

export const validateMissionDeadline = (mission: Mission): Mission => {
    if (!mission.deadline || isNaN(new Date(mission.deadline).getTime())) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { ...mission, deadline: tomorrow.toISOString() };
    }
    return mission;
};

// Based on rewards, not a 'type' field
export const validateMissionType = (mission: Mission): 'curta' | 'média' | 'longa' | 'custom' => {
    const xp = ensureNumber(mission.xp);
    // Simple heuristic based on XP rewards
    if (xp < 200) return 'curta';
    if (xp < 300) return 'média';
    if (xp >= 300) return 'longa';
    return 'custom';
};
