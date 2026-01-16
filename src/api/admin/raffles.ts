

// api/admin/raffles.ts

import { RaffleEngineV2 } from "../raffles/raffle.engine";
import { withLatency } from "../helpers";
import * as db from '../mockData';
import { logAdminAction } from "../logs";
import { getRepository } from "../database/repository.factory";
import { saveMockDb } from "../database/mock-db";
import { EconomyEngineV6 } from "../economy/economyEngineV6";
import { NotificationDispatcher } from "../../services/notifications/notification.dispatcher";
import type { JackpotRound } from "../../types";
import { assertMockProvider, assertSupabaseProvider, isSupabaseProvider } from "../core/backendGuard";
import { getSupabase } from "../supabase/client";

const repo = getRepository();
const ensureMockBackend = (feature: string) => assertMockProvider(`admin.raffles.${feature}`);

const requireSupabaseClient = () => {
    const client = getSupabase();
    if (!client) throw new Error("[Supabase] Client not initialized");
    return client;
};

export async function adminCreateRaffle(raffleData: any) {
    assertSupabaseProvider('admin.raffles.create');

    const supabase = requireSupabaseClient();

    // Map camelCase (UI) -> p_* (RPC)
    const payload = {
        p_item_name: raffleData.itemName,
        p_item_image_url: raffleData.itemImageUrl,
        p_ticket_price: Number(raffleData.ticketPrice ?? 0),
        p_ticket_limit_per_user: Number(raffleData.ticketLimitPerUser ?? 0),
        p_starts_at: raffleData.startsAt ?? null,
        p_ends_at: raffleData.endsAt,
        p_status: raffleData.status ?? 'active',
        p_prize_type: raffleData.prizeType ?? null,
        p_coin_reward: Number(raffleData.coinReward ?? 0) || null,
        p_custom_reward_text: raffleData.customRewardText ?? null,
        p_meta: raffleData.meta ?? {},
    };

    const { data, error } = await supabase.rpc("admin_create_raffle", payload);

    if (error) throw error;
    return data;
}

export async function adminDrawRaffle(raffleId: string) {
    assertSupabaseProvider('admin.raffles.draw');

    const supabase = requireSupabaseClient();
    const { data, error } = await supabase.rpc("admin_draw_raffle", {
        p_raffle: raffleId,
        p_ref_id: crypto.randomUUID(),
    });

    if (error) throw error;
    return data;
}

export async function adminPreviewDrawRaffle(raffleId: string, refId: string) {
    assertSupabaseProvider('admin.raffles.preview_draw');
    const supabase = requireSupabaseClient();

    const { data, error } = await supabase.rpc("admin_preview_raffle_draw", {
        p_raffle: raffleId,
        p_ref_id: refId,
    });

    if (error) throw error;
    return data;
}

export async function adminDrawRaffleWithRef(raffleId: string, refId: string) {
    assertSupabaseProvider('admin.raffles.draw_with_ref');
    const supabase = requireSupabaseClient();

    const { data, error } = await supabase.rpc("admin_draw_raffle", {
        p_raffle: raffleId,
        p_ref_id: refId,
    });

    if (error) throw error;
    return data;
}
export async function adminAwardManual(payload: {
    userId: string;
    prizeType: 'coins' | 'item' | 'hybrid' | 'manual_text';
    itemId?: string | null;
    coinReward?: number | null;
    customText?: string | null;
}) {
    assertSupabaseProvider('admin.raffles.award_manual');
    const supabase = requireSupabaseClient();

    const { data, error } = await supabase.rpc('admin_award_manual', {
        p_user: payload.userId,
        p_prize_type: payload.prizeType,
        p_item_id: payload.itemId ?? null,
        p_coin_reward: (payload.coinReward ?? 0) > 0 ? Number(payload.coinReward) : null,
        p_custom_text: payload.customText ?? null,
        p_ref_id: crypto.randomUUID(),
    });

    if (error) throw error;
    return data;
}

export const adminPrepareRaffleDraw = (raffleId: string) => withLatency(() => {
    ensureMockBackend('adminPrepareRaffleDraw');
    return RaffleEngineV2.prepareDraw(raffleId);
});

export const adminConfirmRaffleWinner = (raffleId: string, winnerId: string, adminId: string) => withLatency(() => {
    ensureMockBackend('adminConfirmRaffleWinner');
    return RaffleEngineV2.confirmWinner(raffleId, winnerId, adminId);
});

export const adminForceUpdateRaffleStates = () => withLatency(() => {
    ensureMockBackend('adminForceUpdateRaffleStates');
    const count = RaffleEngineV2.checkRaffleTimers();
    return { success: true, updates: count };
});

// V1.0: Manual Highlight Control
export const adminSetHighlightedRaffle = (raffleId: string) => withLatency(() => {
    ensureMockBackend('adminSetHighlightedRaffle');
    db.setHighlightedRaffleIdData(raffleId);
    logAdminAction('Set Highlighted Raffle', { raffleId });
    return { success: true, highlightedId: raffleId };
});

