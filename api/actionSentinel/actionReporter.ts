// api/actionSentinel/actionReporter.ts

interface ScanResult {
  globalRiskLevel: "stable" | "attention" | "critical";
  missionReports: { missionId: string; errors: string[]; warnings: string[] }[];
  submissionReports: { submissionId: string; errors: string[]; warnings: string[] }[];
}

export const generateActionHealthReport = (scanResult: ScanResult) => {
    return {
        overallStatus: scanResult.globalRiskLevel,
        inconsistentMissions: scanResult.missionReports,
        invalidSubmissions: scanResult.submissionReports,
    };
};

export const generateCriticalActionAlerts = (scanResult: ScanResult) => {
    const missionErrors = scanResult.missionReports
        .filter(r => r.errors.length > 0)
        .map(r => `Missão ID ${r.missionId}: ${r.errors.join(', ')}`);
        
    const submissionErrors = scanResult.submissionReports
        .filter(r => r.errors.length > 0)
        .map(r => `Submissão ID ${r.submissionId}: ${r.errors.join(', ')}`);

    return [
        ...missionErrors,
        ...submissionErrors,
    ];
};
