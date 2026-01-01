
// api/economySentinel/sentinelEngine.ts
import type { User, Mission, MissionSubmission, RedeemedItem, StoreItem, UsableItemQueueEntry } from '../../types';
import * as validator from './sentinelValidator';

interface FullScanResult {
  globalRiskLevel: "stable" | "attention" | "critical";
  userEconomyReports: any[];
  storeReports: any[];
  queueReports: any[];
  submissionReports: any[];
}

export const runFullEconomyScan = (
    allUsers: User[],
    allMissions: Mission[],
    allSubmissions: MissionSubmission[],
    allPurchases: RedeemedItem[],
    allStoreItems: StoreItem[],
    queueData: UsableItemQueueEntry[]
): FullScanResult => {
    const userEconomyReports: any[] = [];
    const storeReports: any[] = [];
    const submissionReports: any[] = [];
    
    // Validate Users
    const today = new Date().toISOString().split('T')[0];
    allUsers.forEach(user => {
        const submissionsToday = allSubmissions.filter(s => s.userId === user.id && (s.submittedAtISO || "").startsWith(today)).length;
        const report = validator.validateUserEconomy(user, submissionsToday);
        if (!report.ok) {
            userEconomyReports.push({ userId: user.id, ...report });
        }
    });

    // Validate Store Purchases
    allPurchases.forEach(purchase => {
        const user = allUsers.find(u => u.id === purchase.userId);
        const item = allStoreItems.find(i => i.id === purchase.itemId);
        if (user && item) {
            const report = validator.validateStoreOperation(purchase, user, item);
            if (!report.ok) {
                storeReports.push({ purchaseId: purchase.id, ...report });
            }
        }
    });

    // Validate Submissions (conceptual)
    allSubmissions.forEach(submission => {
        const user = allUsers.find(u => u.id === submission.userId);
        const mission = allMissions.find(m => m.id === submission.missionId);
        if (user && mission && submission.status === 'approved') {
            const report = validator.validateSubmissionEconomy(submission, user, mission);
            if (!report.ok) {
                submissionReports.push({ submissionId: submission.id, ...report });
            }
        }
    });
    
    // Validate Queues
    const queueReports = [validator.validateQueues(queueData)];

    const totalErrors = userEconomyReports.reduce((sum, r) => sum + r.errors.length, 0) +
                        storeReports.reduce((sum, r) => sum + r.errors.length, 0) +
                        submissionReports.reduce((sum, r) => sum + r.errors.length, 0) +
                        queueReports.reduce((sum, r) => sum + r.errors.length, 0);

    const totalWarnings = userEconomyReports.reduce((sum, r) => sum + r.warnings.length, 0) +
                          storeReports.reduce((sum, r) => sum + r.warnings.length, 0) +
                          submissionReports.reduce((sum, r) => sum + r.warnings.length, 0) +
                          queueReports.reduce((sum, r) => sum + r.warnings.length, 0);

    let globalRiskLevel: "stable" | "attention" | "critical" = "stable";
    if (totalErrors > 0) {
        globalRiskLevel = 'critical';
    } else if (totalWarnings > 0) {
        globalRiskLevel = 'attention';
    }

    return {
        globalRiskLevel,
        userEconomyReports,
        storeReports,
        queueReports,
        submissionReports,
    };
};

export const runEconomyCheckForUser = (user: User, allSubmissions: MissionSubmission[]) => {
    const today = new Date().toISOString().split('T')[0];
    const submissionsToday = allSubmissions.filter(s => s.userId === user.id && (s.submittedAtISO || "").startsWith(today)).length;
    return validator.validateUserEconomy(user, submissionsToday);
};
