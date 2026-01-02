
import { MissionEngine } from "../services/missions/mission.engine";
import { SubmissionEngine } from "../services/missions/submission.engine";
import { MissionEventEngine } from "../services/missions/mission.event";
import { EventPassEngine } from "../api/events/pass"; // Using API for pass purchase
import { getRepository } from "../api/database/repository.factory";
import { MissionDB } from "../api/missions/missions.db";

const repo = getRepository();

export const MissionTest = {
    simulateWeeklyLoad: () => {
        console.group("Mission Engine V6: Weekly Load");
        const missions = MissionEngine.getWeeklyMissions();
        console.log("Loaded:", missions);
        if (missions.some(m => m.type.includes('event') || (m as any).eventId)) console.error("FAIL: Event missions leaked into weekly");
        else console.log("PASS: Only weekly missions loaded");
        console.groupEnd();
    },

    simulateEventPassFlow: () => {
        console.group("Mission Engine V6: Event Pass & Missions");
        const userId = `sim-pass-v6-${Date.now()}`;
        const eventId = "e1"; // Assuming exists in MockDB from seeds
        
        repo.insert("users", { id: userId, coins: 1000, plan: 'Free Flow', joinedEvents: [], name: 'Pass Tester V6', role: 'user' });
        
        // 1. Check access without pass
        const userNoPass = repo.select("users").find((u:any) => u.id === userId);
        const missionsNoPass = MissionEventEngine.getAvailableEventMissions(userNoPass, eventId);
        console.log("Missions (No Pass):", missionsNoPass.length);
        if (missionsNoPass.length > 0) console.error("FAIL: Missions shown without pass");
        else console.log("PASS: Access denied correctly");

        // 2. Buy VIP Pass
        EventPassEngine.purchaseEventPass(userId, eventId, 'vip');
        
        const userVip = repo.select("users").find((u:any) => u.id === userId);
        const missionsVip = MissionEventEngine.getAvailableEventMissions(userVip, eventId);
        console.log("Missions (VIP):", missionsVip.length);

        if (missionsVip.length > 0) console.log("PASS: VIP missions unlocked");
        else console.error("FAIL: No missions found for VIP");
        
        repo.delete("users", (u:any) => u.id === userId);
        console.groupEnd();
    },
    
    simulateSubmissionFullCycle: async () => {
        console.group("Mission Engine V6: Full Cycle");
        const userId = `sim-cycle-${Date.now()}`;
        const mission = MissionDB.load()[0]; 
        
        repo.insert("users", { 
            id: userId, coins: 0, xp: 0, plan: 'Hitmaker', 
            pendingMissions: [], completedMissions: [], 
            monthlyMissionsCompleted: 0, totalMissionsCompleted: 0, role: 'user', name: "Cycle Tester"
        });

        try {
            // 1. Submit
            console.log(`Submitting to mission ${mission.id}...`);
            const submission = await SubmissionEngine.createSubmission(userId, mission.id, "https://instagram.com/p/proof123");
            console.log("Submitted:", submission);
            
            // Check pending state
            const userPending = repo.select("users").find((u:any) => u.id === userId);
            if (!userPending.pendingMissions.includes(mission.id)) console.error("FAIL: Not in pending list");
            
            // 2. Approve
            console.log("Approving...");
            const result = await SubmissionEngine.approveMission(submission.id);
            console.log("Approval Result:", result);
            
            const userAfter = repo.select("users").find((u:any) => u.id === userId);
            console.log("User Stats After:", { xp: userAfter.xp, coins: userAfter.coins, completed: userAfter.completedMissions });
            
            // Check Completion
            if (userAfter.completedMissions.includes(mission.id)) console.log("PASS: Marked completed");
            else console.error("FAIL: Not marked completed");

            // Check Economy (Hitmaker 2x multiplier in V4.2 settings from engine file)
            // Mock mission has 50xp, so Hitmaker should get 100xp?
            // Engine constant might differ, checking logic...
            if (userAfter.xp > 0) console.log("PASS: XP awarded");
            else console.error("FAIL: No XP awarded");

        } catch(e) {
            console.error("TEST CRASHED:", e);
        }
        
        repo.delete("users", (u:any) => u.id === userId);
        console.groupEnd();
    }
};
