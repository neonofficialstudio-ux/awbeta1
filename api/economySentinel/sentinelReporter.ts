// api/economySentinel/sentinelReporter.ts

interface ScanResult {
  globalRiskLevel: "stable" | "attention" | "critical";
  userEconomyReports: any[];
  storeReports: any[];
  queueReports: any[];
  submissionReports: any[];
}

export const generateEconomyHealthReport = (scanResult: ScanResult) => {
    const riskyUsers = new Set<string>();
    scanResult.userEconomyReports.forEach(r => riskyUsers.add(r.userId));
    scanResult.storeReports.forEach(r => {
        // In a real app, we'd find the user from the purchaseId
    });

    const suspiciousPatterns = [
        ...scanResult.userEconomyReports.flatMap(r => r.errors.map((e: string) => ({ type: 'User Economy', detail: e, userId: r.userId }))),
        ...scanResult.storeReports.flatMap(r => r.errors.map((e: string) => ({ type: 'Store', detail: e, purchaseId: r.purchaseId }))),
        ...scanResult.submissionReports.flatMap(r => r.errors.map((e: string) => ({ type: 'Mission Reward', detail: e, submissionId: r.submissionId }))),
        ...scanResult.queueReports.flatMap(r => r.errors.map((e: string) => ({ type: 'Queue', detail: e }))),
    ];
    
    return {
        overallStatus: scanResult.globalRiskLevel,
        riskyUserCount: riskyUsers.size,
        totalIssues: suspiciousPatterns.length,
        suspiciousPatterns,
    };
};

export const generateCriticalAlerts = (scanResult: ScanResult) => {
    const criticalIssues = [
        ...scanResult.userEconomyReports.flatMap(r => r.errors.map((e: string) => `User ${r.userId}: ${e}`)),
        ...scanResult.storeReports.flatMap(r => r.errors.map((e: string) => `Purchase ${r.purchaseId}: ${e}`)),
    ];
    
    return criticalIssues;
};
