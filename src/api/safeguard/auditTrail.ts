// api/safeguard/auditTrail.ts

type AuditEvent = {
    timestamp: string;
    category: 'ECONOMY' | 'MISSION' | 'QUEUE';
    eventType: string;
    details: Record<string, any>;
};

const auditLog: AuditEvent[] = [];

const logEvent = (category: AuditEvent['category'], eventType: string, details: Record<string, any>) => {
    auditLog.unshift({
        timestamp: new Date().toISOString(),
        category,
        eventType,
        details,
    });
    // Keep the log from growing indefinitely in a mock environment
    if (auditLog.length > 200) {
        auditLog.pop();
    }
};

export const logEconomyEvent = (userId: string, type: 'earn' | 'spend', delta: number, source: string) => {
    logEvent('ECONOMY', type, { userId, delta, source });
};

export const logMissionEvent = (missionId: string, submissionId: string, status: string) => {
    logEvent('MISSION', 'status_change', { missionId, submissionId, status });
};

// FIX: Widened the type of the 'status' parameter to string to allow for more event types like 'failed_validation'.
export const logQueueEvent = (itemId: string, queueType: 'item' | 'spotlight', status: string) => {
    logEvent('QUEUE', status, { itemId, queueType });
};

export const getAuditLog = () => [...auditLog];