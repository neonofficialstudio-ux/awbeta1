
import { getRepository } from "../database/repository.factory";
import { TelemetryPRO } from "../../services/telemetry.pro";
import { FraudScanV3 } from "../../services/fraudscan.v3";
import { SubscriptionEngineV5 } from "../subscriptions/index";
import { NotificationDispatcher } from "../../services/notifications/notification.dispatcher";
import { SanitizeString } from "../../core/sanitizer.core";
import type { User, Mission, MissionSubmission } from "../../types";
import { AtomicLock } from "../security/atomicLock";
import { rateLimit } from "../../api/anticheat/rateLimit";
import { runAdaptiveShield } from "../../api/anticheat/adaptiveShield";
import { detectMultiAccount } from "../../api/anticheat/multiAccountDetector";

const repo = getRepository();

interface MissionResult {
    success: boolean;
    submission?: MissionSubmission;
    updatedUser?: User;
    error?: string;
    code?: string;
}

export const MissionEngineV5 = {
    /**
     * Validates if a user can submit a specific mission.
     */
    validateAttempt: async (user: User, missionId: string): Promise<{ ok: boolean; error?: string; code?: string }> => {
        // ASYNC FETCH to prepare for real DB
        const missions = await repo.selectAsync("missions");
        const eventMissions = await repo.selectAsync("eventMissions");

        const mission = missions.find((m: any) => m.id === missionId) || 
                       eventMissions.find((m: any) => m.id === missionId);

        if (!mission) return { ok: false, error: "Missão não encontrada.", code: "NOT_FOUND" };

        // 1. Check Expiration
        if (mission.deadline && new Date() > new Date(mission.deadline)) {
            return { ok: false, error: "Esta missão expirou.", code: "EXPIRED" };
        }

        // 2. Check Duplicates
        if (user.completedMissions.includes(missionId) || (user.completedEventMissions && user.completedEventMissions.includes(missionId))) {
            return { ok: false, error: "Missão já concluída.", code: "ALREADY_COMPLETED" };
        }
        if (user.pendingMissions.includes(missionId) || (user.pendingEventMissions && user.pendingEventMissions.includes(missionId))) {
            return { ok: false, error: "Missão já enviada e em análise.", code: "ALREADY_PENDING" };
        }

        // 3. Check Subscription Limits
        if (!mission.eventId) {
            const limitCheck = SubscriptionEngineV5.checkDailyLimit(user);
            if (!limitCheck.allowed) {
                TelemetryPRO.event("mission_limit_reached", { userId: user.id, plan: user.plan, limit: limitCheck.limit });
                return { 
                    ok: false, 
                    error: `Limite diário atingido para o plano ${user.plan}. (${limitCheck.limit}/${limitCheck.limit})`, 
                    code: "LIMIT_REACHED" 
                };
            }
        }

        return { ok: true };
    },

    /**
     * Core submission logic with Phase 4 Security (Async).
     */
    submit: async (userId: string, missionId: string, proofInput: string): Promise<MissionResult> => {
        if (!rateLimit(`mission_submit:${userId}`, 10)) {
            return { success: false, error: "Rate limit de missões atingido. Tente novamente em breve.", code: "RATE_LIMITED" };
        }

        if (!AtomicLock.lock(`mission:${userId}`)) {
            return { success: false, error: "Aguarde o processamento anterior." };
        }

        try {
            const start = Date.now();

            // 1. Load Context (ASYNC)
            const users = await repo.selectAsync("users");
            const user = users.find((u: any) => u.id === userId);
            
            const allMissions = await repo.selectAsync("missions");
            const allEventMissions = await repo.selectAsync("eventMissions");

            let mission = allMissions.find((m: any) => m.id === missionId);
            let isEventMission = false;

            if (!mission) {
                mission = allEventMissions.find((m: any) => m.id === missionId);
                if (mission) isEventMission = true;
            }

            if (!user || !mission) return { success: false, error: "Dados inválidos." };

            // 1b. Event Mission Delegation
            if (isEventMission) {
                const { EventEngineUnified } = await import("../events/EventEngineUnified");
                if (!mission.eventId) return { success: false, error: "Missão de evento corrompida (sem Event ID)." };
                
                try {
                    const res = await EventEngineUnified.submitEventMission(userId, mission.eventId, missionId, proofInput);
                    return {
                        success: res.success,
                        submission: res.newSubmission as any, 
                        updatedUser: res.updatedUser,
                    };
                } catch (e: any) {
                    return { success: false, error: e.message };
                }
            }

            // Adaptive Shield
            const allDBUsers = await repo.selectAsync("users");
            const shield = runAdaptiveShield(user, {
                deltaCoins: 0,
                deltaXp: mission.xp,
                actionsPerMinute: user.stats?.apm ?? 0,
                missionRepeats: user.stats?.missionRepeats ?? 0,
                sameDeviceUsers: detectMultiAccount(user.deviceFingerprint, allDBUsers),
                repeatedPattern: false
            });

            if (shield.shield === "high" || shield.shield === "critical") {
                throw new Error("Submissão de missão bloqueada por comportamento suspeito.");
            }

            // Phase 4: Anti-Spoofing & Payload Validation
            if (mission.status && mission.status !== 'active') {
                return { success: false, error: "Missão inativa ou expirada." };
            }

            // 2. Validation Phase (Calls async validate)
            const validation = await MissionEngineV5.validateAttempt(user, missionId);
            if (!validation.ok) {
                TelemetryPRO.event("mission_submit_blocked", { userId, missionId, reason: validation.code });
                return { success: false, error: validation.error, code: validation.code };
            }

            // 3. Sanitize & Anti-Fraud
            const proof = SanitizeString(proofInput);
            const fraudCheck = FraudScanV3.check({ ...mission, proof, userId });

            if (!fraudCheck.ok) {
                TelemetryPRO.anomaly("fraud_detected_on_submit", { userId, missionId, proof });
                return { success: false, error: fraudCheck.error || "Detecção de segurança: Envio bloqueado.", code: "FRAUD_DETECTED" };
            }

            // 4. Persist Submission (ASYNC)
            const submissionId = `sub-v5-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            const newSubmission: MissionSubmission = {
                id: submissionId,
                userId: user.id,
                missionId: mission.id,
                missionTitle: mission.title,
                userName: user.name,
                userAvatar: user.avatarUrl,
                submittedAt: "Agora mesmo", 
                submittedAtISO: new Date().toISOString(), 
                proofUrl: proof,
                status: "pending"
            };

            await repo.insertAsync("submissions", newSubmission);

            // 5. Update User State (ASYNC)
            const updatedUser = {
                ...user,
                pendingMissions: [...user.pendingMissions, missionId]
            };

            await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => updatedUser);

            // 6. Notifications & Telemetry
            NotificationDispatcher.missionPending(userId, mission.title);
            
            TelemetryPRO.event("mission_submitted_v5", {
                userId,
                missionId,
                duration: Date.now() - start
            });

            return {
                success: true,
                submission: newSubmission,
                updatedUser: updatedUser
            };
        } finally {
            AtomicLock.unlock(`mission:${userId}`);
        }
    },

    // Legacy synchronous getter for UI rendering (Reads from cache/memory array via repo.select)
    getMissionStatus: (userId: string, missionId: string): 'available' | 'pending' | 'completed' | 'rejected' | 'expired' | 'locked' => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) return 'locked';

        const mission = repo.select("missions").find((m: any) => m.id === missionId);
        if (mission && new Date() > new Date(mission.deadline)) return 'expired';

        if (user.completedMissions.includes(missionId)) return 'completed';
        if (user.pendingMissions.includes(missionId)) return 'pending';
        
        if (user.completedEventMissions && user.completedEventMissions.includes(missionId)) return 'completed';
        if (user.pendingEventMissions && user.pendingEventMissions.includes(missionId)) return 'pending';

        const submissions = repo.select("submissions");
        const recentSub = submissions.find((s: any) => s.userId === userId && s.missionId === missionId);
        
        if (recentSub) {
            if (recentSub.status === 'approved') return 'completed';
            if (recentSub.status === 'pending') return 'pending';
            if (recentSub.status === 'rejected') return 'rejected';
        }
        
        const eventSubmissions = repo.select("eventMissionSubmissions");
        const recentEvtSub = eventSubmissions.find((s: any) => s.userId === userId && s.eventMissionId === missionId);
        if (recentEvtSub) {
            if (recentEvtSub.status === 'approved') return 'completed';
            if (recentEvtSub.status === 'pending') return 'pending';
            if (recentEvtSub.status === 'rejected') return 'rejected';
        }

        return 'available';
    }
};
