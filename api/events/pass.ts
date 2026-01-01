
import { getRepository } from "../database/repository.factory";
import { EconomyEngineV6 } from "../economy/economyEngineV6";
import { EventSessionEngine } from "./session";
import { createNotification } from "../helpers";
import type { EventPassType, User } from "../../types";
import { TelemetryPRO } from "../../services/telemetry.pro";

const repo = getRepository();

export const EventPassEngine = {
    purchaseEventPass: (userId: string, eventId: string, passType: EventPassType) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        const event = repo.select("events").find((e: any) => e.id === eventId);
        
        if (!user || !event) throw new Error("Dados inválidos");
        
        // 1. Check if already has pass
        if (user.eventSession && user.eventSession.eventId === eventId) {
            if (user.eventSession.passType === 'vip' && passType === 'normal') {
                 throw new Error("Você já possui um passe VIP ativo.");
            }
            // Allow upgrade from normal to VIP logic could be added here, but simplified for now:
            if (user.eventSession.passType === passType) {
                 throw new Error("Você já possui este passe.");
            }
        }

        // 2. Calculate Cost
        const cost = passType === 'vip' ? event.goldenPassCost : event.entryCost;

        // 3. Deduct Coins
        try {
            EconomyEngineV6.spendCoins(userId, cost, `Compra Passe ${passType.toUpperCase()}: ${event.title}`);
        } catch (e: any) {
            return { success: false, error: e.message };
        }

        // 4. Start Session
        const session = EventSessionEngine.startEventSession(userId, eventId, passType);
        
        // 5. Telemetry & Notification
        TelemetryPRO.event("event_pass_purchased", { userId, eventId, passType, cost });
        
        return { success: true, session };
    },

    verifyPass: (userId: string, eventId: string): EventPassType | null => {
        const session = EventSessionEngine.loadEventSession(userId);
        if (session && session.eventId === eventId) {
            return session.passType;
        }
        return null;
    },

    getPassBenefits: (passType: EventPassType) => {
        if (passType === 'vip') {
            return {
                xpMultiplier: 1.5,
                exclusiveMissions: true,
                dailyBoosters: true,
                vipRanking: true
            };
        }
        return {
            xpMultiplier: 1.0,
            exclusiveMissions: false,
            dailyBoosters: false,
            vipRanking: false
        };
    }
};
