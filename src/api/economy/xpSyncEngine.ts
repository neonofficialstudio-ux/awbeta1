
import { getRepository } from "../database/repository.factory";
import { LevelEngine } from "./levelEngine";

const repo = getRepository();

export const XPSyncEngine = {
    /**
     * Scans a user's data and ensures XP, Level and NextLevelXP are consistent.
     * Fixes anomalies silently.
     */
    syncUser: (userId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) return null;

        // Ensure XP is never negative
        const safeXP = Math.max(0, user.xp || 0);
        
        // Recalculate Level
        const { level, xpToNextLevel } = LevelEngine.calculateLevel(safeXP);

        // Check consistency
        if (user.level !== level || user.xpToNextLevel !== xpToNextLevel || user.xp !== safeXP) {
            console.log(`[XPSync] Fixing user ${user.name}: XP ${user.xp}->${safeXP}, Lvl ${user.level}->${level}`);
            
            const fixedUser = {
                ...user,
                xp: safeXP,
                level: level,
                xpToNextLevel: xpToNextLevel
            };

            repo.update("users", (u: any) => u.id === userId, (u: any) => fixedUser);
            return fixedUser;
        }

        return user;
    },

    /**
     * Syncs all users. To be run on app init or admin trigger.
     */
    syncAll: () => {
        const users = repo.select("users");
        let fixedCount = 0;
        users.forEach((u: any) => {
            const res = XPSyncEngine.syncUser(u.id);
            if (res !== u) fixedCount++;
        });
        return { fixedCount };
    }
};
