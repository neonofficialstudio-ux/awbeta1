
import { getRepository } from '../../api/database/repository.factory';
import { MissionDB } from '../../api/missions/missions.db';
import { MissionValidator } from './mission.validator';
import { MissionAntiBypass } from './mission.antibypass';
import { updateUserInDb, createNotification } from '../../api/helpers';
import { TelemetryPRO } from '../telemetry.pro';
import type { MissionSubmission } from '../../types';
import { SanityGuard } from '../sanity.guard';

const repo = getRepository();

export const SubmissionEngine = {
    /**
     * Creates a new submission record.
     * (Client side validation remains for fast feedback, server validates on approve)
     */
    createSubmission: async (userId: string, missionId: string, proofUrl: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        let mission = MissionDB.getById(missionId);
        if (!mission) {
            mission = repo.select("missions").find((m: any) => m.id === missionId);
        }
        
        if (!user || !mission) throw new Error("Dados inválidos ou missão não encontrada.");

        const validation = MissionValidator.validateProof(proofUrl, mission.format);
        if (!validation.valid) throw new Error(validation.error);

        const bypassCheck = MissionAntiBypass.checkSubmission(userId, missionId, proofUrl);
        if (!bypassCheck.allowed) throw new Error(bypassCheck.reason);

        const submission: MissionSubmission = {
            id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            userId,
            missionId,
            userName: user.name,
            userAvatar: user.avatarUrl,
            missionTitle: mission.title,
            submittedAt: new Date().toLocaleString('pt-BR'),
            submittedAtISO: new Date().toISOString(),
            proofUrl,
            status: 'pending'
        };

        repo.insert("submissions", submission);
        
        const field = mission.eventId ? 'pendingEventMissions' : 'pendingMissions';
        const currentList = user[field] || [];
        
        const updatedUser = { ...user, [field]: [...currentList, missionId] };
        updateUserInDb(updatedUser);

        TelemetryPRO.event("mission_submitted", { userId, missionId, type: mission.type });

        return submission;
    },

    /**
     * Approves a mission via RPC.
     */
    approveMission: async (submissionId: string) => {
        // RPC CALL - "approve_mission"
        try {
            // Note: In real app adminId comes from auth context. 
            // Mock DB RPC handles logic assuming authorized context or internal call.
            const result = await repo.rpc!('approve_mission', { submissionId, adminId: 'system' });
            
            if (!result.success) {
                return { success: false, error: "Falha na aprovação via servidor." };
            }

            const updatedUser = SanityGuard.user(result.user);
            
            // UI Notifications (Client side reflection)
            // Note: Server logic creates the notification record, here we just might want to return it for UI toast if needed
            // But since this is usually called by Admin, the User notification is async.
            
            return { success: true, updatedUser };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },

    rejectMission: async (submissionId: string, reason?: string) => {
        // Local logic is fine for rejection (no economy change), but ideally also RPC.
        // Keeping local for now as it's just status update.
        const submission = repo.select("submissions").find((s: any) => s.id === submissionId);
        if (!submission) return { success: false };

        const user = repo.select("users").find((u: any) => u.id === submission.userId);
        const missionId = submission.missionId;
        const mission = MissionDB.getById(missionId) || repo.select("missions").find((m:any) => m.id === missionId);
        
        repo.update("submissions", (s: any) => s.id === submissionId, (s: any) => ({ ...s, status: 'rejected' }));

        if (user) {
            const pendingField = mission?.eventId ? 'pendingEventMissions' : 'pendingMissions';
            const updatedUser = {
                ...user,
                [pendingField]: (user[pendingField] || []).filter((id: string) => id !== missionId)
            };
            updateUserInDb(updatedUser);
            
            const msg = reason ? `Motivo: ${reason}` : 'Sua prova não atendeu aos requisitos. Tente novamente.';
            const notification = createNotification(user.id, 'Missão Rejeitada', msg);
            repo.insert("notifications", notification);
        }

        TelemetryPRO.event("mission_rejected", { userId: submission.userId, missionId: submission.missionId });

        return { success: true };
    }
};
