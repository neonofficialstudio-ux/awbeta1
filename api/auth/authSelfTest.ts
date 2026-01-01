
import { AuthEngineV4 } from "./authEngineV4";
import { SessionEngine } from "./sessionEngine";
import { getRepository } from "../database/repository.factory";

const repo = getRepository();

export const runAuthSelfTest = async () => {
    console.group("Running Auth Engine V4.0 Self-Test");
    let errors = 0;
    const testUserId = `test-auth-${Date.now()}`;
    
    try {
        // Setup Mock User
        repo.insert("users", {
            id: testUserId,
            name: "Auth Tester",
            email: "authtest@example.com",
            password: "password123",
            role: "user",
            coins: 100,
            xp: 0,
            plan: "Free Flow",
            isBanned: false
        });

        // Test 1: Login Success
        const user = AuthEngineV4.login("authtest@example.com", "password123");
        if (user.id !== testUserId) {
            console.error("[FAIL] Login returned wrong user ID");
            errors++;
        }

        // Test 2: Session Creation
        const session = SessionEngine.getSession();
        if (!session || session.userId !== testUserId) {
            console.error("[FAIL] Session not created correctly");
            errors++;
        }

        // Test 3: Restore Session
        const restoredUser = AuthEngineV4.restoreSession();
        if (!restoredUser || restoredUser.id !== testUserId) {
            console.error("[FAIL] Session restore failed");
            errors++;
        }

        // Test 4: Login Failure
        try {
            AuthEngineV4.login("authtest@example.com", "wrongpass");
            console.error("[FAIL] Login should have failed with wrong password");
            errors++;
        } catch (e) {
            // Expected
        }

        // Test 5: Logout
        AuthEngineV4.logout();
        const sessionAfterLogout = SessionEngine.getSession();
        if (sessionAfterLogout) {
             console.error("[FAIL] Session should be cleared after logout");
             errors++;
        }

    } catch (e) {
        console.error("[CRITICAL] Auth Test Crashed:", e);
        errors++;
    } finally {
        // Cleanup
        repo.delete("users", (u: any) => u.id === testUserId);
        AuthEngineV4.logout(); // Ensure clean state
    }

    if (errors === 0) {
        console.log("%c[PASS] Auth Engine V4.0 Verified.", "color: green");
    } else {
        console.log(`%c[FAIL] ${errors} errors in Auth Engine.`, "color: red");
    }
    console.groupEnd();
    return errors === 0;
};
