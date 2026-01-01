
import { PLANS } from './constants';
import { normalizePlanId } from './normalizePlan';
import type { User } from '../../types';

export type FeatureKey = 'queue_priority' | 'visual_rewards' | 'custom_profile' | 'vip_events';

export const AccessControl = {
    /**
     * Verifica se o usuário tem permissão para uma feature específica.
     */
    hasAccess: (user: User, feature: FeatureKey): boolean => {
        const planId = normalizePlanId(user.plan);
        const config = PLANS[planId];

        switch (feature) {
            case 'queue_priority':
                return config.features.queuePriority;
            case 'visual_rewards':
                return config.features.visualRewards;
            case 'custom_profile':
                return config.features.customProfile;
            case 'vip_events':
                return config.features.eventsAccess === 'vip';
            default:
                return false;
        }
    },

    /**
     * Retorna o nível de acesso a eventos.
     */
    getEventAccessLevel: (user: User) => {
        const planId = normalizePlanId(user.plan);
        return PLANS[planId].features.eventsAccess;
    }
};
