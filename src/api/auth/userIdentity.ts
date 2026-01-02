
import { getRepository } from "../database/repository.factory";
import type { User } from "../../types";
import { normalizeUserBasic, normalizeUserEconomy } from "../core/normalizeUser";

const repo = getRepository();

export const UserIdentity = {
    /**
     * Retrieves the full, up-to-date user profile from the repository.
     * Ensures economy and basic fields are normalized.
     */
    getProfile: (userId: string): User | null => {
        const users = repo.select("users") as User[];
        const user = users.find(u => u.id === userId);
        
        if (!user) return null;

        // Validate and Normalize Data on Read
        let cleanUser = normalizeUserBasic(user);
        cleanUser = normalizeUserEconomy(cleanUser);
        
        return cleanUser;
    },

    /**
     * Simple check if user exists and is active (not banned).
     */
    isActive: (userId: string): boolean => {
        const user = UserIdentity.getProfile(userId);
        if (!user) return false;
        if (user.isBanned) return false;
        return true;
    }
};
