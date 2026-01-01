
import { getRepository } from "../../api/database/repository.factory";
import { LogEngineV4 } from "../../api/admin/logEngineV4";
import { EconomyEngineV6 } from "../../api/economy/economyEngineV6";
import { MissionEngineV5 } from "../../api/missions/missionEngineV5";
import { QueueEngineV5 } from "../../api/queue/queueEngineV5";

const repo = getRepository();

export const PreStressTestV1 = {
    run: async () => {
        console.log("[PreStressTestV1] Starting...");
        const startTime = Date.now();
        const results: any = {
            usersCreated: 0,
            missionsGenerated: 0,
            transactionsProcessed: 0,
            queueItemsAdded: 0,
            errors: []
        };

        try {
            // 1. Simulate Users
            const TEST_USERS = 30;
            for (let i = 0; i < TEST_USERS; i++) {
                const uid = `stress-user-${Date.now()}-${i}`;
                repo.insert("users", {
                    id: uid,
                    name: `Stress User ${i}`,
                    email: `stress${i}@test.com`,
                    plan: 'Free Flow',
                    coins: 1000,
                    xp: 0,
                    role: 'user',
                    joinedISO: new Date().toISOString()
                });
                results.usersCreated++;

                // 2. Simulate Economy
                EconomyEngineV6.addCoins(uid, 500, "Stress Test Grant");
                EconomyEngineV6.addXP(uid, 100, "Stress Test XP");
                results.transactionsProcessed += 2;

                // 3. Simulate Queue
                QueueEngineV5.addToQueue({
                    id: `q-${uid}`,
                    userId: uid,
                    userName: `Stress User ${i}`,
                    userAvatar: '',
                    redeemedItemId: 'mock-item',
                    itemName: 'Stress Item',
                    queuedAt: new Date().toISOString(),
                    postUrl: 'http://mock.url'
                }, 'item');
                results.queueItemsAdded++;
            }

            // 4. Simulate Missions
            const TEST_MISSIONS = 200;
            for (let i = 0; i < TEST_MISSIONS; i++) {
                repo.insert("missions", {
                    id: `stress-mission-${i}`,
                    title: `Stress Mission ${i}`,
                    description: "Stress testing...",
                    xp: 100,
                    coins: 10,
                    status: 'active',
                    type: 'creative',
                    deadline: new Date(Date.now() + 86400000).toISOString()
                });
                results.missionsGenerated++;
            }

            LogEngineV4.log({
                action: 'stress_test_complete',
                category: 'system',
                payload: { duration: Date.now() - startTime, results }
            });

        } catch (e: any) {
            console.error("[PreStressTestV1] Failed", e);
            results.errors.push(e.message);
            LogEngineV4.log({
                action: 'stress_test_failed',
                category: 'system',
                payload: { error: e.message }
            });
        }
        
        console.log("[PreStressTestV1] Complete", results);
        return results;
    }
};
