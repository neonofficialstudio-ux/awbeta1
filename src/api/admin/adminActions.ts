
import { getRepository } from "../database/repository.factory";
import { MissionEngineV5 } from "../missions/missionEngineV5";
import { EconomyEngineV6 } from "../economy/economyEngineV6";
import { LogEngineV4 } from "./logEngineV4";
import { safeApproveMission } from "../safeguard/safeOps";
import { QueueEngineV5 } from "../queue/queueEngineV5";

const repo = getRepository();

export const AdminActions = {
    reviewMission: async (submissionId: string, status: 'approved' | 'rejected') => {
        const submission = repo.select("submissions").find((s: any) => s.id === submissionId);
        if (!submission) throw new Error("Submission not found");

        // Use safe ops wrapper which handles V5 engines internally
        const result = await safeApproveMission(submission, status);
        
        LogEngineV4.log({
            action: `mission_${status}`,
            category: 'admin',
            userId: submission.userId,
            payload: { missionId: submission.missionId, submissionId }
        });

        return result;
    },

    adjustUserBalance: (userId: string, amount: number, reason: string) => {
        const result = EconomyEngineV6.addCoins(userId, amount, `Admin Adjustment: ${reason}`);
        
        LogEngineV4.log({
            action: 'balance_adjustment',
            category: 'economy',
            userId: userId,
            payload: { amount, reason }
        });

        return result;
    },

    processQueueItem: (itemId: string) => {
        QueueEngineV5.processItem(itemId);
        LogEngineV4.log({
            action: 'force_queue_process',
            category: 'queue',
            payload: { itemId }
        });
    },
    
    createManualMission: (missionData: any) => {
        const id = `m-${Date.now()}`;
        const newMission = { ...missionData, id, createdAt: new Date().toISOString(), status: 'active' };
        repo.insert("missions", newMission);
        return newMission;
    }
};
