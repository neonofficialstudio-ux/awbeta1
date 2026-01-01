
import type { User } from '../../types';
import { getRepository } from "../database/repository.factory";
import { NotificationDispatcher } from "../../services/notifications/notification.dispatcher";
import { SanityGuard } from "../../services/sanity.guard";
import { safeUserId } from "../utils/safeUser";
import { rateLimit } from "../../api/anticheat/rateLimit";
import { config } from "../../core/config"; // Import config check

const repo = getRepository();

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

        // RPC CALL - SERVER AUTHORITATIVE (Works for both Mock and Supabase via repo factory)
        try {
            const result = await repo.rpc!('add_coins', { userId: uid, amount, source });
            
            if (!result.success) {
                return { success: false, error: result.error };
            }

            const updatedUser = SanityGuard.user(result.updatedUser || result.user); // Supabase returns 'user' in some RPCs

            NotificationDispatcher.coinsAdded(uid, amount, source);
            
            return { success: true, updatedUser, data: { amountAdded: amount } };
        } catch (e: any) {
             return { success: false, error: e.message || "Erro no servidor" };
        }
    },

    addXP: async (userId: string, amount: number, source: string) => {
        const uid = safeUserId(userId);
        if (!uid) return { success: false, error: "Invalid User ID" };

        try {
            const result = await repo.rpc!('add_xp', { userId: uid, amount, source });
            
            if (!result.success) {
                return { success: false, error: "Falha ao adicionar XP" };
            }

            const updatedUser = SanityGuard.user(result.user);
            
            if (result.levelUp) {
                NotificationDispatcher.levelUp(uid, updatedUser.level);
                NotificationDispatcher.xpAdded(uid, amount, source);
            }

            return { 
                success: true,
                updatedUser, 
                notifications: [], 
                data: { xpAdded: amount, levelUp: result.levelUp }
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },

    spendCoins: async (userId: string, amount: number, description: string) => {
        const uid = safeUserId(userId);
        if (!uid) return { success: false, error: "Invalid User ID" };

        try {
            const result = await repo.rpc!('spend_coins', { userId: uid, amount, description });
            
            if (!result.success) {
                 return { success: false, error: result.error || "Saldo insuficiente" };
            }

            const updatedUser = SanityGuard.user(result.updatedUser || result.user);

            NotificationDispatcher.coinsSpent(uid, amount, description);

            return { success: true, updatedUser, data: { amountSpent: amount } };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },

    processCheckIn: async (userId: string) => {
        // Se estiver no Supabase, a lógica do Check-in deve ser via RPC direto para garantir atomicidade
        if (config.useSupabase) {
             // Esta função é chamada apenas pelo legacy users.ts no mock mode geralmente.
             // Se cair aqui no modo Supabase, redirecionamos para o RPC.
             const res = await repo.rpc!('perform_daily_checkin', { userId });
             if(!res.success) return { success: false, error: res.error };
             
             // Fetch updated user state
             const userList = await repo.selectAsync("users");
             const updatedUser = userList.find((u:any) => u.id === userId);
             
             return { success: true, updatedUser, data: { coinsGained: res.coins_gained, newStreak: res.new_streak } };
        }

        // Fallback Mock Logic
        const { CheckinEngineV2 } = await import("./checkinEngineV2");
        const user = repo.select("users").find((u: any) => u.id === userId);
        
        if (!user) return { success: false, error: "User not found" };

        const result = CheckinEngineV2.process(SanityGuard.user(user));
        
        const partialUpdate = { 
            ...user, 
            lastCheckIn: result.lastCheckIn, 
            weeklyCheckInStreak: result.newStreak 
        };
        await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => partialUpdate);
        
        const ecoRes = await EconomyService.addCoins(userId, result.coinsGained, result.isBonus ? "Check-in + Bônus" : "Check-in Diário");
        
        return {
            success: true,
            updatedUser: ecoRes.updatedUser,
            data: result
        };
    }
};

export const EconomyEngineV6 = EconomyService;