export const saveRaffle = (raffleData: any) => withLatency(async () => {
    // Supabase path
    if (isSupabaseProvider()) {
        const supabase = requireSupabaseClient();

        // EDIT: update direto na tabela (RLS admin já permite)
        if (raffleData?.id) {
            const updatePayload: any = {
                item_name: raffleData.itemName,
                item_image_url: raffleData.itemImageUrl,
                ticket_price: Number(raffleData.ticketPrice ?? 0),
                ticket_limit_per_user: Number(raffleData.ticketLimitPerUser ?? 0),
                starts_at: raffleData.startsAt ?? null,
                ends_at: raffleData.endsAt,
                status: raffleData.status ?? 'active',
                prize_type: raffleData.prizeType ?? null,
                coin_reward: (raffleData.coinReward ?? 0) > 0 ? Number(raffleData.coinReward) : null,
                custom_reward_text: raffleData.customRewardText ?? null,
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('raffles')
                .update(updatePayload)
                .eq('id', raffleData.id)
                .select('*')
                .single();

            if (error) throw error;
            return { success: true, raffle: data };
        }

        // CREATE: usa RPC (já audita no admin_audit_log)
        const created = await adminCreateRaffle(raffleData);

        // ✅ Hardening: garantir item_id preenchido quando o prêmio é item/híbrido
        // (não depende do RPC aceitar p_item_id)
        try {
            const createdId =
                (created && typeof created === 'object' && (created as any).id) ? (created as any).id :
                (typeof created === 'string' ? created : null);

            if (createdId && (raffleData?.prizeType === 'item' || raffleData?.prizeType === 'hybrid') && raffleData?.itemId) {
                await supabase
                    .from('raffles')
                    .update({ item_id: raffleData.itemId })
                    .eq('id', createdId);
            }
        } catch {
            // não quebra o create caso o update falhe
        }

        return { success: true, created };
    }

    // MOCK path (mantém comportamento antigo)
    ensureMockBackend('saveRaffle');

    const safeData = { ...raffleData };
    if (!safeData.id) {
        safeData.id = `r-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }

    const existing = repo.select("raffles").find((r: any) => r.id === safeData.id);
    if (existing) {
        repo.update("raffles", (r: any) => r.id === safeData.id, () => safeData);
    } else {
        repo.insert("raffles", safeData);
    }
    return { success: true, raffle: safeData };
});

export const deleteRaffle = (raffleId: string) => withLatency(async () => {
    if (isSupabaseProvider()) {
        const supabase = requireSupabaseClient();

        // tenta apagar tickets primeiro (caso não tenha ON DELETE CASCADE)
        const { error: ticketsErr } = await supabase
            .from('raffle_tickets')
            .delete()
            .eq('raffle_id', raffleId);

        if (ticketsErr) throw ticketsErr;

        const { error: raffleErr } = await supabase
            .from('raffles')
            .delete()
            .eq('id', raffleId);

        if (raffleErr) throw raffleErr;

        return { success: true };
    }

    ensureMockBackend('deleteRaffle');
    repo.delete("raffles", (r: any) => r.id === raffleId);
    repo.delete("raffleTickets", (t: any) => t.raffleId === raffleId);
    return { success: true };
});

export const drawRaffleWinner = (raffleId: string) => withLatency(async () => {
    if (isSupabaseProvider()) {
        return adminDrawRaffle(raffleId);
    }
    ensureMockBackend('drawRaffleWinner');
    try {
        const { tickets } = RaffleEngineV2.prepareDraw(raffleId);
        if (tickets.length === 0) return { success: false, error: "No tickets found" };
        
        const winnerTicket = tickets[Math.floor(Math.random() * tickets.length)];
        return await RaffleEngineV2.confirmWinner(raffleId, winnerTicket.userId, 'admin');
    } catch(e:any) {
        return { success: false, error: e.message };
    }
});

// New V13.0 Feature: Schedule New Jackpot Cycle
export const adminScheduleJackpot = (config: {
    startDate: string;
    endDate: string;
    initialValue: number;
    ticketPrice: number;
}) => withLatency(() => {
    ensureMockBackend('adminScheduleJackpot');
    if (!db.jackpotData) return { success: false, error: "Jackpot not initialized" };

    // 1. Archive existing tickets (if any remain from unexpected state)
    // Usually cleared on draw, but safe to clear here on reset
    db.jackpotData.tickets = [];

    // 2. Update Config
    db.jackpotData.currentValue = config.initialValue;
    db.jackpotData.ticketPrice = config.ticketPrice;
    db.jackpotData.nextDraw = config.endDate;
    
    // 3. Set Lifecycle
    db.jackpotData.nextStartDate = config.startDate;
    
    // Determine immediate status based on start date
    const now = new Date();
    const start = new Date(config.startDate);
    
    if (now >= start) {
        db.jackpotData.status = 'active';
    } else {
        db.jackpotData.status = 'waiting_start';
    }

    saveMockDb();
    logAdminAction('Scheduled New Jackpot', config);

    return { success: true, status: db.jackpotData.status };
});

// V13.6 Fix: Ensure limits merge correctly
export const adminEditJackpot = (config: { newValue?: number; newDate?: string; ticketPrice?: number; ticketLimits?: any }) => withLatency(() => {
    ensureMockBackend('adminEditJackpot');
    if (!db.jackpotData) return { success: false, error: "Jackpot data not initialized" };
    
    if (config.newValue !== undefined) db.jackpotData.currentValue = config.newValue;
    if (config.newDate) db.jackpotData.nextDraw = config.newDate;
    if (config.ticketPrice !== undefined) db.jackpotData.ticketPrice = config.ticketPrice;
    
    if (config.ticketLimits) {
        // Merge limits carefully to avoid overwriting structure
        db.jackpotData.ticketLimits = {
            ...db.jackpotData.ticketLimits,
            ...config.ticketLimits,
            // Ensure perUser is set directly if provided at root of limits
            perUser: config.ticketLimits.perUser !== undefined ? config.ticketLimits.perUser : db.jackpotData.ticketLimits?.perUser
        };
    }

    saveMockDb();
    return { success: true };
});

export const adminDrawJackpot = () => withLatency(() => {
    ensureMockBackend('adminDrawJackpot');
    const tickets = db.jackpotData?.tickets || [];
    if (tickets.length === 0) return { success: false, error: "No tickets" };
    
    const winnerTicket = tickets[Math.floor(Math.random() * tickets.length)];
    const winner = repo.select("users").find((u:any) => u.id === winnerTicket.userId);
    
    if (!winner) return { success: false, error: "Winner user not found" };
    
    const prize = db.jackpotData?.currentValue || 0;
    
    // Use V6 Engine
    EconomyEngineV6.addCoins(winner.id, prize, `Jackpot Winner`);
    
    const round: JackpotRound = {
        id: `jkr-${Date.now()}`,
        winnerId: winner.id,
        winnerName: winner.artisticName || winner.name,
        prizeAmount: prize,
        drawnAt: new Date().toISOString(),
        totalTickets: tickets.length
    };
    
    if (db.jackpotData) {
        db.jackpotData.history.unshift(round);
        db.jackpotData.currentValue = 15000; 
        db.jackpotData.tickets = [];
        db.jackpotData.nextDraw = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        saveMockDb();
    }
    
    NotificationDispatcher.systemInfo(winner.id, "JACKPOT!", `Você ganhou o prêmio acumulado de ${prize.toLocaleString()} LC!`);
    
    return { success: true, winner, prize };
});

export const adminInjectJackpot = (amount: number) => withLatency(() => {
    ensureMockBackend('adminInjectJackpot');
    if (db.jackpotData) {
        db.jackpotData.currentValue += amount;
        saveMockDb();
        return { success: true, newValue: db.jackpotData.currentValue };
    }
    return { success: false, error: "Jackpot data not initialized" };
});

export const fetchJackpotAnalytics = () => withLatency(() => {
    ensureMockBackend('fetchJackpotAnalytics');
    if (!db.jackpotData) return { currentValue: 0, ticketsCount: 0, uniqueUsers: 0, history: [] };

    return {
        currentValue: db.jackpotData.currentValue,
        ticketsCount: db.jackpotData.tickets.length,
        uniqueUsers: new Set(db.jackpotData.tickets.map(t => t.userId)).size,
        history: db.jackpotData.history
    };
});

// New Helper for detailed stats view in Admin
export const getJackpotDetailedStats = () => {
    ensureMockBackend('getJackpotDetailedStats');
    if (!db.jackpotData) return null;
    
    const tickets = db.jackpotData.tickets;
    const users = repo.select("users");
    
    // Group tickets by user
    const participantsMap = new Map();
    tickets.forEach(t => {
        if(!participantsMap.has(t.userId)) {
            const u = users.find((x:any) => x.id === t.userId);
            participantsMap.set(t.userId, { 
                userId: t.userId, 
                ticketCount: 0,
                name: u?.name || 'Unknown',
                artisticName: u?.artisticName || 'Unknown',
                avatarUrl: u?.avatarUrl,
                plan: u?.plan
            });
        }
        participantsMap.get(t.userId).ticketCount++;
    });
    
    const participants = Array.from(participantsMap.values()).map((p: any) => ({
        ...p,
        chance: tickets.length > 0 ? (p.ticketCount / tickets.length) * 100 : 0,
        isSuspicious: p.ticketCount > 500 // Arbitrary threshold
    })).sort((a: any, b: any) => b.ticketCount - a.ticketCount);
    
    return {
        totalTickets: tickets.length,
        totalParticipants: participants.length,
        participants
    };
};
