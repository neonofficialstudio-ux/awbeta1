
import { getRepository } from "../database/repository.factory";

const repo = getRepository();

export interface AuditLogEntry {
  id: string;
  actor: "admin" | "system" | "user";
  event: string;
  targetId?: string;
  details?: any;
  timestamp: number;
}

export function logAuditEvent(entry: Omit<AuditLogEntry, "id" | "timestamp">) {
  const logEntry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    ...entry
  };
  
  repo.insert("audit", logEntry);
  return logEntry;
}

export function getAuditLogs(limit = 100) {
  return repo.select("audit").slice(0, limit);
}
