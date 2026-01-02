
import type { AchievementRarity, AchievementTrigger } from '../../types';

export interface AchievementDefinition {
    id: string;
    title: string;
    description: string;
    // iconUrl removed in favor of dynamic component mapping
    rarity: AchievementRarity;
    rewardCoins: number;
    rewardXP: number;
    trigger: AchievementTrigger;
    conditionValue: number;
    category: 'mission' | 'economy' | 'ranking' | 'event' | 'social';
    secret?: boolean;
}

export interface AchievementProgress {
    achievementId: string;
    current: number;
    target: number;
    unlocked: boolean;
    unlockedAt?: string;
}
