
import { getRepository } from "../api/database/repository.factory";
import { EventRankingEngineV5 } from "../services/events/eventRanking.engine";
import { EventSync } from "../services/events/event.sync";

const repo = getRepository();

export const EventLiveTest = {
    simulateRankingFluctuation: (eventId: string) => {
        console.log("[EventLiveTest] Simulating ranking changes...");
        const participants = repo.select("participations").filter((p: any) => p.eventId === eventId);
        
        participants.forEach((p: any) => {
            if (Math.random() > 0.5) {
                const points = Math.floor(Math.random() * 100);
                EventRankingEngineV5.updateEventScore(eventId, p.userId, points);
                console.log(`[EventLiveTest] Added ${points} points to user ${p.userId}`);
            }
        });
    },

    simulateArenaGrowth: (eventId: string) => {
        console.log("[EventLiveTest] Simulating arena growth...");
        // Add fake participation to bump numbers
        const fakeUserId = `sim-user-${Date.now()}`;
        repo.insert("participations", {
            id: `p-sim-${Date.now()}`,
            userId: fakeUserId,
            eventId,
            joinedAt: new Date().toISOString(),
            isGolden: Math.random() > 0.8
        });
    }
};