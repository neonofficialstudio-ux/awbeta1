// api/actionSentinel/actionEngine.ts
import type { Mission, MissionSubmission } from '../../types';
import * as validator from './actionValidator';

interface FullScanResult {
  globalRiskLevel: "stable" | "attention" | "critical";
  missionReports: any[];
  submissionReports: any[];
}

export const runMissionValidation = (mission: Mission) => {
    return validator.validateMissionCreation(mission);
};

export const runSubmissionValidation = (submission: MissionSubmission, mission: Mission, allSubmissions: MissionSubmission[]) => {
    return validator.validateUserSubmission(submission, mission, allSubmissions);
};

export const runFullActionScan = (allMissions: Mission[], allSubmissions: MissionSubmission[]): FullScanResult => {
    const missionReports: any[] = [];
    const submissionReports: any[] = [];

    allMissions.forEach(mission => {
        const report = validator.validateMissionCreation(mission);
        if (!report.ok) {
            missionReports.push({ missionId: mission.id, ...report });
        }
    });

    allSubmissions.forEach(submission => {
        const mission = allMissions.find(m => m.id === submission.missionId);
        if (mission) {
            const report = validator.validateUserSubmission(submission, mission, allSubmissions);
            if (!report.ok) {
                submissionReports.push({ submissionId: submission.id, ...report });
            }
        }
    });

    const totalErrors = missionReports.reduce((sum, r) => sum + r.errors.length, 0) +
                        submissionReports.reduce((sum, r) => sum + r.errors.length, 0);
    
    let globalRiskLevel: "stable" | "attention" | "critical" = "stable";
    if (totalErrors > 0) {
        globalRiskLevel = 'critical';
    } else if (missionReports.length > 0 || submissionReports.length > 0) {
        globalRiskLevel = 'attention';
    }

    return {
        globalRiskLevel,
        missionReports,
        submissionReports,
    };
};
