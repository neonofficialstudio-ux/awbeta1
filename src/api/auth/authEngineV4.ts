import { SessionEngine } from "./sessionEngine";
import { UserIdentity } from "./userIdentity";
import { AntiMultiAccountEngine } from "./antiMultiAccountEngine";
import { getRepository } from "../database/repository.factory";
import { TelemetryPRO } from "../../services/telemetry.pro";
import type { User } from "../../types";
import { LogEngineV4 } from "../admin/logEngineV4";
import { normalizePlan } from "../subscriptions/normalizePlan";

const repo = getRepository();

export const AuthEngineV4 = {
    /**
     * Authenticates a user against the repository.
     * Creates a session if successful.
     */
    login: (email: string, password: string): User => {
        // 1. Find User
        const users = repo.select("users") as User[];
        // Simple case-insensitive email check
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            TelemetryPRO.event("login_failed", { email, reason: "user_not_found" });
            throw new Error("Credenciais inválidas");
        }

        // 2. Verify Password (Mock: Plaintext check as per current architecture)
        // In Supabase migration, this will defer to Supabase Auth
        if (user.password !== password) {
             TelemetryPRO.event("login_failed", { userId: user.id, reason: "wrong_password" });
             throw new Error("Credenciais inválidas");
        }

        // 3. Check Ban Status
        if (user.isBanned) {
             // Auto-unban logic moved to higher level or kept here?
             // Let's handle basic check here.
             if (user.banExpiresAt && new Date() > new Date(user.banExpiresAt)) {
                 // Expired ban, allow login and clear ban status in repo
                 repo.update("users", (u: any) => u.id === user.id, (u: any) => ({ ...u, isBanned: false, banReason: undefined, banExpiresAt: undefined }));
                 TelemetryPRO.event("user_auto_unbanned", { userId: user.id });
             } else {
                 TelemetryPRO.event("login_blocked_banned", { userId: user.id });
                 throw new Error("Conta suspensa ou banida.");
             }
        }
        
        // V3.1 Plan Fix & V2.0 Anti-Reset: Force Normalization immediately
        const normalizedPlan = normalizePlan(user.plan) as User['plan'];
        if (user.plan !== normalizedPlan) {
            repo.update("users", (u: any) => u.id === user.id, (u: any) => ({ ...u, plan: normalizedPlan }));
            user.plan = normalizedPlan; // Update local reference
        }

        // 4. Security Checks
        const deviceId = SessionEngine.getDeviceId();
        const securityCheck = AntiMultiAccountEngine.checkLogin(user.id, deviceId);
        if (securityCheck.isSuspicious) {
            AntiMultiAccountEngine.flagSuspicious(user.id, securityCheck.reason || "Suspicious login pattern");
        }

        // 5. Create Session
        SessionEngine.createSession(user.id, deviceId);

        // 6. Log & Return Fresh Identity
        LogEngineV4.log({
            action: "user_login",
            category: "user",
            userId: user.id,
            payload: { deviceId, timestamp: Date.now() }
        });
        
        return UserIdentity.getProfile(user.id)!;
    },

    /**
     * Destroys the current session.
     */
    logout: () => {
        const session = SessionEngine.getSession();
        if (session) {
            LogEngineV4.log({
                action: "user_logout",
                category: "user",
                userId: session.userId,
                payload: { timestamp: Date.now() }
            });
        }
        SessionEngine.clearSession();
        // Clear legacy token if it exists
        localStorage.removeItem('authToken');
    },

    /**
     * Restores a session from storage. Returns User if valid, null otherwise.
     */
    restoreSession: (): User | null => {
        const session = SessionEngine.getSession();
        
        if (!session) {
            // Check for legacy token (Migration path)
            const legacyToken = localStorage.getItem('authToken');
            if (legacyToken) {
                try {
                    const decoded = JSON.parse(atob(legacyToken));
                    if (decoded.id) {
                        // Upgrade to V4 Session
                        const newSession = SessionEngine.createSession(decoded.id, SessionEngine.getDeviceId());
                        // Fetch user
                        return UserIdentity.getProfile(newSession.userId);
                    }
                } catch (e) {}
            }
            return null;
        }

        if (!SessionEngine.isValid(session)) {
            LogEngineV4.log({
                action: "session_expired",
                category: "system",
                userId: session.userId,
                payload: {}
            });
            SessionEngine.clearSession();
            return null;
        }

        // Session Valid, refresh activity
        SessionEngine.refreshActivity();
        
        // Fetch fresh profile
        let user = UserIdentity.getProfile(session.userId);
        
        if (!user) {
            // User might have been deleted
            SessionEngine.clearSession();
            return null;
        }
        
        // V3.1 Plan Fix on Restore
        const normalizedPlan = normalizePlan(user.plan) as User['plan'];
        if (user.plan !== normalizedPlan) {
            // Fix in DB if restoring session reveals bad data
             repo.update("users", (u: any) => u.id === user!.id, (u: any) => ({ ...u, plan: normalizedPlan }));
             user.plan = normalizedPlan;
        }

        return user;
    }
};
