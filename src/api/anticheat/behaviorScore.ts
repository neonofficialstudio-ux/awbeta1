
// BehaviorScore Engine V2.0
// Usa regras estáticas + heurísticas de risco

export const BehaviorScore = {
  compute(user: any, activity: any) {
    let score = 0;

    // Ganho anormal de moedas
    if (activity.deltaCoins > 2000) score += 40;
    else if (activity.deltaCoins > 1000) score += 25;

    // XP anormal
    if (activity.deltaXp > 1500) score += 30;

    // Submissões rápidas
    if (activity.actionsPerMinute > 30) score += 40;
    else if (activity.actionsPerMinute > 15) score += 20;

    // Jackpot bursts
    if (activity.jackpotAttempts > 5) score += 30;

    // Compra/uso de itens rápido demais
    if (activity.storeBursts > 3) score += 20;

    // Multi-account hints
    if (activity.sameDeviceUsers > 2) score += 40;

    // Suspicious patterns
    if (activity.repeatedPattern) score += 25;

    return Math.min(score, 100);
  }
};
