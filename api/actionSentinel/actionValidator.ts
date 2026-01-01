// api/actionSentinel/actionValidator.ts
import type { Mission, MissionSubmission } from '../../types';
import * as rules from './actionRules';

interface ValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const createReport = (): ValidationReport => ({ ok: true, errors: [], warnings: [] });

const processRuleResult = (report: ValidationReport, result: ReturnType<typeof rules.ruleValidMissionFormat>) => {
    if (!result.passed) {
        report.ok = false;
        if (result.severity === 'high') {
            report.errors.push(result.details);
        } else {
            report.warnings.push(result.details);
        }
    }
};

export const validateMissionCreation = (mission: Mission): ValidationReport => {
    const report = createReport();
    processRuleResult(report, rules.ruleValidMissionFormat(mission));
    processRuleResult(report, rules.ruleMissionAdminCreation(mission));
    return report;
};

export const validateUserSubmission = (submission: MissionSubmission, mission: Mission, allSubmissions: MissionSubmission[]): ValidationReport => {
    const report = createReport();
    processRuleResult(report, rules.ruleValidUserSubmission(submission, mission));
    processRuleResult(report, rules.ruleSocialActionSafety(mission));
    processRuleResult(report, rules.ruleAntiBypass(submission, allSubmissions));
    return report;
};
