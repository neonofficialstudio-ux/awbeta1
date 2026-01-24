
import type { User } from '../../types';
import { getRepository } from "../database/repository.factory";
import { NotificationDispatcher } from "../../services/notifications/notification.dispatcher";
import { SanityGuard } from "../../services/sanity.guard";
import { safeUserId } from "../utils/safeUser";
import { rateLimit } from "../../api/anticheat/rateLimit";
import { getSupabase } from "../supabase/client";
import { config } from "../../core/config";

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
    processCheckIn: async (_userId?: string) => {
        // ✅ Produção/Supabase: fonte da verdade é a RPC daily_checkin
        if (config.backendProvider === "supabase") {
            const supabase = getSupabase();
            if (!supabase) throw new Error("Supabase não disponível.");

            const { data, error } = await supabase.rpc("daily_checkin");
            if (error) {
                console.error("[daily_checkin] rpc error:", error);
                throw new Error(error.message || "Falha ao realizar check-in.");
            }

            // daily_checkin retorna json com:
            // ok, already_checked_in, ref_id, before/after...
            return data;
        }

        // DEV/MOCK: mantém engine antiga (se existir)
        // return CheckinEngineV2.processCheckInMock();
        throw new Error("Check-in mock não disponível neste ambiente.");
    }
};

export const EconomyEngineV6 = EconomyService;
