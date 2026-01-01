
import type { User } from '../../types';

export const WELCOME_BONUS_COINS = 50;
export const LEVEL_UP_BONUS_AMOUNT = 50;
export const LEVEL_UP_BONUS_MILESTONE = 5;

export const PLAN_HIERARCHY: Record<string, number> = {
    'Free Flow': 0,
    'free': 0,
    'Artista em Ascensão': 1,
    'ascensao': 1,
    'Artista Profissional': 2,
    'profissional': 2,
    'Hitmaker': 3,
    'hitmaker': 3,
};

// V10.0 Fixed Multipliers - Authoritative Source (Mission Multiplier Patch V2.0)
export const PLAN_MULTIPLIERS: Record<string, number> = {
    "Free Flow": 1,
    "Free": 1,
    "free": 1,
    
    "Artista em Ascensão": 3,
    "Artista Em Ascensão": 3,
    "ascensao": 3,
    "Starter Artist": 3,
    
    "Artista Profissional": 5,
    "profissional": 5,
    "Pro Artist": 5,
    
    "Hitmaker": 10,
    "hitmaker": 10,
    "Legendary Artist": 10,
    "VIP": 10
};

export const PLAN_LIMITS: Record<string, { missionsPerDay: number | 'unlimited'; monthlyCap: number }> = {
    "Free Flow": { missionsPerDay: 1, monthlyCap: 200 },
    "free": { missionsPerDay: 1, monthlyCap: 200 },
    
    "Artista em Ascensão": { missionsPerDay: 2, monthlyCap: 400 },
    "ascensao": { missionsPerDay: 2, monthlyCap: 400 },
    
    "Artista Profissional": { missionsPerDay: 'unlimited', monthlyCap: 600 },
    "profissional": { missionsPerDay: 'unlimited', monthlyCap: 600 },
    
    "Hitmaker": { missionsPerDay: 'unlimited', monthlyCap: 1100 },
    "hitmaker": { missionsPerDay: 'unlimited', monthlyCap: 1100 }
};

export const BASE_MISSION_REWARDS = {
    curta: { xp: 15, coins: 1 },
    media: { xp: 30, coins: 3 },
    longa: { xp: 60, coins: 6 }
};
