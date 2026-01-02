
import { getRepository } from "../database/repository.factory";
import { DiagnosticCore } from "../../services/diagnostic.core";
import { safeDate } from "../utils/dateSafe";
import { SanitizeString, SanitizeArray } from "../../core/sanitizer.core";
import type { User, UserFlags, UserSocials, UserStreak, UserMissionsState } from "../../types";

const repo = getRepository();

// Plan Mapping for Normalization
const PLAN_MAP: Record<string, User['plan']> = {
    "Free Flow": "free",
    "Free": "free",
    "free": "free",
    "Artista em Ascensão": "ascensao",
    "Ascensão": "ascensao",
    "ascensao": "ascensao",
    "Artista Profissional": "profissional",
    "Profissional": "profissional",
    "profissional": "profissional",
    "Hitmaker": "hitmaker",
    "hitmaker": "hitmaker"
};

// Reverse map for UI compatibility if needed, or use as fallback
const UI_PLAN_MAP: Record<string, string> = {
    "free": "Free Flow",
    "ascensao": "Artista em Ascensão",
    "profissional": "Artista Profissional",
    "hitmaker": "Hitmaker"
};

export const UserMigrationEngine = {
    
    /**
     * Entry point: Migrates all users in the repository.
     */
    migrateAll: () => {
        console.group("UserMigrationEngine V1.4: Starting Full Scan");
        const users = repo.select("users") as User[];
        let migratedCount = 0;

        users.forEach(user => {
            try {
                const migratedUser = UserMigrationEngine.migrateUser(user);
                // Only update if changes occurred or flag wasn't set
                if (!user.flags?.migratedV14) {
                    repo.update("users", (u: any) => u.id === user.id, (u: any) => migratedUser);
                    migratedCount++;
                }
            } catch (e) {
                console.error(`Failed to migrate user ${user.id}`, e);
                DiagnosticCore.errors.capture(e, { context: "UserMigrationEngine", userId: user.id });
            }
        });

        console.log(`Migration Complete. ${migratedCount} users updated.`);
        console.groupEnd();
        return { migratedCount };
    },

    /**
     * Migrates a single user object to the new schema.
     * Idempotent: Can be called multiple times safely.
     */
    migrateUser: (user: User): User => {
        let u = { ...user };

        // 1. Initialize Structure
        u = UserMigrationEngine.rebuildMissingFields(u);

        // 2. Normalizations
        u = UserMigrationEngine.normalizePlan(u);
        u = UserMigrationEngine.normalizeSocials(u);
        u = UserMigrationEngine.normalizeStreak(u);
        u = UserMigrationEngine.normalizeEconomy(u);
        u = UserMigrationEngine.normalizeMissions(u);
        
        // 3. Final Flags
        if (!u.flags) u.flags = {};
        u.flags.migratedV14 = true;
        u.flags.isAdmin = u.role === 'admin';

        return u;
    },

    rebuildMissingFields: (user: User): User => {
        if (!user.socials) user.socials = {};
        if (!user.streak) user.streak = { lastCheckin: null, count: 0 };
        if (!user.missions) user.missions = { dailyLimit: 1, completedToday: 0, history: [] };
        if (!user.flags) user.flags = {};
        
        // Legacy Array Safety
        user.completedMissions = SanitizeArray(user.completedMissions);
        user.pendingMissions = SanitizeArray(user.pendingMissions);
        user.joinedEvents = SanitizeArray(user.joinedEvents);
        user.unlockedAchievements = SanitizeArray(user.unlockedAchievements);
        
        return user;
    },

    normalizePlan: (user: User): User => {
        const currentPlan = user.plan || "Free Flow";
        // Normalize to internal ID
        const internalId = PLAN_MAP[currentPlan] || "free";
        
        // Update Plan
        user.plan = internalId as any; // Cast to satisfy type union
        
        // If UI requires "Free Flow" display string, we might need a displayPlan field or components need to handle it.
        // For this hotfix, we strictly follow the rule: "Planos com nome visual devem virar id interno".
        
        return user;
    },

    normalizeSocials: (user: User): User => {
        // Sync Legacy -> Modern
        if (user.instagramUrl) user.socials!.instagram = SanitizeString(user.instagramUrl);
        if (user.tiktokUrl) user.socials!.tiktok = SanitizeString(user.tiktokUrl);
        if (user.spotifyUrl) user.socials!.spotify = SanitizeString(user.spotifyUrl);
        if (user.youtubeUrl) user.socials!.youtube = SanitizeString(user.youtubeUrl);
        
        // Ensure flat strings exist if they were missing but present in socials (Bi-directional sync for safety)
        user.instagramUrl = user.socials!.instagram || "";
        user.tiktokUrl = user.socials!.tiktok || "";
        
        return user;
    },

    normalizeStreak: (user: User): User => {
        // Sync Legacy -> Modern
        if (user.lastCheckIn) {
            const safe = safeDate(user.lastCheckIn);
            user.streak!.lastCheckin = safe ? safe.toISOString() : null;
        }
        user.streak!.count = Math.max(0, user.weeklyCheckInStreak || 0);
        
        return user;
    },

    normalizeEconomy: (user: User): User => {
        user.coins = Math.max(0, Number(user.coins) || 0);
        user.xp = Math.max(0, Number(user.xp) || 0);
        user.level = Math.max(1, Number(user.level) || 1);
        
        return user;
    },

    normalizeMissions: (user: User): User => {
        // Calculate limits based on plan
        const plan = user.plan; // Should be normalized by now
        let limit = 1;
        if (plan === 'ascensao') limit = 2;
        if (plan === 'profissional') limit = 3;
        if (plan === 'hitmaker') limit = 999;

        user.missions!.dailyLimit = limit;
        
        // Calculate completed today from submissions repo if needed, or just reset to safe 0 if unknown
        // This is a lightweight calc, assume 0 if not tracking explicitly yet in object
        
        // Sync history
        user.missions!.history = [...user.completedMissions];

        return user;
    }
};
