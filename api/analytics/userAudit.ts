// api/analytics/userAudit.ts
import type { User, MissionSubmission, RedeemedItem, CoinTransaction } from '../../types';

export const getUserActivityHeatmap = (userId: string, missionSubmissions: MissionSubmission[], redeemedItems: RedeemedItem[], coinTransactions: CoinTransaction[]) => {
    const heatmap: Record<string, number> = {};
    const activities = [
        ...missionSubmissions.filter(s => s.userId === userId).map(s => s.submittedAtISO),
        ...redeemedItems.filter(r => r.userId === userId).map(r => r.redeemedAtISO),
        ...coinTransactions.filter(t => t.userId === userId).map(t => t.dateISO),
    ];

    for (const timestamp of activities) {
        const date = new Date(timestamp).toISOString().split('T')[0];
        heatmap[date] = (heatmap[date] || 0) + 1;
    }
    return heatmap;
};

export const detectInactiveUsers = (allUsers: User[], missionSubmissions: MissionSubmission[]) => {
    const inactiveUserIds: string[] = [];
    const now = new Date().getTime();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    for (const user of allUsers) {
        if (user.role !== 'user') continue;
        
        const lastSubmission = missionSubmissions
            .filter(s => s.userId === user.id)
            .sort((a, b) => new Date(b.submittedAtISO).getTime() - new Date(a.submittedAtISO).getTime())[0];

        const lastActivityTimestamp = lastSubmission ? new Date(lastSubmission.submittedAtISO).getTime() : new Date(user.joinedISO || 0).getTime();

        if (lastActivityTimestamp < sevenDaysAgo) {
            inactiveUserIds.push(user.id);
        }
    }
    return inactiveUserIds;
};

export const detectSuddenSpikes = (allUsers: User[], missionSubmissions: MissionSubmission[]) => {
    const spikedUserIds: string[] = [];
    const now = new Date().getTime();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;

    for (const user of allUsers) {
        if (user.role !== 'user') continue;

        const recentSubmissions = missionSubmissions.filter(s => s.userId === user.id && new Date(s.submittedAtISO).getTime() >= thirtyDaysAgo);
        
        const activityLast2Days = recentSubmissions.filter(s => new Date(s.submittedAtISO).getTime() >= twoDaysAgo).length;
        const totalActivityLast30Days = recentSubmissions.length;
        
        if (totalActivityLast30Days < 5) continue; // Not enough data for a baseline

        const averageDailyActivity = (totalActivityLast30Days - activityLast2Days) / 28;
        
        // Spike if activity in the last 2 days is more than 3x the daily average and at least 3 submissions
        if (activityLast2Days > 0 && (averageDailyActivity === 0 || (activityLast2Days / 2) > averageDailyActivity * 3) && activityLast2Days >= 3) {
            spikedUserIds.push(user.id);
        }
    }

    return spikedUserIds;
};
