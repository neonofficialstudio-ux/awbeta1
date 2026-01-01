// api/diagnostics/fullNormalization.ts

import { EconomyEngineV6 } from "../economy/economyEngineV6";
import { QueueEngineV5 } from "../queue/queueEngineV5";
import { MissionEngine } from "../../services/missions/mission.engine";
import { EventEngineUnified as EventEngineV7 } from "../events/EventEngineUnified";
import * as storeAPI from "../admin/store";
import * as rankingAPI from "../ranking/index";
import { getRepository } from "../database/repository.factory";

const repo = getRepository();

export const runFullNormalizationDiagnostic = async () => {
    console.group("Running V8.0 Full Normalization Diagnostic");
    const report = {
        modules: {
            economy: false,
            queue: false,
            missions: false,
            events: false,
            store: false,
            ranking: false
        },
        errors: [] as string[]
    };

    const testId = `diag-${Date.now()}`;

    try {
        // 1. Economy
        const ecoUser = { id: testId, coins: 100, xp: 0, level: 1, plan: 'Free Flow' };
        repo.insert("users", ecoUser);
        
        const ecoRes = await EconomyEngineV6.addCoins(testId, 50, "Diag Test");
        if (ecoRes.success && ecoRes.updatedUser.coins === 150) {
            report.modules.economy = true;
        } else {
            report.errors.push("Economy: addCoins did not return expected success/data format");
        }

        // 2. Queue
        const qItem = { id: `q-${testId}`, userId: testId, itemName: "Test Item", redeemedItemId: "ri-1" };
        try {
            QueueEngineV5.addToQueue(qItem as any, 'item');
            const q = QueueEngineV5.getQueue('item');
            if (q.some(i => i.id === qItem.id)) report.modules.queue = true;
            else report.errors.push("Queue: Item added but not found in queue");
        } catch (e: any) {
            report.errors.push(`Queue Error: ${e.message}`);
        }

        // 3. Missions
        const missions = MissionEngine.getAllMissionsForUser(testId);
        if (Array.isArray(missions)) {
             report.modules.missions = true;
        } else {
             report.errors.push("Missions: getAllMissionsForUser returned invalid type");
        }

        // 4. Store (Admin)
        // Correctly handle direct data return (AdminEngineV6.getDashboardData returns raw object)
        const storeData = await storeAPI.getStoreData();
        if (storeData && Array.isArray(storeData.storeItems)) {
            report.modules.store = true;
        } else {
            report.errors.push("Store: getStoreData returned non-standard format or missing items");
        }

        // 5. Ranking
        const rank = rankingAPI.rankingAPI.getGlobalRanking(testId);
        if (Array.isArray(rank) && rank.length > 0) {
            report.modules.ranking = true;
        } else {
            report.errors.push("Ranking: getGlobalRanking failed or empty");
        }
        
        // 6. Events
        // We check if engines are exposed
        if (typeof EventEngineV7.joinEvent === 'function') {
            report.modules.events = true;
        } else {
            report.errors.push("Events: EngineV7 not linked correctly");
        }

    } catch (e: any) {
        report.errors.push(`Critical Diagnostic Failure: ${e.message}`);
    } finally {
        // Cleanup
        repo.delete("users", (u: any) => u.id === testId);
        repo.delete("queue", (q: any) => q.id === `q-${testId}`);
    }

    console.table(report.modules);
    if (report.errors.length > 0) console.error("Errors:", report.errors);
    console.groupEnd();

    return report;
};