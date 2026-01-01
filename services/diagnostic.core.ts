
import { getRepository } from "../api/database/repository.factory";
import { PLAN_HIERARCHY } from "../api/economy/economy-constants";
import { SanitizeString } from "../core/sanitizer.core"; // Updated import
import type { User } from "../types";

const repo = getRepository();

export type LogType = "economy" | "mission" | "event" | "queue" | "ranking" | "audit" | "telemetry" | "system" | "security";

export interface StandardLogEntry {
  id: string;
  type: LogType;
  userId?: string;
  data: any;
  createdAt: number;
  timestampISO: string;
}

interface DiagnosticReport {
  missingEndpoints: string[];
  inconsistentStates: string[];
  brokenLinks: string[];
  warnings: string[];
  errors: string[];
  totals: {
    logs: number;
    users: number;
    missions: number;
    events: number;
  }
}

const EXPECTED_BUSINESS_ERRORS = [
    "Você já enviou ou completou esta missão",
    "Você já enviou o máximo",
    "Check-in já realizado",
    "Saldo insuficiente",
    "Item esgotado",
    "Evento lotado",
    "Você já está participando",
    "Limite diário atingido",
    "Aguarde alguns segundos",
    "completou esta missão",
    "máximo",
    "Check-in",
    "Invalid credentials",
    "Credenciais inválidas"
];

function normalizeError(err: any) {
  if (typeof err === "string") return err;
  if (err?.message) return SanitizeString(err.message);
  return "Erro desconhecido";
}

export const DiagnosticCore = {
  // --- Core Logging ---
  record: (type: LogType, data: any, userId?: string): StandardLogEntry => {
    const entry: StandardLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      userId,
      data,
      createdAt: Date.now(),
      timestampISO: new Date().toISOString()
    };

    DiagnosticCore._routeToLegacyTables(entry);

    return entry;
  },

  // --- Sub-Modules (Facades) ---
  audit: {
    record: (data: any, userId?: string) => DiagnosticCore.record('audit', data, userId),
    getAll: () => repo.select("audit")
  },
  telemetry: {
    record: (data: any, userId?: string) => DiagnosticCore.record('telemetry', data, userId),
    getAll: () => repo.select("telemetry")
  },
  economy: {
    record: (data: any, userId?: string) => DiagnosticCore.record('economy', data, userId),
    getAll: () => repo.select("transactions")
  },
  missions: {
    record: (data: any, userId?: string) => DiagnosticCore.record('mission', data, userId),
    getAll: () => repo.select("submissions")
  },
  queue: {
    record: (data: any, userId?: string) => DiagnosticCore.record('queue', data, userId),
    getAll: () => repo.select("queue")
  },
  events: {
    record: (data: any, userId?: string) => DiagnosticCore.record('event', data, userId),
    getAll: () => repo.select("events") 
  },
  ranking: {
    record: (data: any, userId?: string) => DiagnosticCore.record('ranking', data, userId),
  },

  // --- Error Handling ---
  errors: {
    capture: (error: any, metadata: any = {}) => {
        const safeMsg = normalizeError(error);
        
        // HOTFIX V1.0: Filter Rate Limits
        if (safeMsg.startsWith("RATE_LIMIT")) {
             console.warn(`[DiagnosticCore] Traffic Control: ${safeMsg}`);
             return;
        }
        
        // Filter expected business logic errors
        if (EXPECTED_BUSINESS_ERRORS.some(expected => safeMsg.includes(expected))) {
            console.warn(`[DiagnosticCore] Aviso Controlado: ${safeMsg}`);
            return;
        }

        console.error("[DiagnosticCore] Error Captured:", safeMsg);
        
        const errorData = {
            message: safeMsg,
            stack: error?.stack,
            ...metadata
        };
        DiagnosticCore.record('system', { level: 'error', ...errorData });
    },
    getAll: () => repo.select("telemetry").filter((t: any) => t.category === 'error' || (t.data && t.data.level === 'error'))
  },

  // --- Inconsistency Detection ---
  warnings: {
    detect: () => {
        const warnings: string[] = [];
        const users = repo.select("users") as User[];
        const queue = repo.select("queue");
        const storeItems = repo.select("storeItems");

        users.forEach(u => {
            if (u.coins < 0) warnings.push(`User ${u.id} has negative coins: ${u.coins}`);
            if (u.xp < 0) warnings.push(`User ${u.id} has negative XP: ${u.xp}`);
            if (u.level < 1) warnings.push(`User ${u.id} has invalid level: ${u.level}`);
            
            if (!PLAN_HIERARCHY[u.plan] && PLAN_HIERARCHY[u.plan] !== 0) {
                warnings.push(`User ${u.id} has unknown plan: ${u.plan}`);
            }
        });

        queue.forEach((q: any) => {
            if (!q.userId) warnings.push(`Queue Item ${q.id} missing userId`);
        });

        storeItems.forEach((i: any) => {
            if (!i.id) warnings.push(`Store Item missing ID: ${i.name}`);
        });
        
        return warnings;
    }
  },

  // --- Export & Reporting ---
  export: () => {
      return {
          economy: DiagnosticCore.economy.getAll(),
          missions: DiagnosticCore.missions.getAll(),
          events: DiagnosticCore.events.getAll(),
          queue: DiagnosticCore.queue.getAll(),
          audit: DiagnosticCore.audit.getAll(),
          warnings: DiagnosticCore.warnings.detect(),
          errors: DiagnosticCore.errors.getAll()
      };
  },

  runReport: (): DiagnosticReport => {
      const warnings = DiagnosticCore.warnings.detect();
      const errors = DiagnosticCore.errors.getAll().map((e:any) => e.data?.message || "Unknown Error");
      
      const users = repo.select("users");
      const missions = repo.select("missions");
      const events = repo.select("events");
      const logsTotal = repo.select("audit").length + repo.select("telemetry").length;

      return {
          missingEndpoints: [],
          inconsistentStates: warnings,
          brokenLinks: [],
          warnings,
          errors,
          totals: {
              logs: logsTotal,
              users: users.length,
              missions: missions.length,
              events: events.length
          }
      };
  },

  // --- Internal Routing ---
  _routeToLegacyTables: (entry: StandardLogEntry) => {
      const { type, data, userId, id, timestampISO } = entry;
      
      if (type === 'audit' || type === 'system') {
          repo.insert("audit", {
              id,
              timestamp: timestampISO,
              userId,
              action: data.action || 'unknown',
              category: type,
              payload: data,
              metadata: { source: 'DiagnosticCore' }
          });
      }
      
      if (type === 'telemetry' || type === 'security') {
           repo.insert("telemetry", {
              id,
              timestamp: entry.createdAt,
              type: data.action || type,
              category: type,
              details: data,
              userId
           });
      }
      
      if (type === 'economy') {
           if (!data.transactionId) {
               repo.insert("telemetry", {
                   id,
                   timestamp: entry.createdAt,
                   type: 'economy_log',
                   category: 'economy',
                   details: data,
                   userId
               });
           }
      }
  }
};

if (typeof window !== 'undefined') {
    (window as any).__DIAGNOSTIC__ = DiagnosticCore;
}
