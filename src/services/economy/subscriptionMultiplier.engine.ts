
import type { User } from "../../types";

const PLAN_MULTIPLIERS: Record<string, number> = {
    'Free Flow': 1.0,
    'Artista em Ascensão': 1.1,
    'Artista Profissional': 1.25,
    'Hitmaker': 1.5
};

export const SubscriptionMultiplierEngine = {
    getMultiplier: (plan: User['plan']): number => {
        return PLAN_MULTIPLIERS[plan] || 1.0;
    },

    calculateBonus: (baseAmount: number, plan: User['plan']): { total: number, bonus: number } => {
        const multiplier = SubscriptionMultiplierEngine.getMultiplier(plan);
        const total = Math.floor(baseAmount * multiplier);
        return {
            total,
            bonus: total - baseAmount
        };
    }
};
