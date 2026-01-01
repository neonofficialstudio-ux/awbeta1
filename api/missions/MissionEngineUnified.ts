
import { getRepository } from "../database/repository.factory";
import * as db from "../mockData";
import { sanitizeText } from "../quality";
import { logMissionEvent } from "../telemetry/missionTelemetry";
import { updateUserInDb } from "../helpers";
import { validateMissionReward } from "../consistency/consistencyEngine";
import { applyUserHeals } from "../economy/economyAutoHeal";
import { withLatency } from "../helpers";
import { saveMockDb } from "../database/mock-db";

const repo = getRepository();

export const MissionService = {

    saveMission: (mission: any) => withLatency(() => {
        const cleaned = {
            ...mission,
            title: sanitizeText(mission.title),
            description: sanitizeText(mission.description),
            xp: Number(mission.xp || 0),
            coins: Number(mission.coins || 0),
        };

        const exists = db.missionsData.some(m => m.id === mission.id);

        if (exists) {
            // Update
            const newList = db.missionsData.map(m => m.id === mission.id ? cleaned : m);
            db.missionsData.splice(0, db.missionsData.length, ...newList);
        } else {
            // Insert
            const newMission = {
                ...cleaned,
                id: mission.id || `m-${Date.now()}`,
                createdAt: new Date().toISOString(),
                status: "active",
            };
            db.missionsData.unshift(newMission);
        }
        
        saveMockDb(); // Force persistence
        return { success: true };
    }),

    deleteMission: (id: string) => withLatency(() => {
        const initialLength = db.missionsData.length;
        const newMissions = db.missionsData.filter(m => m.id !== id);
        db.missionsData.splice(0, db.missionsData.length, ...newMissions);
        
        const newSubmissions = db.missionSubmissionsData.filter(s => s.missionId !== id);
        db.missionSubmissionsData.splice(0, db.missionSubmissionsData.length, ...newSubmissions);

        db.allUsersData.forEach(u => {
             let changed = false;
             if (u.completedMissions.includes(id)) {
                 u.completedMissions = u.completedMissions.filter((m: string) => m !== id);
                 changed = true;
             }
             if (u.pendingMissions.includes(id)) {
                 u.pendingMissions = u.pendingMissions.filter((m: string) => m !== id);
                 changed = true;
             }
        });

        saveMockDb(); 
        return { success: true };
    }),

    reviewSubmission: (submissionId: string, status: "approved" | "rejected") => withLatency(() => {
        const sub = db.missionSubmissionsData.find(s => s.id === submissionId);
        if (!sub || sub.status !== "pending") return {};

        const mission = db.missionsData.find(m => m.id === sub.missionId);
        const user = db.allUsersData.find(u => u.id === sub.userId);
        if (!mission || !user) return {};

        const validation = validateMissionReward(mission, user);
        if (!validation.valid) console.warn("[CONSISTENCY WARNING]", validation.reason);

        sub.status = status;
        (sub as any).reviewedAt = new Date().toISOString();

        if (status === "approved") {
            user.coins += mission.coins;
            user.xp += mission.xp;
            user.totalMissionsCompleted = (user.totalMissionsCompleted || 0) + 1;
            user.completedMissions = [...(user.completedMissions || []), mission.id];
            user.pendingMissions = user.pendingMissions.filter(id => id !== mission.id);
        } else {
             user.pendingMissions = user.pendingMissions.filter(id => id !== mission.id);
        }

        const healed = applyUserHeals(user);
        updateUserInDb(healed);

        logMissionEvent({
            timestamp: Date.now(),
            missionId: mission.id,
            userId: user.id,
            action: status === "approved" ? "mission_approved" : "mission_rejected",
        });
        
        saveMockDb();

        return { success: true };
    }),
    
    editSubmissionStatus: (submissionId: string, newStatus: "approved" | "rejected" | "pending") => withLatency(() => {
         const sub = db.missionSubmissionsData.find(s => s.id === submissionId);
         if(sub) {
             sub.status = newStatus;
             saveMockDb();
             return { success: true };
         }
         return { success: false };
    }),

    saveBatch: (missions: any[]) => withLatency(() => {
        const newOnes = missions.map((m, idx) => ({
            ...m,
            id: m.id || `m-batch-${Date.now()}-${idx}`,
            createdAt: new Date().toISOString(),
            xp: Number(m.xp),
            coins: Number(m.coins),
            status: "active",
        }));

        db.missionsData.unshift(...newOnes);
        saveMockDb();

        return { success: true, count: newOnes.length };
    }),
    
    getSnapshot: (missionId: string) => withLatency(() => {
        const subs = db.missionSubmissionsData.filter(s => s.missionId === missionId);
        const approved = subs.filter(s => s.status === "approved").length;
        const rejected = subs.filter(s => s.status === "rejected").length;
        const pending = subs.filter(s => s.status === "pending").length;

        return {
            total: subs.length,
            approved,
            rejected,
            pending,
            acceptanceRate: subs.length ? approved / (approved + rejected) * 100 : 0,
        };
    }),
    
    listAll: () => withLatency(() => {
        return [...(db.missionsData || [])];
    })
};

// Legacy Export
export const MissionEngineUnified = MissionService;
