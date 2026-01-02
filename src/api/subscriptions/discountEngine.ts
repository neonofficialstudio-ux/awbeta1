
import { PLANS } from './constants';
import { normalizePlanId } from './normalizePlan';
import type { User } from '../../types';

export const DiscountEngine = {
    /**
     * Calcula o preço final de um item baseando-se no plano do usuário.
     */
    calculatePrice: (user: User, originalPrice: number): number => {
        const planId = normalizePlanId(user.plan);
        const discount = PLANS[planId].storeDiscount;
        
        if (discount <= 0) return originalPrice;
        
        const discounted = originalPrice * (1 - discount);
        return Math.floor(Math.max(0, discounted));
    },

    /**
     * Retorna a porcentagem de desconto atual do usuário.
     */
    getDiscountPercentage: (user: User): number => {
        const planId = normalizePlanId(user.plan);
        return Math.round(PLANS[planId].storeDiscount * 100);
    }
};
