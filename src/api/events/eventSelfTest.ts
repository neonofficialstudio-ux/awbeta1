
// api/events/eventSelfTest.ts
import { EventEngineUnified as EventEngineV7 } from "./EventEngineUnified";
import { LiveArenaEngine } from "./liveArenaEngine";
import { getRepository } from "../database/repository.factory";

const repo = getRepository();

export const runEventSelfTest = async () => {
    console.group("Running Event System Self-Test (V7.0)");
    let errors = 0;
    
    const testEventId = `test-event-${Date.now()}`;
    const testUserId = `test-user-${Date.now()}`;

    try {
        // Setup
        repo.insert("events", {
            id: testEventId,
            title: "Test Event",
            status: "current",
            entryCost: 10,
            goldenPassCost: 50,
            maxCapacity: 5, // Small cap for testing
            date: "2024"
        });

        repo.insert("users", {
            id: testUserId,
            name: "Event Tester",
            coins: 100,
            plan: "Free Flow",
            joinedEvents: [],
            role: "user"
        });

        // Test 1: Live Arena Status
        const status = LiveArenaEngine.getStatus(testEventId);
        if (status.isFull || status.current !== 0) {
            console.error("[FAIL] Arena status incorrect for new event.");
            errors++;
        }

        // Test 2: Join Event (Async)
        const result = await EventEngineV7.joinEvent(testUserId, testEventId, 10, false);
        if (!result.success) {
             console.error("[FAIL] Failed to join valid event:", result.error);
             errors++;
        }

        // Test 3: Economy Deduction
        if (result.updatedUser && result.updatedUser.coins !== 90) {
             console.error("[FAIL] Coins not deducted correctly.");
             errors++;
        }

        // Test 4: Re-join prevention (Async)
        const result2 = await EventEngineV7.joinEvent(testUserId, testEventId, 10, false);
        if (result2.success) {
             console.error("[FAIL] User allowed to join twice.");
             errors++;
        }

    } catch (e) {
        console.error("[CRITICAL] Event Self-Test Crashed:", e);
        errors++;
    } finally {
        // Cleanup
        repo.delete("events", (e: any) => e.id === testEventId);
        repo.delete("users", (u: any) => u.id === testUserId);
        repo.delete("participations", (p: any) => p.userId === testUserId);
    }

    if (errors === 0) {
        console.log("%c[PASS] Event Engine V7.0 Verified.", "color: green");
    } else {
        console.log(`%c[FAIL] ${errors} errors in Event System.`, "color: red");
    }
    console.groupEnd();
    return errors === 0;
};
