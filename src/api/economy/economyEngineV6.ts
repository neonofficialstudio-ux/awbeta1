
import type { User } from '../../types';
import { getRepository } from "../database/repository.factory";
import { NotificationDispatcher } from "../../services/notifications/notification.dispatcher";
import { SanityGuard } from "../../services/sanity.guard";
import { safeUserId } from "../utils/safeUser";
import { rateLimit } from "../../api/anticheat/rateLimit";

const repo = getRepository();

/**
 * ECONOMY ENGINE V6.5 (Server-Authoritative)
 * Este arquivo agora é apenas um "cliente" que pede ações ao servidor.
 * A matemática financeira foi movida para `server.logic.ts`.
 */

const TRUSTED_SOURCES = ["Admin", "System", "Event", "Prêmio", "Bulk", "Automated", "Jackpot", "Sorteio", "Raffle", "mission_completion"];

const checkRateLimit = (uid: string, source: string) => {
    if (TRUSTED_SOURCES.some(prefix => source.includes(prefix))) {
        return true;
    }
    return rateLimit(`eco_tx:${uid}`, 60);
};

export const EconomyService = {
    
    addCoins: async (userId: string, amount: number, source: string) => {
        const uid = safeUserId(userId);
        if (!uid) return { success: false, error: "Invalid User ID" };

        if (!checkRateLimit(uid, source)) {
            throw new Error("RATE_LIMIT:FINANCEIRO");
        }

        // RPC CALL - SERVER AUTHORITATIVE
        try {
            const result = await repo.rpc!('add_coins', { userId: uid, amount, source });
            
            if (!result.success) {
                return { success: false, error: result.error };
            }

            // The updated user state comes back from the server logic
            const updatedUser = SanityGuard.user(result.updatedUser);

            NotificationDispatcher.coinsAdded(uid, amount, source);
            
            return { success: true, updatedUser, data: { amountAdded: amount } };
        } catch (e: any) {
             return { success: false, error: e.message || "Erro no servidor" };
        }
    },

    addXP: async (userId: string, amount: number, source: string) => {
        const uid = safeUserId(userId);
        if (!uid) return { success: false, error: "Invalid User ID" };

        // RPC CALL
        try {
            const result = await repo.rpc!('add_xp', { userId: uid, amount, source });
            
            if (!result.success) {
                return { success: false, error: "Falha ao adicionar XP" };
            }

            const updatedUser = SanityGuard.user(result.user);
            
            // Handle Level Up Notifications on Client Side (Visuals)
            if (result.levelUp) {
                NotificationDispatcher.levelUp(uid, updatedUser.level);
                NotificationDispatcher.xpAdded(uid, amount, source);
            }

            return { 
                success: true,
                updatedUser, 
                notifications: [], // Notifications dispatched directly
                data: { xpAdded: amount, levelUp: result.levelUp }
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },

    spendCoins: async (userId: string, amount: number, description: string) => {
        const uid = safeUserId(userId);
        if (!uid) return { success: false, error: "Invalid User ID" };

        // RPC CALL
        try {
            const result = await repo.rpc!('spend_coins', { userId: uid, amount, description });
            
            if (!result.success) {
                 return { success: false, error: result.error || "Saldo insuficiente" };
            }

            const updatedUser = SanityGuard.user(result.updatedUser);

            NotificationDispatcher.coinsSpent(uid, amount, description);

            return { success: true, updatedUser, data: { amountSpent: amount } };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },

    // Legacy method for compatibility
    processCheckIn: async (userId: string) => {
        // Since Checkin has complex logic (streak, bonus), we still do it here for now
        // But the REWARD part calls addCoins which is now secure.
        // Ideally, checkin logic should also move to RPC in Phase 2.
        // For now, we keep the engine logic but use secure addCoins.
        const { CheckinEngineV2 } = await import("./checkinEngineV2");
        const user = repo.select("users").find((u: any) => u.id === userId);
        
        if (!user) return { success: false, error: "User not found" };

        const result = CheckinEngineV2.process(SanityGuard.user(user));
        
        // Update Streak locally first (non-financial)
        const partialUpdate = { 
            ...user, 
            lastCheckIn: result.lastCheckIn, 
            weeklyCheckInStreak: result.newStreak 
        };
        await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => partialUpdate);
        
        // Securely Add Coins via RPC
        const ecoRes = await EconomyService.addCoins(userId, result.coinsGained, result.isBonus ? "Check-in + Bônus" : "Check-in Diário");
        
        return {
            success: true,
            updatedUser: ecoRes.updatedUser,
            data: result
        };
    }
};

export const EconomyEngineV6 = EconomyService;
