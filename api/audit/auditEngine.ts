
import type { User, CoinTransaction, MissionSubmission, RedeemedItem } from '../../types';
import * as rules from './auditRules';

interface AuditData {
    transactions: CoinTransaction[];
    submissions: MissionSubmission[];
    redeemedItems: RedeemedItem[];
}

export interface AuditResult {
    userId: string;
    resultSummary: {
        passedRules: number;
        failedRules: number;
        riskLevel: "safe" | "attention" | "danger";
    };
    details: ReturnType<typeof rules.ruleRapidLevelGrowth>[]; // Use one rule's return type as a template
}

export const runAuditForUser = (user: User, allData: AuditData): AuditResult => {
    const allRules = [
        rules.ruleRapidLevelGrowth(user),
        rules.ruleUnusualLCGain(user, allData.transactions),
        rules.ruleSuspiciousMissionPattern(user, allData.submissions),
        rules.ruleImpossibleStreak(user),
        rules.ruleQueueAbuse(user, allData.redeemedItems),
        rules.ruleStoreAnomaly(user, allData.redeemedItems),
    ];

    const failedRules = allRules.filter(r => !r.passed);
    const passedRules = allRules.length - failedRules.length;

    let riskLevel: "safe" | "attention" | "danger" = "safe";
    if (failedRules.length > 0) {
        const hasHighSeverity = failedRules.some(r => r.severity === 'high');
        if (hasHighSeverity) {
            riskLevel = 'danger';
        } else {
            riskLevel = 'attention';
        }
    }

    return {
        userId: user.id,
        resultSummary: {
            passedRules,
            failedRules: failedRules.length,
            riskLevel,
        },
        details: allRules,
    };
};

export const runAuditForAllUsers = (users: User[], allData: AuditData): AuditResult[] => {
    return users
        .filter(u => u.role === 'user')
        .map(user => runAuditForUser(user, allData));
};
