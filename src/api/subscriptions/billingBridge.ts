
import type { User } from '../../types';
import { normalizePlanId } from './normalizePlan';
import { TelemetryPRO } from '../../services/telemetry.pro';

export const BillingBridge = {
    /**
     * Gera link de pagamento para upgrade.
     * Em produção, isso chamaria Stripe/PagSeguro/Supabase Edge Function.
     */
    generatePaymentLink: async (user: User, targetPlan: string): Promise<string> => {
        const planId = normalizePlanId(targetPlan);
        
        TelemetryPRO.event("billing_link_generated", { userId: user.id, targetPlan: planId });
        
        // Mock: Retorna links estáticos por enquanto, ou dinâmicos simulados
        // Isso facilita a substituição futura sem quebrar a UI
        if (planId === 'hitmaker') return "https://pay.artistworld.com/hitmaker";
        if (planId === 'profissional') return "https://pay.artistworld.com/pro";
        if (planId === 'ascensao') return "https://pay.artistworld.com/ascensao";
        
        return "#";
    },

    /**
     * Simula a verificação de status de assinatura externa.
     */
    syncStatus: async (userId: string) => {
        // Placeholder para Webhook receiver
        return { status: 'active', provider: 'mock' };
    }
};
