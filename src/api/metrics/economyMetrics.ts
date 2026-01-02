
// api/metrics/economyMetrics.ts
import type { User, CoinTransaction } from '../../types';
import { PLAN_MULTIPLIERS } from '../economy/economy';

/**
 * Calculates the total Lummi Coins (LC) generated and spent on the current day.
 * @param users - Not directly used but included for potential future logic.
 * @param allTransactions - The complete log of all coin transactions.
 * @returns A summary of the day's economy.
 */
export const calculateDailyEconomySummary = (users: User[], allTransactions: CoinTransaction[]) => {
    const today = new Date().toISOString().split('T')[0];
    const dailyTransactions = allTransactions.filter(t => (t.dateISO || "").startsWith(today));

    const lcGenerated = dailyTransactions
        .filter(t => t.type === 'earn')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const lcSpent = dailyTransactions
        .filter(t => t.type === 'spend')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
        date: today,
        lcGenerated,
        lcSpent,
        netBalance: lcGenerated - lcSpent,
    };
};

/**
 * Groups users into level brackets to show distribution.
 * @param users - All users in the system.
 * @returns An object with counts for each level bracket.
 */
export const calculateLevelDistribution = (users: User[]) => {
    const distribution = {
        '1-5': 0,
        '6-10': 0,
        '11-20': 0,
        '21-30': 0,
        '31+': 0,
    };

    users.filter(u => u.role === 'user').forEach(user => {
        if (user.level <= 5) distribution['1-5']++;
        else if (user.level <= 10) distribution['6-10']++;
        else if (user.level <= 20) distribution['11-20']++;
        else if (user.level <= 30) distribution['21-30']++;
        else distribution['31+']++;
    });

    return distribution;
};

/**
 * Detects economic anomalies such as excessive coin gain or rapid progression.
 * @param users - All users in the system.
 * @param allTransactions - The complete log of all coin transactions.
 * @returns An array of alerts for suspicious user activity.
 */
export const detectEconomyAnomalies = (users: User[], allTransactions: CoinTransaction[]) => {
    const alerts: { userId: string; reason: string; details: string }[] = [];
    const now = new Date().getTime();

    for (const user of users) {
        if (user.role !== 'user') continue;

        // Anomaly 1: Excessive gain in a short period
        const recentTransactions = allTransactions.filter(t => 
            t.userId === user.id && 
            new Date(t.dateISO).getTime() > now - (24 * 60 * 60 * 1000) // last 24h
        );
        const recentGain = recentTransactions
            .filter(t => t.type === 'earn')
            .reduce((sum, t) => sum + t.amount, 0);
        
        if (recentGain > 5000) { // Threshold for abnormal gain
            alerts.push({
                userId: user.id,
                reason: 'Ganho excessivo de LC',
                details: `Usuário ${user.name} ganhou ${recentGain} LC nas últimas 24h.`
            });
        }

        // Anomaly 2: Rapid level progression
        const joinedDate = user.joinedISO ? new Date(user.joinedISO).getTime() : now;
        const daysOnPlatform = Math.max(1, (now - joinedDate) / (1000 * 60 * 60 * 24));
        const levelsGainedPerDay = (user.level - 1) / daysOnPlatform;

        if (user.level > 10 && levelsGainedPerDay > 2) { // Threshold for rapid progression
             alerts.push({
                userId: user.id,
                reason: 'Evolução de nível muito rápida',
                details: `Usuário ${user.name} (nível ${user.level}) está progredindo a uma taxa de ${levelsGainedPerDay.toFixed(2)} níveis/dia.`
            });
        }
    }
    return alerts;
};
