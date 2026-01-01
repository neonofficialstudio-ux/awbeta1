
import type { User, CoinTransaction, MissionSubmission, RedeemedItem } from '../../types';

interface RuleResult {
  rule: string;
  passed: boolean;
  severity: "low" | "medium" | "high";
  details: string;
}

const LEVEL_GROWTH_THRESHOLD = 4; // levels per day
const LC_GAIN_THRESHOLD = 500; // LC per day

// Rule: User gains more than X levels per day.
export const ruleRapidLevelGrowth = (user: User): RuleResult => {
    const now = new Date();
    const joinedDate = user.joinedISO ? new Date(user.joinedISO) : now;
    const daysOnPlatform = Math.max(1, (now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
    const avgLevelGrowth = (user.level - 1) / daysOnPlatform;
    
    if (user.level > 5 && avgLevelGrowth > LEVEL_GROWTH_THRESHOLD) {
        return {
            rule: 'ruleRapidLevelGrowth',
            passed: false,
            severity: 'high',
            details: `Usuário subiu em média ${avgLevelGrowth.toFixed(1)} níveis por dia desde que entrou.`
        };
    }

    return { rule: 'ruleRapidLevelGrowth', passed: true, severity: 'low', details: '' };
};

// Rule: User gains more than X LC in a single day.
export const ruleUnusualLCGain = (user: User, transactions: CoinTransaction[]): RuleResult => {
    const userEarnings = transactions.filter(t => t.userId === user.id && t.type === 'earn');
    const earningsByDay: Record<string, number> = {};

    userEarnings.forEach(t => {
        const date = new Date(t.dateISO).toISOString().split('T')[0];
        earningsByDay[date] = (earningsByDay[date] || 0) + t.amount;
    });

    for (const date in earningsByDay) {
        if (earningsByDay[date] > LC_GAIN_THRESHOLD) {
            return {
                rule: 'ruleUnusualLCGain',
                passed: false,
                severity: 'medium',
                details: `Usuário ganhou ${earningsByDay[date]} LC em ${date}.`
            };
        }
    }
    
    return { rule: 'ruleUnusualLCGain', passed: true, severity: 'low', details: '' };
};

// Rule: User submits missions at unusual times or too frequently.
export const ruleSuspiciousMissionPattern = (user: User, submissions: MissionSubmission[]): RuleResult => {
    const userSubmissions = submissions.filter(s => s.userId === user.id)
        .sort((a, b) => new Date(a.submittedAtISO).getTime() - new Date(b.submittedAtISO).getTime());

    if (userSubmissions.length < 5) {
        return { rule: 'ruleSuspiciousMissionPattern', passed: true, severity: 'low', details: '' };
    }

    // Check for submissions at improbable hours (e.g., between 2am and 5am)
    const nightOwlSubmissions = userSubmissions.filter(s => {
        const hour = new Date(s.submittedAtISO).getHours();
        return hour >= 2 && hour < 5;
    });

    if (nightOwlSubmissions.length / userSubmissions.length > 0.5) { // more than 50% of submissions are at night
        return {
            rule: 'ruleSuspiciousMissionPattern',
            passed: false,
            severity: 'low',
            details: `Alta porcentagem de missões enviadas durante a madrugada.`
        };
    }
    
    // Check for rapid-fire submissions
    for (let i = 0; i < userSubmissions.length - 2; i++) {
        const time1 = new Date(userSubmissions[i].submittedAtISO).getTime();
        const time3 = new Date(userSubmissions[i+2].submittedAtISO).getTime();
        if ((time3 - time1) < (5 * 60 * 1000)) { // 3 submissions in 5 minutes
            return {
                rule: 'ruleSuspiciousMissionPattern',
                passed: false,
                severity: 'medium',
                details: `Múltiplas missões enviadas em um intervalo muito curto.`
            };
        }
    }

    return { rule: 'ruleSuspiciousMissionPattern', passed: true, severity: 'low', details: '' };
};

// Rule: Check-in streak is impossible.
export const ruleImpossibleStreak = (user: User): RuleResult => {
    if (user.weeklyCheckInStreak > 7) {
        return {
            rule: 'ruleImpossibleStreak',
            passed: false,
            severity: 'high',
            details: `Streak de ${user.weeklyCheckInStreak} é maior que 7.`
        };
    }
    const now = new Date();
    const joinedDate = user.joinedISO ? new Date(user.joinedISO) : now;
    const daysOnPlatform = Math.ceil((now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (user.weeklyCheckInStreak > daysOnPlatform + 1) { // +1 for buffer
         return {
            rule: 'ruleImpossibleStreak',
            passed: false,
            severity: 'high',
            details: `Streak de ${user.weeklyCheckInStreak} é maior que os dias na plataforma (${daysOnPlatform}).`
        };
    }

    return { rule: 'ruleImpossibleStreak', passed: true, severity: 'low', details: '' };
};

// Rule: User uses too many queueable items in sequence.
export const ruleQueueAbuse = (user: User, redeemedItems: RedeemedItem[]): RuleResult => {
    const userRedemptions = redeemedItems.filter(r => r.userId === user.id)
        .sort((a, b) => new Date(a.redeemedAtISO).getTime() - new Date(b.redeemedAtISO).getTime());

    // Filter for queueable items (heuristic based on name)
    const queueableRedemptions = userRedemptions.filter(r => r.itemName.toLowerCase().includes('microfone') || r.itemName.toLowerCase().includes('destaque'));
    
    if (queueableRedemptions.length < 3) {
        return { rule: 'ruleQueueAbuse', passed: true, severity: 'low', details: '' };
    }

    for (let i = 0; i < queueableRedemptions.length - 2; i++) {
        const time1 = new Date(queueableRedemptions[i].redeemedAtISO).getTime();
        const time3 = new Date(queueableRedemptions[i+2].redeemedAtISO).getTime();
        if ((time3 - time1) < (60 * 60 * 1000)) { // 3 queueable items in 1 hour
            return {
                rule: 'ruleQueueAbuse',
                passed: false,
                severity: 'medium',
                details: `Usuário resgatou múltiplos itens de fila em um curto período.`
            };
        }
    }

    return { rule: 'ruleQueueAbuse', passed: true, severity: 'low', details: '' };
};

// Rule: Cross-validate store purchases.
export const ruleStoreAnomaly = (user: User, redeemedItems: RedeemedItem[]): RuleResult => {
    const userRedemptions = redeemedItems.filter(r => r.userId === user.id);

    for (const redemption of userRedemptions) {
        if (redemption.coinsAfter < 0) {
             return {
                rule: 'ruleStoreAnomaly',
                passed: false,
                severity: 'high',
                details: `Resgate do item "${redemption.itemName}" resultou em saldo negativo (${redemption.coinsAfter}).`
            };
        }
        if (redemption.coinsBefore < redemption.itemPrice) {
             return {
                rule: 'ruleStoreAnomaly',
                passed: false,
                severity: 'medium',
                details: `Resgate do item "${redemption.itemName}" ocorreu com saldo insuficiente (${redemption.coinsBefore} < ${redemption.itemPrice}).`
            };
        }
    }
    
    return { rule: 'ruleStoreAnomaly', passed: true, severity: 'low', details: '' };
};
