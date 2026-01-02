
export type PlanTier = 'free' | 'ascensao' | 'profissional' | 'hitmaker';

export interface PlanConfig {
    id: PlanTier;
    displayName: string;
    missionLimit: number; // Infinity for unlimited
    multiplier: number;
    storeDiscount: number; // 0.0 to 1.0
    features: {
        queuePriority: boolean;
        visualRewards: boolean;
        eventsAccess: 'limited' | 'full' | 'vip';
        customProfile: boolean;
    };
}

export interface SubscriptionContext {
    plan: PlanTier;
    isValid: boolean;
    expiresAt?: string;
    isCancelled?: boolean;
}
