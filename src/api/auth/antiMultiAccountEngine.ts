
import { getRepository } from "../database/repository.factory";
import { TelemetryPRO } from "../../services/telemetry.pro";

const repo = getRepository();

// In-memory cache for session anomalies during runtime
const loginAttempts: Record<string, number[]> = {}; // DeviceId -> timestamps

export const AntiMultiAccountEngine = {
    checkLogin: (userId: string, deviceId: string): { isSuspicious: boolean; reason?: string } => {
        const now = Date.now();
        
        // 1. Velocity Check (Too many logins from same device for different users?)
        // Note: Since we don't store deviceId in DB for mock users, we use runtime memory.
        // In a real app, we'd query the `auth.sessions` table.
        
        // This is a placeholder heuristic for the mock environment
        if (!loginAttempts[deviceId]) loginAttempts[deviceId] = [];
        
        // Clean old attempts (> 1 hour)
        loginAttempts[deviceId] = loginAttempts[deviceId].filter(t => now - t < 3600000);
        
        // Log this attempt
        loginAttempts[deviceId].push(now);

        if (loginAttempts[deviceId].length > 10) {
            TelemetryPRO.anomaly("high_login_velocity", { deviceId, count: loginAttempts[deviceId].length });
            return { isSuspicious: true, reason: "Muitas tentativas de login no mesmo dispositivo." };
        }

        return { isSuspicious: false };
    },

    flagSuspicious: (userId: string, reason: string) => {
        // Log to admin telemetry
        TelemetryPRO.event("suspicious_user_flagged", { userId, reason, category: "security" });
    }
};
