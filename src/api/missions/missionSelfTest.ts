
import { MissionEngineV5 } from "./missionEngineV5";
import { getRepository } from "../database/repository.factory";
import { TelemetryPRO } from "../../services/telemetry.pro";

const repo = getRepository();

export const runMissionSelfTest = async () => {
    console.group("Running Mission System Self-Test (V5.3)");
    let errors = 0;
    const testUserId = `test-user-${Date.now()}`;
    const testMissionId = `test-mission-${Date.now()}`;

    try {
        // Setup Mock Data
        repo.insert("users", {
            id: testUserId,
            name: "Test Subject",
            plan: "Free Flow",
            coins: 0,
            xp: 0,
            pendingMissions: [],
            completedMissions: [],
            role: "user"
        });

        repo.insert("missions", {
            id: testMissionId,
            title: "Test Mission",
            xp: 100,
            coins: 10,
            deadline: new Date(Date.now() + 86400000).toISOString(),
            status: "active"
        });

        // Test 1: Valid Submission
        const res1 = await MissionEngineV5.submit(testUserId, testMissionId, "https://instagram.com/p/test");
        if (!res1.success) {
            console.error("[FAIL] Valid submission failed:", res1.error);
            errors++;
        }

        // Test 2: Duplicate Submission (Should fail)
        const res2 = await MissionEngineV5.submit(testUserId, testMissionId, "https://instagram.com/p/test2");
        if (res2.success || res2.code !== "ALREADY_PENDING") {
            console.error("[FAIL] Duplicate submission prevention failed.");
            errors++;
        }

        // Test 3: Daily Limit Enforcement (Free Flow = 1/day, already used above)
        const testMissionId2 = `test-mission-2-${Date.now()}`;
        repo.insert("missions", { ...repo.select("missions")[0], id: testMissionId2 });
        
        const res3 = await MissionEngineV5.submit(testUserId, testMissionId2, "https://instagram.com/p/test3");
        if (res3.success || res3.code !== "LIMIT_REACHED") {
             console.error("[FAIL] Daily limit enforcement failed.");
             errors++;
        }

    } catch (e) {
        console.error("[CRITICAL] Test crashed:", e);
        errors++;
    } finally {
        // Cleanup
        repo.delete("users", (u: any) => u.id === testUserId);
        repo.delete("missions", (m: any) => m.id === testMissionId);
    }

    if (errors === 0) {
        console.log("%c[PASS] Mission Engine V5.3 Integrity Verified.", "color: green");
        TelemetryPRO.event("mission_selftest_passed");
    } else {
        console.log(`%c[FAIL] ${errors} errors found in Mission Engine.`, "color: red");
        TelemetryPRO.anomaly("mission_selftest_failed", { errors });
    }
    console.groupEnd();
    return errors === 0;
};
