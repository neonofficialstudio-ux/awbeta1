
import { NotificationDispatcher } from "../services/notifications/notification.dispatcher";
import { NotificationEngine } from "../services/notifications/notification.engine";
import { getRepository } from "../api/database/repository.factory";

const repo = getRepository();

export const NotificationsTest = {
    setupTestUser: () => {
        const userId = `notif-test-${Date.now()}`;
        repo.insert("users", { id: userId, name: "Notif Tester", role: "user", coins: 0, xp: 0 });
        return userId;
    },

    simulateMissionFlow: async (userId?: string) => {
        const uid = userId || NotificationsTest.setupTestUser();
        console.group("Notification Test: Mission Flow");
        
        console.log("1. Pending");
        const p1 = NotificationDispatcher.missionPending(uid, "Missão Teste");
        console.log(p1);

        console.log("2. Approved");
        const p2 = NotificationDispatcher.missionApproved(uid, "Missão Teste", { xp: 100, coins: 10 });
        console.log(p2);

        console.log("3. Rejected");
        const p3 = NotificationDispatcher.missionRejected(uid, "Missão Falha", "Link quebrado");
        console.log(p3);

        const list = NotificationEngine.getUserNotifications(uid);
        if (list.length >= 3) console.log("%c[PASS] Mission notifications persisted.", "color: green");
        else console.error("[FAIL] Persistence error");
        
        console.groupEnd();
    },

    simulateEconomyFlow: async (userId?: string) => {
        const uid = userId || NotificationsTest.setupTestUser();
        console.group("Notification Test: Economy Flow");
        
        NotificationDispatcher.coinsAdded(uid, 500, "Test Grant");
        NotificationDispatcher.xpAdded(uid, 1000, "Test XP");
        NotificationDispatcher.levelUp(uid, 2);
        
        const list = NotificationEngine.getUserNotifications(uid);
        const hasLevelUp = list.some(n => n.type === 'level_up');
        
        if (hasLevelUp) console.log("%c[PASS] Level Up notification found.", "color: green");
        else console.error("[FAIL] Level Up missing");
        
        console.groupEnd();
    },
    
    simulateAll: () => {
        const uid = NotificationsTest.setupTestUser();
        NotificationsTest.simulateMissionFlow(uid);
        NotificationsTest.simulateEconomyFlow(uid);
        return "Notification tests completed for user: " + uid;
    }
};
