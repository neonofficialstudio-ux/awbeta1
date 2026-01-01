
import type { User } from '../../types';

const DAILY_MISSION_LIMITS: Record<string, number> = {
    'Free Flow': 1,
    'free': 1,
    'Artista em Ascensão': 2,
    'ascensao': 2,
    'Artista Profissional': 3,
    'profissional': 3,
};

export const ensureRewardBounds = (xp: number, coins: number): { xp: number, coins: number } => {
    return {
        xp: Math.max(0, xp),
        coins: Math.max(0, coins),
    };
};

export const ensurePlanLimits = (plan: User['plan']): number | null => {
    const p = plan as string;
    if (p === 'Hitmaker' || p === 'hitmaker') return null; // Unlimited
    return DAILY_MISSION_LIMITS[p] ?? 1;
};
