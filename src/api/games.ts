// api/games.ts
import type { User, JackpotTicket } from '../types';
import * as db from './mockData';
import { withLatency, updateUserInDb } from './helpers';
import { logEconomyEvent } from './telemetry/economyTelemetry';
import { addPerformanceLog } from './logs/performance';
import { processStorePurchase } from './economy/economy'; 
import { EconomyEngineV6 } from './economy/economyEngineV6'; // Use V6 Directly
import { AtomicLock } from './security/atomicLock';
import { ValueCore } from './security/valueCore';
import { rateLimit } from "./anticheat/rateLimit";
import { runAdaptiveShield } from "./anticheat/adaptiveShield";
import { detectMultiAccount } from "./anticheat/multiAccountDetector";
import { getRepository } from "./database/repository.factory";
import { SanitizeString } from "../core/sanitizer.core"; // Updated path
import { saveMockDb } from "./database/mock-db";
import { isSupabaseProvider } from "./core/backendGuard";

const repo = getRepository();

if (isSupabaseProvider()) {
    throw new Error("Jackpot ainda não disponível em Supabase");
}

/**
 * Logic for the Progressive Jackpot (Single Ticket).
 */
export const buyJackpotTicket = (userId: string) => withLatency(async () => {
    return await internalBuyJackpot(userId, 1);
});

/**
 * Logic for buying multiple tickets at once (V13.6).
 */
export const buyJackpotTicketsBulk = (userId: string, quantity: number) => withLatency(async () => {
    return await internalBuyJackpot(userId, quantity);
});

// Internal helper to handle logic without double latency
const internalBuyJackpot = async (userId: string, quantity: number) => {
    const uid = SanitizeString(userId);
    if (!uid) return { success: false, message: "User ID invalid" };
    if (quantity < 1) return { success: false, message: "Quantidade inválida" };

    if (!rateLimit(`jackpot_buy:${uid}`, 20)) { // Slight bump for bulk ops
      return { success: false, message: "Muitas tentativas de compra. Aguarde." };
    }

    // Check State & Time Window
    if (db.jackpotData.status === 'active') {
        const now = new Date();
        if (new Date(db.jackpotData.nextDraw) < now) {
            db.jackpotData.status = 'in_apuration';
            saveMockDb();
            return { success: false, message: "Jackpot encerrado! Aguarde a apuração." };
        }
    } else if (db.jackpotData.status === 'waiting_start') {
         if (db.jackpotData.nextStartDate && new Date(db.jackpotData.nextStartDate) <= new Date()) {
             db.jackpotData.status = 'active';
             if (!db.jackpotData.nextDraw || new Date(db.jackpotData.nextDraw) < new Date()) {
                 db.jackpotData.nextDraw = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
             }
             saveMockDb();
         } else {
             const startStr = db.jackpotData.nextStartDate ? new Date(db.jackpotData.nextStartDate).toLocaleString() : 'breve';
             return { success: false, message: `O próximo Jackpot começa em ${startStr}.` };
         }
    } else if (db.jackpotData.status === 'in_apuration') {
        return { success: false, message: "Jackpot em apuração. Aguarde." };
    }

    if (!AtomicLock.lock(`jackpot:${uid}`)) {
        return { success: false, message: "Aguarde processamento anterior." };
    }

    try {
        const user = repo.select("users").find((u: any) => u.id === uid);
        if (!user) throw new Error("User not found");

        // Phase 13.5: Check Limits (Updated for V3.1 perUser)
        const userTicketsCount = db.jackpotData.tickets.filter(t => t.userId === uid).length;
        
        // 1. Global Limit Check
        const globalLimit = db.jackpotData.ticketLimits.global;
        if (globalLimit > 0 && (db.jackpotData.tickets.length + quantity) > globalLimit) {
            return { success: false, message: `Jackpot atingiu a capacidade máxima global. Restam apenas ${globalLimit - db.jackpotData.tickets.length} tickets.` };
        }

        // 2. Per-User Limit Check (Replaces Plan Limit)
        const userLimit = db.jackpotData.ticketLimits.perUser;
        if (userLimit > 0 && (userTicketsCount + quantity) > userLimit) {
             const remaining = Math.max(0, userLimit - userTicketsCount);
             return { success: false, message: `Limite individual (${userLimit}) atingido. Você pode comprar mais ${remaining} tickets.` };
        }

        const ticketPrice = db.jackpotData.ticketPrice;
        const totalCost = ticketPrice * quantity;
        
        // Use V6 Engine to Spend (Handles Validation, Ledger, Telemetry, Freeze)
        const spendResult = await EconomyEngineV6.spendCoins(uid, totalCost, `Jackpot Ticket (x${quantity})`);
        
        if (!spendResult.success || !spendResult.updatedUser) {
             return { success: false, message: spendResult.error || "Saldo insuficiente." };
        }

        const updatedUser = spendResult.updatedUser;
        const nowISO = new Date().toISOString();
        const potIncrement = Math.floor(totalCost * 0.5);

        // Loop to generate tickets
        for (let i = 0; i < quantity; i++) {
            const secureTicketId = ValueCore.generateSecureID('JKT', `${uid}:${Date.now()}:${i}`);
            const secureTicket: JackpotTicket = {
                id: secureTicketId,
                userId: uid,
                userName: updatedUser.name,
                purchasedAt: nowISO
            };
            db.jackpotData.tickets.push(secureTicket);
        }
        
        // Update Pot
        db.jackpotData.currentValue += potIncrement;
        
        // Log Sales History (Phase 13.5)
        db.jackpotData.salesHistory.push({
            userId: uid,
            amount: totalCost,
            timestamp: nowISO
        });

        saveMockDb();

        return { 
            success: true, 
            newBalance: updatedUser.coins, 
            jackpotValue: db.jackpotData.currentValue,
            updatedUser,
            message: `Você comprou ${quantity} ticket(s)!`
        };
    } finally {
        AtomicLock.unlock(`jackpot:${uid}`);
    }
};

