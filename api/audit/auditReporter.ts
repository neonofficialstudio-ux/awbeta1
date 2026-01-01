
import type { AuditResult } from './auditEngine';

export const summarizeAudit = (allAudits: AuditResult[]) => {
    const highRiskUsers = allAudits
        .filter(a => a.resultSummary.riskLevel === 'danger')
        .map(a => ({ userId: a.userId, failedRules: a.resultSummary.failedRules }));
    
    const attentionUsers = allAudits
        .filter(a => a.resultSummary.riskLevel === 'attention')
        .map(a => ({ userId: a.userId, failedRules: a.resultSummary.failedRules }));

    const violatedRulesCount = allAudits.reduce((acc, audit) => {
        audit.details.forEach(detail => {
            if (!detail.passed) {
                acc[detail.rule] = (acc[detail.rule] || 0) + 1;
            }
        });
        return acc;
    }, {} as Record<string, number>);

    const mostViolatedRules = Object.entries(violatedRulesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return {
        totalUsersAudited: allAudits.length,
        highRiskUsers,
        attentionUsers,
        mostViolatedRules,
    };
};

export const detectSystemWideAnomalies = (allAudits: AuditResult[]) => {
    const anomalies: string[] = [];
    
    const rapidGrowthCount = allAudits.filter(a => a.details.find(d => d.rule === 'ruleRapidLevelGrowth' && !d.passed)).length;
    if (allAudits.length > 0 && rapidGrowthCount / allAudits.length > 0.1) { // More than 10% of users have rapid growth
        anomalies.push("Muitos usuários com evolução de nível suspeita. Verificar economia de XP.");
    }

    const unusualGainCount = allAudits.filter(a => a.details.find(d => d.rule === 'ruleUnusualLCGain' && !d.passed)).length;
    if (allAudits.length > 0 && unusualGainCount / allAudits.length > 0.05) { // More than 5% of users have unusual LC gain
        anomalies.push("Muitos usuários com ganho de LC anormal. Verificar fontes de moedas.");
    }
    
    return {
        detectedAnomalies: anomalies
    };
};
