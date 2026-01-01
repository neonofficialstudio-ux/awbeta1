// api/adminMonitor/adminAlerts.ts

interface ValidationResult {
    ok: boolean;
    alerts: { rule: string; severity: "low" | "medium" | "high"; details: string }[];
}

export const generateAdminAlerts = (validationResult: ValidationResult) => {
    return validationResult.alerts;
};

export const isCritical = (validationResult: ValidationResult): boolean => {
    return validationResult.alerts.some(alert => alert.severity === 'high');
};