/**
 * Helper for calculating user limits frontend-side securely
 * V3.1 Update: Uses perUser logic
 */
export const getUserJackpotStats = (userId: string) => {
    const user = repo.select("users").find((u: any) => u.id === userId);
    if (!user) return { bought: 0, limit: 0, remaining: 0 };

    const bought = db.jackpotData.tickets.filter(t => t.userId === userId).length;
    
    // Check user limit specifically
    // @ts-ignore
    const userLimit = db.jackpotData.ticketLimits.perUser || 0;
    
    // Check global limit too for 'remaining' calculation context
    const globalRemaining = db.jackpotData.ticketLimits.global > 0 
        ? Math.max(0, db.jackpotData.ticketLimits.global - db.jackpotData.tickets.length)
        : Infinity;
        
    let limitDisplay = userLimit;
    let effectiveRemaining = Infinity;

    if (userLimit > 0) {
        effectiveRemaining = Math.max(0, userLimit - bought);
    }
    
    // Combine with global constraint for UI truth
    const finalRemaining = Math.min(effectiveRemaining, globalRemaining);

    return { 
        bought, 
        limit: userLimit, // The configured user limit
        remaining: finalRemaining // The actual buyable amount right now
    };
}

/**
 * Logic for Cyber Crates.
 */
export const openCyberCrate = (userId: string, crateType: 'supply' | 'elite') => withLatency(async () => {
    const uid = SanitizeString(userId);
    if (!uid) return { success: false, message: "User ID invalid" };

    if (!AtomicLock.lock(`crate:${uid}`)) {
        return { success: false, message: "Abrindo caixa..." };
    }

    try {
        const user = repo.select("users").find((u: any) => u.id === uid);
        if (!user) throw new Error("User not found");

        const COST = crateType === 'supply' ? 50 : 200;

        // 1. Spend Coins via V6
        const spendResult = await EconomyEngineV6.spendCoins(uid, COST, `Abertura Cyber Crate (${crateType})`);
        if (!spendResult.success || !spendResult.updatedUser) {
            return { success: false, message: spendResult.error || "Saldo insuficiente." };
        }

        let currentUser = spendResult.updatedUser as User;
        
        // 2. Calculate Reward
        const rand = Math.random() * 100;
        let rewardType: 'xp' | 'coin' = 'xp';
        let amount = 0;
        let message = "";

        if (crateType === 'supply') {
            if (rand < 70) {
                rewardType = 'xp'; amount = 15; message = "Consolação: +15 XP";
            } else if (rand < 90) {
                rewardType = 'coin'; amount = 25; message = "Reembolso Parcial: +25 Coins";
            } else if (rand < 99) {
                rewardType = 'coin'; amount = 60; message = "LUCRO! +60 Coins";
            } else {
                rewardType = 'coin'; amount = 200; message = "JACKPOT! +200 Coins!";
            }
        } else {
             if (rand < 60) {
                rewardType = 'xp'; amount = 100; message = "Consolação: +100 XP";
            } else if (rand < 85) {
                rewardType = 'coin'; amount = 100; message = "Reembolso Parcial: +100 Coins";
            } else if (rand < 96) {
                rewardType = 'coin'; amount = 300; message = "LUCRO! +300 Coins";
            } else {
                rewardType = 'coin'; amount = 1000; message = "JACKPOT ELITE! +1.000 Coins!";
            }
        }

        // 3. Grant Reward via V6
        let grantResult;
        if (rewardType === 'coin') {
             grantResult = await EconomyEngineV6.addCoins(uid, amount, 'Prêmio Cyber Crate');
        } else {
             grantResult = await EconomyEngineV6.addXP(uid, amount, 'Prêmio Cyber Crate');
        }
        
        if (grantResult.updatedUser) {
            currentUser = grantResult.updatedUser;
        }

        return { success: true, rewardType, amount, message, updatedUser: currentUser };
    } finally {
        AtomicLock.unlock(`crate:${uid}`);
    }
});

export const fetchJackpotState = () => withLatency(() => {
    // Auto-transition from waiting if date passed (Self-Healing Read)
    if (db.jackpotData && db.jackpotData.status === 'waiting_start') {
        if (db.jackpotData.nextStartDate && new Date(db.jackpotData.nextStartDate) <= new Date()) {
             db.jackpotData.status = 'active';
             // Ensure valid draw date if missing or old
             if (!db.jackpotData.nextDraw || new Date(db.jackpotData.nextDraw) < new Date()) {
                 db.jackpotData.nextDraw = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
             }
             saveMockDb();
        }
    }
    return { ...db.jackpotData };
});
