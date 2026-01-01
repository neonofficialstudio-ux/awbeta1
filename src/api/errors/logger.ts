
// api/errors/logger.ts
import { addPerformanceLog } from '../logs/performance';

export type LogLevel = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorLogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    meta?: any;
}

// In-memory log store
export const errorLogs: ErrorLogEntry[] = [];

const log = (level: LogLevel, message: string, meta?: any) => {
    const logEntry: ErrorLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        level,
        message,
        meta,
    };
    errorLogs.unshift(logEntry);
    // Keep the log from growing indefinitely in a mock environment
    if (errorLogs.length > 500) {
        errorLogs.pop();
    }

    // INTEGRATION: Forward critical/error logs to performance monitoring
    if (level === 'error' || level === 'critical') {
        addPerformanceLog({
            type: 'error',
            source: 'error_logger',
            details: { level, message, meta }
        });
    }
};

export const logInfo = (message: string, meta?: any) => log('info', message, meta);
export const logWarning = (message: string, meta?: any) => log('warning', message, meta);
export const logError = (message: string, meta?: any) => log('error', message, meta);
export const logCritical = (message: string, meta?: any) => log('critical', message, meta);
