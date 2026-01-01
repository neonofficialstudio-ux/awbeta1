
import type { PlanConfig, PlanTier } from './types';

export const PLANS: Record<PlanTier, PlanConfig> = {
    free: {
        id: 'free',
        displayName: 'Free Flow',
        missionLimit: 1,
        multiplier: 1.0, // 0% bonus
        storeDiscount: 0,
        features: {
            queuePriority: false,
            visualRewards: false,
            eventsAccess: 'limited',
            customProfile: false
        }
    },
    ascensao: {
        id: 'ascensao',
        displayName: 'Artista em Ascensão',
        missionLimit: 2,
        multiplier: 1.0, // 0% bonus (Starter)
        storeDiscount: 0,
        features: {
            queuePriority: false,
            visualRewards: true,
            eventsAccess: 'full',
            customProfile: false
        }
    },
    profissional: {
        id: 'profissional',
        displayName: 'Artista Profissional',
        missionLimit: 3,
        multiplier: 1.05, // +5% bonus
        storeDiscount: 0.05,
        features: {
            queuePriority: false,
            visualRewards: true,
            eventsAccess: 'full',
            customProfile: true
        }
    },
    hitmaker: {
        id: 'hitmaker',
        displayName: 'Hitmaker',
        missionLimit: Infinity,
        multiplier: 1.10, // +10% bonus
        storeDiscount: 0.10,
        features: {
            queuePriority: true,
            visualRewards: true,
            eventsAccess: 'vip',
            customProfile: true
        }
    }
};

export const PLAN_ALIASES: Record<string, PlanTier> = {
    "Free Flow": "free",
    "Free": "free",
    "free": "free",
    
    "Artista em Ascensão": "ascensao",
    "Ascensão": "ascensao",
    "ascensao": "ascensao",
    
    "Artista Profissional": "profissional",
    "Profissional": "profissional",
    "profissional": "profissional",
    
    "Hitmaker": "hitmaker",
    "hitmaker": "hitmaker"
};
