
// api/metrics/missionMetrics.ts
import type { Mission, MissionSubmission, User } from '../../types';
import { getDailyMissionLimit } from '../economy/economy';

/**
 * Calculates the approval rate of reviewed missions.
 * @param submissions - All mission submissions.
 * @returns The approval rate as a percentage.
 */
export const calculateMissionApprovalRate = (submissions: MissionSubmission[]) => {
    const reviewed = submissions.filter(s => s.status === 'approved' || s.status === 'rejected');
    if (reviewed.length === 0) return 0;
    const approved = reviewed.filter(s => s.status === 'approved').length;
    return (approved / reviewed.length) * 100;
};

/**
 * Calculates the rejection rate of reviewed missions.
 * @param submissions - All mission submissions.
 * @returns The rejection rate as a percentage.
 */
export const calculateMissionRejectionRate = (submissions: MissionSubmission[]) => {
    const reviewed = submissions.filter(s => s.status === 'approved' || s.status === 'rejected');
    if (reviewed.length === 0) return 0;
    const rejected = reviewed.filter(s => s.status === 'rejected').length;
    return (rejected / reviewed.length) * 100;
};

/**
 * Counts the occurrences of each mission type.
 * @param missions - All available missions.
 * @returns An object with counts for each mission type.
 */
export const getMostCommonMissionTypes = (missions: Mission[]) => {
    return missions.reduce((acc, mission) => {
        acc[mission.type] = (acc[mission.type] || 0) + 1;
        return acc;
    }, {} as Record<Mission['type'], number>);
};

/**
 * Detects various anomalies related to missions.
 * @param submissions - All mission submissions.
 * @param missions - All available missions.
 * @param users - All users.
 * @returns An object containing lists of different types of anomalies.
 */
export const detectMissionAnomalies = (submissions: MissionSubmission[], missions: Mission[], users: User[]) => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const unreviewedSubmissions = submissions.filter(s => 
        s.status === 'pending' && new Date(s.submittedAtISO) < twoDaysAgo
    ).map(s => ({ submissionId: s.id, userId: s.userId, missionTitle: s.missionTitle, submittedAt: s.submittedAtISO }));
    
    const expiredActiveMissions = missions.filter(m => 
        m.status === 'active' && new Date(m.deadline) < now
    ).map(m => ({ missionId: m.id, title: m.title, deadline: m.deadline }));

    const usersExceedingLimit: { userId: string, name: string, date: string, count: number, limit: number | null }[] = [];
    const submissionsByDayByUser: Record<string, Record<string, number>> = {};

    submissions.forEach(sub => {
        const date = new Date(sub.submittedAtISO).toISOString().split('T')[0];
        if (!submissionsByDayByUser[sub.userId]) {
            submissionsByDayByUser[sub.userId] = {};
        }
        submissionsByDayByUser[sub.userId][date] = (submissionsByDayByUser[sub.userId][date] || 0) + 1;
    });

    users.forEach(user => {
        const limit = getDailyMissionLimit(user.plan);
        if (limit === null) return;
        
        const userSubmissions = submissionsByDayByUser[user.id] || {};
        for (const date in userSubmissions) {
            if (userSubmissions[date] > limit) {
                usersExceedingLimit.push({ userId: user.id, name: user.name, date, count: userSubmissions[date], limit });
            }
        }
    });

    return {
        unreviewedSubmissions,
        expiredActiveMissions,
        usersExceedingLimit,
    };
};
