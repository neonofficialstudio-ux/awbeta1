
import { getRepository } from "../../api/database/repository.factory";
import { MissionEventEngine } from "./mission.event";
import { SubmissionEngine } from "./submission.engine";
import type { User, Mission } from "../../types";
import { SanityGuard } from "../../services/sanity.guard"; // V10

const repo = getRepository();

export const MissionEngine = {
    getWeeklyMissions: () => {
        // FIX: Read from the main Repository (where Admin saves), not the legacy MissionDB
        const all = repo.select("missions"); 
        const now = new Date();
        
        const rawMissions = all.filter((m: any) => {
            // 1. Must not be an event mission
            const isEvent = !!m.eventId || (m.type && m.type.startsWith('event'));
            if (isEvent) return false;

            // 2. Must be active
            if (m.status !== 'active') return false;

            // 3. Deadline must be in the future
            if (new Date(m.deadline) <= now) return false;

            // 4. Check Scheduling (If scheduledFor exists, must be in the past/now)
            if (m.scheduledFor && new Date(m.scheduledFor) > now) return false;

            return true;
        });

        return rawMissions.map(SanityGuard.mission);
    },

    getAllMissionsForUser: (userId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) return [];

        const weekly = MissionEngine.getWeeklyMissions();
        let eventMissions: any[] = [];
        
        // Safety check for joinedEvents array
        const joinedEvents = Array.isArray(user.joinedEvents) ? user.joinedEvents : [];
        
        joinedEvents.forEach((eventId: string) => {
            const eMissions = MissionEventEngine.getAvailableEventMissions(user, eventId);
            eventMissions = [...eventMissions, ...eMissions];
        });

        const combined = [...weekly, ...eventMissions];
        
        return combined.map(m => {
            const cleanMission = SanityGuard.mission(m);
            return {
                ...cleanMission,
                computedStatus: MissionEngine.getMissionStatus(userId, cleanMission.id)
            };
        });
    },

    calculateRewards: (user: User, mission: any) => {
        const planMultiplier = 1;
        
        return {
            xp: Math.floor(SanityGuard.number(mission.xp) * planMultiplier),
            coins: Math.floor(SanityGuard.number(mission.coins) * planMultiplier),
            multiplierApplied: planMultiplier
        };
    },

    getMissionStatus: (userId: string, missionId: string): 'available' | 'pending' | 'completed' | 'rejected' => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) return 'available';

        if (user.completedMissions.includes(missionId)) return 'completed';
        if (user.completedEventMissions && user.completedEventMissions.includes(missionId)) return 'completed';
        
        if (user.pendingMissions.includes(missionId)) return 'pending';
        if (user.pendingEventMissions && user.pendingEventMissions.includes(missionId)) return 'pending';

        return 'available';
    },

    forceCompleteRandom: async (userId: string) => {
        const allMissions = MissionEngine.getAllMissionsForUser(userId);
        const available = allMissions.filter(m => m.computedStatus === 'available');

        if (available.length === 0) {
            throw new Error("No available missions to force complete.");
        }

        const randomMission = available[Math.floor(Math.random() * available.length)];
        const proof = `STRESS-TEST-PROOF-${Date.now()}-https://instagram.com/p/stress`;
        
        const submission = await SubmissionEngine.createSubmission(userId, randomMission.id, proof);
        
        if (submission && submission.id) {
            await SubmissionEngine.approveMission(submission.id);
        }
        
        return randomMission.id;
    }
};
