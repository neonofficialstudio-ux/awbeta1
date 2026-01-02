// api/economySentinel/sentinelValidator.ts
import type { User, MissionSubmission, RedeemedItem, UsableItemQueueEntry, Mission, StoreItem } from '../../types';
import * as rules from './sentinelRules';

interface ValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const createReport = (): ValidationReport => ({ ok: true, errors: [], warnings: [] });

const processRuleResult = (report: ValidationReport, result: ReturnType<typeof rules.ruleXpBoundaries>) => {
    if (!result.passed) {
        report.ok = false;
        if (result.severity === 'high') {
            report.errors.push(result.details);
        } else {
            report.warnings.push(result.details);
        }
    }
};

export const validateUserEconomy = (user: User, submissionsToday: number): ValidationReport => {
    const report = createReport();
    processRuleResult(report, rules.ruleXpBoundaries(user));
    processRuleResult(report, rules.ruleLummiCoinIntegrity(user));
    processRuleResult(report, rules.ruleDailyMissionLimitAdherence(user, submissionsToday));
    return report;
};

export const validateSubmissionEconomy = (submission: MissionSubmission, user: User, mission: Mission): ValidationReport => {
    const report = createReport();
    processRuleResult(report, rules.ruleRewardMathCheck(submission, user, mission));
    return report;
};

export const validateStoreOperation = (purchase: RedeemedItem, user: User, item: StoreItem): ValidationReport => {
    const report = createReport();
    processRuleResult(report, rules.ruleStoreConsistency(purchase, user, item));
    return report;
};

export const validateQueues = (queueData: UsableItemQueueEntry[]): ValidationReport => {
    const report = createReport();
    processRuleResult(report, rules.ruleQueueIntegrity(queueData));
    return report;
};
