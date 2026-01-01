
import { runEconomySelfTest } from "../economy/economySelfTest";
import { runMissionSelfTest } from "../missions/missionSelfTest";
import { runQueueSelfTest } from "../queue/queueSelfTest";
import { runEventSelfTest } from "../events/eventSelfTest";
import { runSubscriptionSelfTest } from "../subscriptions/subscriptionSelfTest";
import { LogEngineV4 } from "./logEngineV4";

export const SelfTestEngineV4 = {
    runAll: async () => {
        const results = {
            economy: await runEconomySelfTest(),
            mission: await runMissionSelfTest(),
            queue: runQueueSelfTest(),
            events: await runEventSelfTest(),
            subscription: runSubscriptionSelfTest()
        };

        const allPassed = Object.values(results).every(r => r === true);

        LogEngineV4.log({
            action: 'self_test_run',
            category: 'system',
            payload: { results, allPassed }
        });

        return {
            passed: allPassed,
            details: results,
            timestamp: new Date().toISOString()
        };
    }
};
