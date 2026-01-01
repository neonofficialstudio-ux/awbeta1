
import { logger } from "../core/logger";
import { DiagnosticCore } from "./diagnostic.core";

// Recursion Guard
let isLogging = false;

// Phase 10: Simple Risk Scoring (InMemory)
const userRiskScores: Record<string, number> = {};

export const TelemetryPRO = {
  event: (name: string, data: object = {}) => {
    if (isLogging) return { timestamp: Date.now(), event: name, data };
    
    try {
        isLogging = true;
        logger.info("[TLM-PRO]", name, data);
        
        // Analyze event for Risk
        if (name === 'mission_spam' || name === 'suspicious_velocity') {
            const uid = (data as any).userId;
            if (uid) {
                userRiskScores[uid] = (userRiskScores[uid] || 0) + 10;
            }
        }
        
        DiagnosticCore.record('telemetry', { action: name, ...data }, (data as any).userId);

    } catch (e) {
        console.error("[TelemetryPRO] Failed to log event", e);
    } finally {
        isLogging = false;
    }

    return {
      timestamp: Date.now(),
      event: name,
      data,
    };
  },

  anomaly: (tag: string, context: object = {}) => {
    try {
        logger.warn("[ANOMALY DETECTED]", tag, context);
        
        // High Risk Trigger
        const uid = (context as any).userId;
        if (uid) {
             userRiskScores[uid] = (userRiskScores[uid] || 0) + 50;
        }

        DiagnosticCore.record('security', { action: 'anomaly_detected', tag, context }, (context as any).userId);
    } catch (e) {
        console.error("[TelemetryPRO] Failed to log anomaly", e);
    }
  },

  metric: (name: string, value: number) => {
    try {
        DiagnosticCore.record('telemetry', { action: 'metric_log', name, value });
    } catch (e) {}
  },

  getUserRiskScore: (userId: string) => {
      return userRiskScores[userId] || 0;
  },

  heartbeat: () => {
     // Keep alive check
  }
};
