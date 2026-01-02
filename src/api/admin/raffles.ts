

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
import { assertMockProvider } from "../core/backendGuard";

const repo = getRepository();
const ensureMockBackend = (feature: string) => assertMockProvider(`admin.raffles.${feature}`);

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

export const saveRaffle = (raffleData: any) => withLatency(() => {
    ensureMockBackend('saveRaffle');
    const safeData = { ...raffleData };
    if (!safeData.id) {
         safeData.id = `r-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }
    
    const existing = repo.select("raffles").find((r:any) => r.id === safeData.id);
    if (existing) {
        repo.update("raffles", (r:any) => r.id === safeData.id, (r:any) => safeData);
    } else {
        repo.insert("raffles", safeData);
    }
    return { success: true, raffle: safeData };
});

export const deleteRaffle = (raffleId: string) => withLatency(() => {
    ensureMockBackend('deleteRaffle');
    repo.delete("raffles", (r:any) => r.id === raffleId);
    // Also delete tickets?
    repo.delete("raffleTickets", (t:any) => t.raffleId === raffleId);
    return { success: true };
});

export const drawRaffleWinner = (raffleId: string) => withLatency(async () => {
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
