

import { DashboardEngine } from "../services/dashboard/dashboard.engine";
import { getRepository } from "../api/database/repository.factory";
import { EconomyEngineV6 } from "../api/economy/economyEngineV6";

const repo = getRepository();

export const DashboardTest = {
    simulateXP: async () => {
        console.group("Dashboard Test: Simulate XP");
        const userId = `dash-user-${Date.now()}`;
        repo.insert("users", { id: userId, coins: 100, xp: 500, level: 1, role: 'user', plan: 'Free Flow', name: 'Dash Tester' });
        
        const before = DashboardEngine.getDashboardSnapshot(userId);
        console.log("Snapshot Before:", before?.economy);
        
        DashboardEngine.applyXPGain(repo.select("users").find((u:any)=>u.id===userId), 200, 'mission_completion', 'Test XP');
        
        const after = DashboardEngine.getDashboardSnapshot(userId);
        console.log("Snapshot After:", after?.economy);
        
        if (after?.economy.xp === 700) {
             console.log("%c[PASS] XP Sync Correct", "color: green");
        } else {
             console.error("[FAIL] XP Sync Mismatch");
        }
        
        repo.delete("users", (u:any) => u.id === userId);
        console.groupEnd();
    },

    simulateCheckIn: async () => {
        console.group("Dashboard Test: Check-In");
        const userId = `dash-checkin-${Date.now()}`;
        repo.insert("users", { id: userId, coins: 0, role: 'user', plan: 'Free Flow', name: 'Checkin Tester', lastCheckIn: new Date(Date.now() - 86400000 * 2).toISOString() });
        
        const res = await DashboardEngine.processCheckIn(userId);
        console.log("Check-In Result:", res);
        
        const snapshot = DashboardEngine.getDashboardSnapshot(userId);
        if (snapshot?.economy.coins > 0 && res.streak === 1) {
             console.log("%c[PASS] Check-in synced to dashboard", "color: green");
        } else {
             console.error("[FAIL] Check-in sync failed");
        }
        
        repo.delete("users", (u:any) => u.id === userId);
        console.groupEnd();
    }
};
