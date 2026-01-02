// api/economySentinel/sentinelRules.ts
import type { User, MissionSubmission, RedeemedItem, UsableItemQueueEntry } from '../../types';
import { getDailyMissionLimit, PLAN_MULTIPLIERS, calculateDiscountedPrice } from '../economy/economy';

interface RuleResult {
  rule: string;
  passed: boolean;
  severity: "low" | "medium" | "high";
  details: string;
}

// 1. ruleXpBoundaries
export const ruleXpBoundaries = (user: User): RuleResult => {
  if (user.xp < 0) {
    return { rule: 'ruleXpBoundaries', passed: false, severity: 'high', details: `XP negativo detectado: ${user.xp}` };
  }
  // Daily XP cap logic would be complex for a mock environment, skipping for now.
  return { rule: 'ruleXpBoundaries', passed: true, severity: 'low', details: '' };
};

// 2. ruleLummiCoinIntegrity
export const ruleLummiCoinIntegrity = (user: User): RuleResult => {
  if (user.coins < 0) {
    return { rule: 'ruleLummiCoinIntegrity', passed: false, severity: 'high', details: `Lummi Coins negativas detectadas: ${user.coins}` };
  }
  // More complex checks (e.g., comparing against total possible earnings) would go here.
  return { rule: 'ruleLummiCoinIntegrity', passed: true, severity: 'low', details: '' };
};

// 3. ruleRewardMathCheck
export const ruleRewardMathCheck = (submission: MissionSubmission, user: User, mission: any): RuleResult => {
    // This is a conceptual check, as we don't store the exact reward given at the time.
    // In a real system, the transaction log would be more detailed.
    const expectedXp = Math.floor(mission.xp * PLAN_MULTIPLIERS[user.plan]);
    const expectedCoins = Math.floor(mission.coins * PLAN_MULTIPLIERS[user.plan]);

    // A real check would look up the actual transaction. This is a placeholder.
    if (expectedXp < 0 || expectedCoins < 0) { // Simple validation
         return { rule: 'ruleRewardMathCheck', passed: false, severity: 'medium', details: `Cálculo de recompensa inválido para a missão ${mission.id}.` };
    }

    return { rule: 'ruleRewardMathCheck', passed: true, severity: 'low', details: '' };
};

// 4. ruleDailyMissionLimitAdherence
export const ruleDailyMissionLimitAdherence = (user: User, submissionsToday: number): RuleResult => {
  const limit = getDailyMissionLimit(user.plan);
  if (limit !== null && submissionsToday > limit) {
    return { 
        rule: 'ruleDailyMissionLimitAdherence', 
        passed: false, 
        severity: 'medium', 
        details: `Usuário completou ${submissionsToday} missões, mas o limite é ${limit}.` 
    };
  }
  return { rule: 'ruleDailyMissionLimitAdherence', passed: true, severity: 'low', details: '' };
};

// 5. ruleStoreConsistency
export const ruleStoreConsistency = (itemPurchase: RedeemedItem, user: User, item: any): RuleResult => {
    const expectedDiscountPrice = calculateDiscountedPrice(item.price, user.plan);
    if (itemPurchase.itemPrice !== expectedDiscountPrice) {
        return { 
            rule: 'ruleStoreConsistency', 
            passed: false, 
            severity: 'medium', 
            details: `Desconto incorreto aplicado. Esperado: ${expectedDiscountPrice}, Pago: ${itemPurchase.itemPrice}`
        };
    }
    if (itemPurchase.coinsBefore < itemPurchase.itemPrice) {
         return { 
            rule: 'ruleStoreConsistency', 
            passed: false, 
            severity: 'high', 
            details: `Compra realizada com saldo insuficiente. Saldo: ${itemPurchase.coinsBefore}, Custo: ${itemPurchase.itemPrice}`
        };
    }
    return { rule: 'ruleStoreConsistency', passed: true, severity: 'low', details: '' };
};

// 6. ruleQueueIntegrity
export const ruleQueueIntegrity = (queue: UsableItemQueueEntry[]): RuleResult => {
    const userCounts: Record<string, number> = {};
    for (const item of queue) {
        userCounts[item.userId] = (userCounts[item.userId] || 0) + 1;
        // Check for users repeating impossible actions (e.g., in queue more than 3 times)
        if (userCounts[item.userId] > 3) {
            return {
                rule: 'ruleQueueIntegrity',
                passed: false,
                severity: 'medium',
                details: `Usuário ${item.userId} está na fila ${userCounts[item.userId]} vezes, indicando possível abuso.`
            };
        }
    }
    return { rule: 'ruleQueueIntegrity', passed: true, severity: 'low', details: '' };
};
