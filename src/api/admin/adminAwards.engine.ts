
import { getRepository } from "../database/repository.factory";
import { normalizeAward } from "../core/normalizeAward";
import { TelemetryPRO } from "../../services/telemetry.pro";
import type { FeaturedWinner, UnifiedAwardEntry, User, Event, Raffle, ManualAward } from "../../types";
import * as db from "../mockData";
import { safeDate } from "../utils/dateSafe";

const repo = getRepository();

export const AdminAwardsEngine = {
    /**
     * Adds a manual award (Featured Winner) to the database.
     */
    add: (payload: any): FeaturedWinner => {
        const award = normalizeAward(payload);
        
        if (!award.userId || !award.prizeTitle) {
            throw new Error("Dados inválidos para premiação manual.");
        }

        // Persist to 'featuredWinners' (mapped to legacy structure in mockData)
        const repoInsert = repo.insert("featuredWinners" as any, award);
        
        TelemetryPRO.event("manual_award_added", { 
            userId: award.userId, 
            title: award.prizeTitle,
            admin: true 
        });

        return award as FeaturedWinner;
    },

    /**
     * Aggregates awards from Events, Raffles, Jackpots and Manual entries into a single history stream.
     */
    getUnifiedAwardHistory: (): UnifiedAwardEntry[] => {
        const allUsers = repo.select("users") as User[];
        const events = repo.select("events") as Event[];
        const raffles = repo.select("raffles") as Raffle[];
        const featuredWinners = db.featuredWinnersData as FeaturedWinner[];
        const manualAwards = db.manualAwardsData as ManualAward[];
        const jackpotHistory = db.jackpotData?.history || [];

        const unified: UnifiedAwardEntry[] = [];

        // 1. Event Winners
        events.filter(e => e.status === 'closed' && e.winners && e.winners.length > 0).forEach(event => {
            event.winners!.forEach(w => {
                unified.push({
                    id: `award-evt-${event.id}-${w.userId}`, type: 'event', sourceTitle: `Evento: ${event.title}`,
                    userId: w.userId, userName: w.userName, userAvatar: w.userAvatar,
                    rewardDescription: `${w.rewardDescription} (Rank #${w.rank})`,
                    dateISO: event.closedAt || new Date().toISOString(), originalId: event.id
                });
            });
        });

        // 2. Raffle Winners
        raffles.filter(r => r.status === 'finished' && r.winnerId).forEach(raffle => {
            unified.push({
                id: `award-raf-${raffle.id}`, type: 'raffle', sourceTitle: `Sorteio: ${raffle.itemName}`,
                userId: raffle.winnerId!, userName: raffle.winnerName || 'Unknown', userAvatar: raffle.winnerAvatar,
                rewardDescription: 'Item entregue', dateISO: raffle.endsAt, originalId: raffle.id
            });
        });

        // 3. Jackpot Winners
        jackpotHistory.forEach(round => {
             unified.push({
                id: `award-jp-${round.id}`, type: 'jackpot', sourceTitle: 'Jackpot Progressivo',
                userId: round.winnerId, userName: round.winnerName,
                rewardDescription: `${round.prizeAmount.toLocaleString()} Coins`,
                dateISO: round.drawnAt, originalId: round.id
             });
        });

        // 4. Manual Awards (V8.3)
        manualAwards.forEach(award => {
            const user = allUsers.find(u => u.id === award.userId);
            let desc = award.customTitle || 'Premiação Administrativa';
            if (award.type === 'coins') desc = `${award.amount} Coins`;
            if (award.type === 'xp') desc = `${award.amount} XP`;
            if (award.type === 'item') desc = `Item (ID: ${award.itemId})`;

            unified.push({
                id: award.id, type: 'manual', sourceTitle: 'Prêmio Manual',
                userId: award.userId, userName: user?.name || 'Unknown', userAvatar: user?.avatarUrl,
                rewardDescription: desc, dateISO: award.dateISO, originalId: award.id
            });
        });

        // 5. Legacy Featured Winners
        featuredWinners.forEach(mw => {
            const user = allUsers.find(u => u.id === mw.userId);
            // FIX: Safely parsing date
            const safeDateStr = (safeDate(mw.date) || new Date()).toISOString();

            unified.push({
                id: `award-legacy-${mw.id}`, type: 'manual', sourceTitle: 'Hall da Fama (Legacy)',
                userId: mw.userId, userName: user?.name || 'Unknown', userAvatar: user?.avatarUrl,
                rewardDescription: mw.prizeTitle, dateISO: safeDateStr, originalId: mw.id
            });
        });

        return unified.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
    }
};
