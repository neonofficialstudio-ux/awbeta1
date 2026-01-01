
import { getRepository } from "../database/repository.factory";
import { DiagnosticCore } from "../../services/diagnostic.core";

const repo = getRepository();

export interface LogEntry {
  id: string;
  timestamp: string;
  userId?: string;
  action: string;
  category: 'system' | 'user' | 'admin' | 'economy' | 'security' | 'queue';
  payload: any;
  metadata?: any;
}

export const LogEngineV4 = {
  log: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    // Redirect to Diagnostic Core for standardized processing & storage
    // DiagnosticCore handles 'audit' or 'system' or 'economy' mapping to legacy tables internally
    
    let coreType: 'audit' | 'economy' | 'security' | 'system' = 'audit';
    
    if (entry.category === 'economy') coreType = 'economy';
    else if (entry.category === 'security') coreType = 'security';
    else if (entry.category === 'system') coreType = 'system';

    const result = DiagnosticCore.record(coreType, {
        action: entry.action,
        payload: entry.payload,
        metadata: entry.metadata,
        originalCategory: entry.category
    }, entry.userId);

    // Construct compatible LogEntry to return for legacy callers
    return {
        id: result.id,
        timestamp: result.timestampISO,
        userId: result.userId,
        action: entry.action,
        category: entry.category,
        payload: entry.payload,
        metadata: entry.metadata
    };
  },

  getLogs: (filters?: { category?: string; userId?: string; limit?: number }) => {
    // Read from Diagnostic Core unified view (mapped to audit table primarily for legacy admin panel)
    // Note: This still reads from repo('audit') which DiagnosticCore writes to via _routeToLegacyTables
    let logs = repo.select("audit") as LogEntry[];
    
    if (filters?.category) {
      logs = logs.filter(l => l.category === filters.category);
    }
    if (filters?.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }
    
    // Sort descending
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (filters?.limit) {
      return logs.slice(0, filters.limit);
    }
    
    return logs;
  },

  clearLogs: () => {
      // Only available in mock mode
      const logs = repo.select("audit");
      logs.length = 0;
      return true;
  }
};
