
import { getRepository } from "../../api/database/repository.factory";
import { SubmissionEngine } from "../missions/submission.engine";
import { MissionAntiBypass } from "../missions/mission.antibypass";
import { LogEngineV4 } from "../../api/admin/logEngineV4";
import type { MissionSubmission, SubmissionStatus } from "../../types";

const repo = getRepository();

export const AdminMissionReviewEngine = {
    /**
     * Busca missões com filtros avançados aplicados.
     */
    fetchSubmissions: (filters: {
        status?: SubmissionStatus | 'all';
        type?: string | 'all';
        search?: string;
    }) => {
        let submissions = repo.select("submissions") as MissionSubmission[];
        const allMissions = repo.select("missions");

        // Filter by Status
        if (filters.status && filters.status !== 'all') {
            submissions = submissions.filter(s => s.status === filters.status);
        }

        // Filter by Type (requires looking up the mission definition)
        if (filters.type && filters.type !== 'all') {
            submissions = submissions.filter(s => {
                const mission = allMissions.find((m: any) => m.id === s.missionId);
                return mission && mission.type === filters.type;
            });
        }

        // Filter by Search (User Name or Mission Title)
        if (filters.search) {
            const lower = filters.search.toLowerCase();
            submissions = submissions.filter(s => 
                s.userName.toLowerCase().includes(lower) || 
                s.missionTitle.toLowerCase().includes(lower) ||
                s.userId.includes(lower)
            );
        }

        // Sort by Date (Newest first for pending, Oldest first for history might be better but stick to consistent Newest)
        return submissions.sort((a, b) => new Date(b.submittedAtISO).getTime() - new Date(a.submittedAtISO).getTime());
    },

    /**
     * Executa verificação de Anti-Bypass em uma submissão específica para exibir alertas na UI.
     */
    checkRisk: (submission: MissionSubmission) => {
        const check = MissionAntiBypass.checkSubmission(submission.userId, submission.missionId, submission.proofUrl);
        return {
            isRisk: !check.allowed,
            reason: check.reason
        };
    },

    /**
     * Aprova uma única missão.
     */
    approve: async (submissionId: string, adminId: string) => {
        const result = await SubmissionEngine.approveMission(submissionId);
        if (result.success) {
            LogEngineV4.log({
                action: "admin_approve_mission",
                category: "admin",
                userId: adminId,
                payload: { submissionId }
            });
        }
        return result;
    },

    /**
     * Rejeita uma única missão.
     */
    reject: async (submissionId: string, adminId: string, reason?: string) => {
        const result = await SubmissionEngine.rejectMission(submissionId, reason);
        if (result.success) {
            LogEngineV4.log({
                action: "admin_reject_mission",
                category: "admin",
                userId: adminId,
                payload: { submissionId, reason }
            });
        }
        return result;
    },

    /**
     * Aprovação em Lote (Turbo Mode).
     */
    bulkApprove: async (submissionIds: string[], adminId: string) => {
        let successCount = 0;
        let failCount = 0;

        for (const id of submissionIds) {
            try {
                const result = await SubmissionEngine.approveMission(id);
                if (result.success) successCount++;
                else failCount++;
            } catch (e) {
                failCount++;
            }
        }

        LogEngineV4.log({
            action: "admin_bulk_approve",
            category: "admin",
            userId: adminId,
            payload: { count: submissionIds.length, success: successCount, fails: failCount }
        });

        return { successCount, failCount };
    },

    /**
     * Rejeição em Lote.
     */
    bulkReject: async (submissionIds: string[], adminId: string, reason: string = "Rejeição em lote pelo administrador") => {
        let successCount = 0;
        
        for (const id of submissionIds) {
            await SubmissionEngine.rejectMission(id, reason);
            successCount++;
        }

        LogEngineV4.log({
            action: "admin_bulk_reject",
            category: "admin",
            userId: adminId,
            payload: { count: submissionIds.length }
        });

        return { successCount };
    }
};
