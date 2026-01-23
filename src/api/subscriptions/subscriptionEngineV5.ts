import { PLANS } from './constants';
import { normalizePlanId, normalizePlan } from './normalizePlan';
import { AccessControl } from './accessControl';
import { DiscountEngine } from './discountEngine';
import { BillingBridge } from './billingBridge';
import type { User } from '../../types';

// ✅ AW Contract:
// Limite diário é aplicado no SUPABASE (submit_mission + plan_benefits).
// O front pode exibir quota via RPC get_my_mission_quota, mas não decide.

export const SubscriptionEngineV5 = {
    /**
     * Obtém a configuração completa do plano atual do usuário.
     */
    getPlanConfig: (user: User) => {
        const id = normalizePlanId(user.plan);
        return PLANS[id];
    },

    /**
     * Retorna o multiplicador de economia (XP/Coins) para o usuário.
     */
    getMultiplier: (user: User): number => {
        const config = SubscriptionEngineV5.getPlanConfig(user);
        return config.multiplier;
    },

    /**
     * Retorna o limite diário de missões.
     * Null ou Infinity significa ilimitado.
     */
    // UI-only fallback (não autoridade)
    getDailyMissionLimit: (user: User): number => {
        if (user?.plan === 'Hitmaker') return Infinity;
        if (user?.plan === 'Artista Profissional') return 3;
        if (user?.plan === 'Artista em Ascensão') return 2;
        return 1; // Free Flow
    },

    /**
     * Verifica se o usuário atingiu o limite diário.
     */
    // UI-only: backend decide (submit_mission bloqueia com daily_mission_limit_reached)
    checkDailyLimit: (_user: User) => ({ allowed: true, limit: 9999, current: 0 }),

    // Sub-Modules Access
    access: AccessControl,
    discount: DiscountEngine,
    billing: BillingBridge,
    
    /**
     * Normaliza dados do usuário para garantir consistência do plano.
     * Corrige nomes legados no banco de dados.
     */
    normalizeUserPlan: (user: User): User => {
        // Use new robust normalizer
        const normalized = normalizePlan(user.plan) as User['plan'];
        
        if (user.plan !== normalized) {
            return { ...user, plan: normalized };
        }
        return user;
    }
};
