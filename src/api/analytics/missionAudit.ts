// api/analytics/missionAudit.ts
import type { User, MissionSubmission, Mission, SubmissionStatus } from '../../types';
import { getDailyMissionLimit, BASE_MISSION_REWARDS } from '../economy/economy';

export const getMissionFrequencyReport = (allUsers: User[], missionSubmissions: MissionSubmission[]) => {
    const report: Record<string, { dailySubmissions: Record<string, number>, limitHits: string[], potentialOverLimitAttempts: string[] }> = {};

    for (const user of allUsers) {
        if (user.role !== 'user') continue;

        const userSubmissions = missionSubmissions.filter(s => s.userId === user.id);
        const dailySubmissions: Record<string, number> = {};
        
        for (const sub of userSubmissions) {
            const date = new Date(sub.submittedAtISO).toISOString().split('T')[0];
            dailySubmissions[date] = (dailySubmissions[date] || 0) + 1;
        }
        
        const limit = getDailyMissionLimit(user.plan);
        const limitHits: string[] = [];
        const potentialOverLimitAttempts: string[] = [];

        if (limit !== null) {
            for (const date in dailySubmissions) {
                if (dailySubmissions[date] >= limit) {
                    limitHits.push(date);
                    // Proxy for "attempts to exceed": check if there are rejected missions on a day the limit was hit
                    const rejectedOnHitDay = userSubmissions.some(s => new Date(s.submittedAtISO).toISOString().startsWith(date) && s.status === 'rejected');
                    if (rejectedOnHitDay) {
                        potentialOverLimitAttempts.push(date);
                    }
                }
            }
        }

        if (Object.keys(dailySubmissions).length > 0) {
            report[user.id] = { dailySubmissions, limitHits, potentialOverLimitAttempts };
        }
    }
    return report;
};

export const getPendingVsApprovedRatio = (missionSubmissions: MissionSubmission[]) => {
    const counts = missionSubmissions.reduce((acc, sub) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1;
        return acc;
    }, {} as Record<SubmissionStatus, number>);
    
    const total = missionSubmissions.length;
    const approved = counts.approved || 0;
    const pending = counts.pending || 0;
    const rejected = counts.rejected || 0;

    return {
        total,
        approved,
        pending,
        rejected,
        approvalRate: (approved + rejected) > 0 ? (approved / (approved + rejected)) * 100 : 0,
    };
};

export const getMissionTypeDistribution = (missions: Mission[]) => {
    const durationCounts = { curta: 0, media: 0, longa: 0 };
    const typeCounts: Record<string, number> = {};

    for (const mission of missions) {
        if (mission.xp === BASE_MISSION_REWARDS.curta.xp) durationCounts.curta++;
        else if (mission.xp === BASE_MISSION_REWARDS.media.xp) durationCounts.media++;
        else if (mission.xp === BASE_MISSION_REWARDS.longa.xp) durationCounts.longa++;
        
        typeCounts[mission.type] = (typeCounts[mission.type] || 0) + 1;
    }

    return { durationCounts, typeCounts };
};
