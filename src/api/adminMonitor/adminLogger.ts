// api/adminMonitor/adminLogger.ts

interface LogEntry {
  timestamp: string;
  type: string;
  payloadSummary: Record<string, any>;
  resultSummary?: Record<string, any>;
}

const adminLogs: LogEntry[] = [];

export const logAdminAction = (type: string, payload: object, result?: object) => {
    const payloadSummary: Record<string, any> = {};
    for (const key in payload) {
        const value = (payload as any)[key];
        if (typeof value !== 'object' || value === null) {
            payloadSummary[key] = value;
        } else if (Array.isArray(value)) {
            payloadSummary[key] = `Array[${value.length}]`;
        } else {
             payloadSummary[key] = `Object with keys: ${Object.keys(value).join(', ')}`;
        }
    }

    const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        type,
        payloadSummary,
        resultSummary: result,
    };

    adminLogs.unshift(logEntry);
    if (adminLogs.length > 200) {
        adminLogs.pop();
    }
};

export const loadAdminLogs = (): LogEntry[] => {
    return [...adminLogs];
};
