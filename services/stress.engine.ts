
import { MissionEngine } from "./missions/mission.engine";
import { EconomyEngineV6 } from "../api/economy/economyEngineV6";
import { QueueEngineV5 } from "../api/queue/queueEngineV5";
import { RankingEngine } from "./ranking/ranking.engine";
import { getRepository } from "../api/database/repository.factory";
import type { User } from "../types";

const repo = getRepository();

// Internal Stress Log (Max 200 entries)
const STRESS_LOGS: string[] = [];

function logStress(msg: string, error?: any) {
    const timestamp = new Date().toISOString();
    let entry = `[STRESS][${timestamp}] ${msg}`;
    if (error) {
        entry += ` | ERROR: ${error.message || error}`;
    }
    STRESS_LOGS.push(entry);
    if (STRESS_LOGS.length > 200) {
        STRESS_LOGS.shift();
    }
    // Optional: Console output for dev feedback
    // console.log(entry);
}

export const StressEngine = {
    getLogs: () => [...STRESS_LOGS],

    async runMissionSpam(user: User, count = 50) {
        logStress(`Starting Mission Spam for ${user.name} (${count} cycles)`);
        const start = Date.now();
        let successes = 0;
        let errors = 0;

        for (let i = 0; i < count; i++) {
            try {
                await MissionEngine.forceCompleteRandom(user.id);
                successes++;
            } catch (err: any) {
                errors++;
                logStress(`Mission Spam Fail (Iter ${i})`, err);
            }
        }
        const duration = Date.now() - start;
        logStress(`Mission Spam Complete. Success: ${successes}, Errors: ${errors}, Time: ${duration}ms`);
    },

    runEconomySpam(user: User, count = 50) {
        logStress(`Starting Economy Spam for ${user.name} (${count} cycles)`);
        const start = Date.now();
        
        for (let i = 0; i < count; i++) {
            try {
                const amount = Math.floor(Math.random() * 50) + 1;
                const isGain = Math.random() > 0.3;
                
                if (isGain) {
                    EconomyEngineV6.addCoins(user.id, amount, "STRESS_TEST_GAIN");
                } else {
                    // Only spend if has balance to avoid errors clogging log
                    if (user.coins >= amount) {
                        EconomyEngineV6.spendCoins(user.id, amount, "STRESS_TEST_SPEND");
                    }
                }
            } catch (err: any) {
                logStress(`Economy Spam Fail (Iter ${i})`, err);
            }
        }
        const duration = Date.now() - start;
        logStress(`Economy Spam Complete. Time: ${duration}ms`);
    },

    runQueueSpam(userId: string, count = 30) {
        logStress(`Starting Queue Spam for ${userId} (${count} cycles)`);
        const start = Date.now();

        for (let i = 0; i < count; i++) {
            try {
                QueueEngineV5.addToQueue({
                    id: `stress-q-${Date.now()}-${i}`,
                    userId: userId,
                    userName: "Stress User",
                    userAvatar: "",
                    redeemedItemId: `stress-item-${i}`,
                    itemName: `STRESS ITEM ${i}`,
                    queuedAt: new Date().toISOString(),
                    postUrl: "http://stress.test"
                }, 'item');
            } catch (err: any) {
                logStress(`Queue Spam Fail (Iter ${i})`, err);
            }
        }
        const duration = Date.now() - start;
        logStress(`Queue Spam Complete. Time: ${duration}ms`);
    },

    runRankingRecalc(times = 30) {
        logStress(`Starting Ranking Recalc Stress (${times} cycles)`);
        const start = Date.now();

        for (let i = 0; i < times; i++) {
            try {
                RankingEngine.recalculateAll();
            } catch (err: any) {
                logStress(`Ranking Recalc Fail (Iter ${i})`, err);
            }
        }
        const duration = Date.now() - start;
        logStress(`Ranking Recalc Complete. Time: ${duration}ms`);
    },

    async fullSystemBurn(user: User) {
        logStress(`!!! FULL SYSTEM BURN INITIATED FOR ${user.name} !!!`);
        
        await this.runMissionSpam(user, 30);
        this.runEconomySpam(user, 50);
        this.runQueueSpam(user.id, 20);
        this.runRankingRecalc(10);

        logStress(`!!! FULL SYSTEM BURN FINISHED !!!`);
    }
};
