import { PLANS } from './constants';
import { normalizePlanId, normalizePlan } from './normalizePlan';
import { AccessControl } from './accessControl';
import { DiscountEngine } from './discountEngine';
import { BillingBridge } from './billingBridge';
import type { User } from '../../types';
import { getRepository } from '../database/repository.factory';

// ================================
// TEMPORARY UNLIMITED MISSIONS BYPASS
// ================================
// ⚠️ TEMPORÁRIO – remover quando assinaturas entrarem
export const UNLIMITED_MISSION_USERS = [
  // coloque aqui SEU user_id (uuid)
  'PUT_YOUR_USER_ID_HERE'
];

export const hasUnlimitedMissionAccess = (user: { id: string; role?: string; plan?: string | null }) => {
  const role = (user.role || '').trim().toLowerCase();
  const plan = (user.plan || '').trim().toLowerCase();

  // admin/owner sempre ilimitado
  if (role === 'admin' || role === 'owner') return true;

  // Hitmaker ilimitado (por role OU por plan)
  if (role === 'hitmaker') return true;
  if (plan === 'hitmaker') return true;

  return false;
};

const repo = getRepository();

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
    getDailyMissionLimit: (user: User): number => {
        const config = SubscriptionEngineV5.getPlanConfig(user);
        return config.missionLimit;
    },

    /**
     * Verifica se o usuário atingiu o limite diário.
     */
    checkDailyLimit: (user: User): { allowed: boolean; limit: number; current: number } => {
        // 🔓 Hitmaker bypass – always allow submissions for this plan
        if (user?.plan === 'Hitmaker') {
            return { allowed: true, limit: 9999, current: 0 };
        }

        if (hasUnlimitedMissionAccess(user)) {
            return { allowed: true, limit: 9999, current: 0 };
        }

        const limit = SubscriptionEngineV5.getDailyMissionLimit(user);
        
        if (limit === Infinity) return { allowed: true, limit: 9999, current: 0 };

        const today = new Date().toISOString().split('T')[0];
        const submissions = repo.select("submissions");
        
        const count = submissions.filter((s: any) => 
            s.userId === user.id && 
            s.submittedAtISO.startsWith(today)
        ).length;

        return {
            allowed: count < limit,
            limit,
            current: count
        };
    },

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
