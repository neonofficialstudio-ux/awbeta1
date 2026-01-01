
import { AchievementTracker } from "../services/achievements/achievement.tracker";
import { getRepository } from "../api/database/repository.factory";

const repo = getRepository();

export const AchievementTest = {
    setupUser: (id: string) => {
        // Create user if not exists
        let user = repo.select("users").find((u: any) => u.id === id);
        if (!user) {
            repo.insert("users", {
                id, 
                name: "Achievement Tester", 
                role: 'user', 
                unlockedAchievements: [],
                coins: 0,
                xp: 0,
                totalMissionsCompleted: 0,
                weeklyCheckInStreak: 0,
                level: 1
            });
            console.log("Test User Created:", id);
        }
        return id;
    },

    simulateMissionUnlock: (userId: string) => {
        const id = AchievementTest.setupUser(userId);
        console.group("Testing Mission Achievement");
        
        // Simulate stats update
        repo.update("users", (u: any) => u.id === id, (u: any) => ({ ...u, totalMissionsCompleted: 10 }));
        
        // Trigger tracker
        AchievementTracker.trackMissionProgress(id);
        
        const user = repo.select("users").find((u: any) => u.id === id);
        console.log("Unlocked:", user.unlockedAchievements);
        
        if (user.unlockedAchievements.includes('mission_10')) {
            console.log("%c[PASS] Mission 10 Unlocked", "color: green");
        } else {
            console.error("[FAIL] Mission 10 Locked");
        }
        console.groupEnd();
    },

    simulateEconomyUnlock: (userId: string) => {
        const id = AchievementTest.setupUser(userId);
        console.group("Testing Economy Achievement");
        
        repo.update("users", (u: any) => u.id === id, (u: any) => ({ ...u, coins: 1500 }));
        
        AchievementTracker.trackEconomyProgress(id);
        
        const user = repo.select("users").find((u: any) => u.id === id);
        if (user.unlockedAchievements.includes('eco_rich')) {
            console.log("%c[PASS] Rich Achievement Unlocked", "color: green");
        } else {
            console.error("[FAIL] Economy Locked");
        }
        console.groupEnd();
    }
};
