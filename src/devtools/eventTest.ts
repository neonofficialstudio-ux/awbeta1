
import { EventPassEngine } from "../api/events/pass";
import { EventMissionEngine } from "../services/events/eventMission.engine";
import { EventRewardEngine } from "../services/events/eventReward.engine";
import { getRepository } from "../api/database/repository.factory";

const repo = getRepository();

export const EventTest = {
    simulateVIPRun: async () => {
        console.group("Event Engine V5 Simulation: VIP Run");
        
        // 1. Setup
        const userId = `sim-vip-${Date.now()}`;
        const eventId = "test-event-v5";
        
        repo.insert("users", { id: userId, coins: 500, role: 'user', plan: 'Free Flow', name: 'Sim User' });
        repo.insert("events", { id: eventId, title: "Test Event", entryCost: 50, goldenPassCost: 100, status: 'current' });
        
        // 2. Purchase Pass
        const purchase = EventPassEngine.purchaseEventPass(userId, eventId, 'vip');
        console.log("Purchase Result:", purchase);
        
        if (!purchase.success) {
            console.error("FAIL: Purchase failed");
            console.groupEnd();
            return;
        }

        // 3. Check Benefits
        const benefits = EventPassEngine.getPassBenefits('vip');
        console.log("VIP Benefits:", benefits);
        if (!benefits.dailyBoosters) console.error("FAIL: Missing VIP boosters");
        
        // 4. Get Missions
        const missions = EventMissionEngine.getEventMissions(userId, eventId);
        console.log(`Missions Loaded: ${missions.length}`);
        
        console.log("SUCCESS: VIP Run Simulation Complete");
        console.groupEnd();
        
        // Cleanup
        repo.delete("users", (u: any) => u.id === userId);
        repo.delete("events", (e: any) => e.id === eventId);
    }
};
