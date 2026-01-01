// api/analytics/economyAudit.ts
import type { User, MissionSubmission, Mission, CoinTransaction, MissionCompletionLog } from '../../types';
import { getDailyMissionLimit, calculateMissionRewards } from '../economy/economy';

export const getUserEconomyBalance = (userId: string, allTransactions: CoinTransaction[], missionCompletionLog: MissionCompletionLog[]) => {
    const userTransactions = allTransactions.filter(t => t.userId === userId);
    
    const totalLCEarned = userTransactions.filter(t => t.type === 'earn').reduce((sum, t) => sum + t.amount, 0);
    const totalLCSpent = userTransactions.filter(t => t.type === 'spend').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalXPEarned = missionCompletionLog.filter(l => l.userId === userId).reduce((sum, l) => sum + l.xpGained, 0);

    // Basic coherence check
    const isCoherent = totalLCEarned >= totalLCSpent; // A user should not spend more than they earned in total.

    return {
        userId,
        totalLCEarned,
        totalLCSpent,
        netLC: totalLCEarned - totalLCSpent,
        totalXPEarned,
        isCoherent,
    };
};

// This is a complex heuristic. I'll make a simplified version.
export const detectAbnormalLCGain = (allUsers: User[], allTransactions: CoinTransaction[]) => {
    const abnormalUsers: string[] = [];
    for (const user of allUsers) {
        if (user.role !== 'user') continue;
        const userTransactions = allTransactions.filter(t => t.userId === user.id && t.type === 'earn');
        const totalEarned = userTransactions.reduce((sum, t) => sum + t.amount, 0);

        // Very simple heuristic: if a user earned more than 10000 LC in a single day, flag them.
        const dailyEarnings: Record<string, number> = {};
        for (const t of userTransactions) {
            const date = new Date(t.dateISO).toISOString().split('T')[0];
            dailyEarnings[date] = (dailyEarnings[date] || 0) + t.amount;
        }

        if (Object.values(dailyEarnings).some(dailyTotal => dailyTotal > 10000)) {
            abnormalUsers.push(user.id);
        }
    }
    return abnormalUsers;
};


export const detectAbnormalMissionPatterns = (missionSubmissions: MissionSubmission[], missions: Mission[]) => {
    const patterns: Record<string, { onlyLongMissions?: boolean; repetitiveSubmissions?: boolean; highFrequencySubmissions?: boolean }> = {};
    const submissionsByUser = missionSubmissions.reduce((acc, sub) => {
        if (!acc[sub.userId]) acc[sub.userId] = [];
        acc[sub.userId].push(sub);
        return acc;
    }, {} as Record<string, MissionSubmission[]>);

    for (const userId in submissionsByUser) {
        const userSubmissions = submissionsByUser[userId];
        const userPatterns: any = {};

        // Check for only long missions
        const missionDurations = userSubmissions.map(sub => {
            const mission = missions.find(m => m.id === sub.missionId);
            if (!mission) return null;
            if (mission.xp > 300) return 'longa';
            if (mission.xp > 200) return 'media';
            return 'curta';
        }).filter(Boolean);

        if (missionDurations.length > 5 && missionDurations.every(d => d === 'longa')) {
            userPatterns.onlyLongMissions = true;
        }

        // Check for high frequency
        const submissionTimestamps = userSubmissions.map(s => new Date(s.submittedAtISO).getTime()).sort((a,b) => a - b);
        for (let i = 0; i < submissionTimestamps.length - 2; i++) {
            // 3 submissions within 5 minutes
            if (submissionTimestamps[i+2] - submissionTimestamps[i] < 5 * 60 * 1000) {
                userPatterns.highFrequencySubmissions = true;
                break;
            }
        }
        
        if (Object.keys(userPatterns).length > 0) {
            patterns[userId] = userPatterns;
        }
    }

    return patterns;
};
