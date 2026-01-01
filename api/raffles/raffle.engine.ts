// api/raffles/raffle.engine.ts
import { getRepository } from "../database/repository.factory";
import { NotificationDispatcher } from "../../services/notifications/notification.dispatcher";
import { TelemetryPRO } from "../../services/telemetry.pro";
import { AtomicLock } from "../security/atomicLock";
import type { Raffle, User, RaffleTicket } from "../../types";
import { SanityGuard } from "../../services/sanity.guard";
import { EconomyEngineV6 } from "../economy/economyEngineV6";
import { PrizeResolver } from "./prize.resolver";

const repo = getRepository();

export const RaffleEngineV2 = {
    /**
     * CRON-like task to update states based on time.
     * Should be called periodically or on page load.
     */
    checkRaffleTimers: () => {
        const raffles = repo.select("raffles") as Raffle[];
        const now = new Date();
        let updatesCount = 0;

        raffles.forEach(raffle => {
            // Skip if already finished
            if (['finished', 'winner_defined', 'ended'].includes(raffle.status)) return;

            const start = raffle.startsAt ? new Date(raffle.startsAt) : new Date(0);
            const end = new Date(raffle.endsAt);
            let newStatus = raffle.status;

            // 1. Scheduled -> Active
            if (raffle.status === 'scheduled' && now >= start && now < end) {
                newStatus = 'active';
            }

            // 2. Active -> Ended / Awaiting Draw
            if (raffle.status === 'active' && now >= end) {
                const tickets = repo.select("raffleTickets").filter((t: any) => t.raffleId === raffle.id);
                if (tickets.length > 0) {
                    newStatus = 'awaiting_draw';
                } else {
                    newStatus = 'ended'; // Ended without participants
                }
            }

            // Apply Update
            if (newStatus !== raffle.status) {
                repo.update("raffles", (r: any) => r.id === raffle.id, (r: any) => ({ ...r, status: newStatus }));
                updatesCount++;
                TelemetryPRO.event("raffle_status_change", { raffleId: raffle.id, oldStatus: raffle.status, newStatus });
            }
        });

        return updatesCount;
    },

    /**
     * Prepares the draw by validating state and fetching participants.
     */
    prepareDraw: (raffleId: string) => {
        const raffle = repo.select("raffles").find((r: any) => r.id === raffleId);
        if (!raffle) throw new Error("Sorteio não encontrado.");
        
        if (raffle.status !== 'awaiting_draw' && raffle.status !== 'active') { // Allow active force-draw if needed
             throw new Error(`Status inválido para sorteio: ${raffle.status}`);
        }

        const tickets = repo.select("raffleTickets").filter((t: any) => t.raffleId === raffleId);
        if (tickets.length === 0) throw new Error("Não há bilhetes vendidos.");

        // Get unique users
        const userIds = Array.from(new Set(tickets.map((t: any) => t.userId)));
        const users = repo.select("users").filter((u: any) => userIds.includes(u.id)).map(SanityGuard.user);

        return { raffle, tickets, users };
    },

    /**
     * Executes the draw securely.
     */
    confirmWinner: async (raffleId: string, winnerId: string, adminId: string) => {
        // 1. Lock
        if (!AtomicLock.lock(`raffle_draw:${raffleId}`)) {
            throw new Error("Sorteio em andamento.");
        }

        try {
            const raffle = repo.select("raffles").find((r: any) => r.id === raffleId) as Raffle;
            const winner = repo.select("users").find((u: any) => u.id === winnerId);

            if (!raffle || !winner) throw new Error("Dados inválidos.");
            if (raffle.status === 'winner_defined' || raffle.status === 'finished') throw new Error("Vencedor já definido.");

            // 2. Resolve Prize Type using Engine V2
            const prizeInfo = PrizeResolver.resolve(raffle);
            let updatedUser = { ...winner };
            const now = new Date();

            // 3. Distribute Rewards
            // A. Coins
            if ((prizeInfo.type === 'coins' || prizeInfo.type === 'hybrid') && prizeInfo.coinAmount > 0) {
                const ecoRes = await EconomyEngineV6.addCoins(winner.id, prizeInfo.coinAmount, `Prêmio Sorteio: ${raffle.itemName}`);
                if (ecoRes.updatedUser) updatedUser = ecoRes.updatedUser;
            }

            // B. Items (Item, Hybrid, or Legacy V1)
            if (['item', 'hybrid', 'legacy'].includes(prizeInfo.type) && prizeInfo.itemId) {
                 const redeemedItem = {
                    id: `ri-win-raf-${now.getTime()}`,
                    userId: winner.id,
                    userName: winner.name,
                    itemId: prizeInfo.itemId,
                    itemName: raffle.itemName,
                    itemPrice: 0, // Free
                    redeemedAt: now.toLocaleString('pt-BR'),
                    redeemedAtISO: now.toISOString(),
                    coinsBefore: updatedUser.coins, // Use updated coins from above if any
                    coinsAfter: updatedUser.coins,
                    status: 'Redeemed' as const
                };
                repo.insert("redeemedItems", redeemedItem);
            }
            
            // C. Custom
            // Just log it, no automated system effect other than notification

            // 4. Update User State (Unseen Win)
            updatedUser.unseenRaffleWin = { itemName: raffle.itemName, itemImageUrl: raffle.itemImageUrl };
            repo.update("users", (u: any) => u.id === winner.id, (u: any) => updatedUser);

            // 5. Update Raffle State
            const updatedRaffle = {
                ...raffle,
                status: 'finished', // V2 standardizes 'finished'
                winnerId: winner.id,
                winnerName: winner.artisticName || winner.name,
                winnerAvatar: winner.avatarUrl,
                winnerDefinedAt: now.toISOString()
            };
            repo.update("raffles", (r: any) => r.id === raffle.id, (r: any) => updatedRaffle);

            // 6. Notification
            NotificationDispatcher.systemInfo(
                winner.id,
                "🏆 Você Venceu o Sorteio!",
                `Parabéns! O prêmio "${raffle.itemName}" é seu.`
            );
            
            TelemetryPRO.event("raffle_winner_confirmed_v2", { 
                raffleId, 
                winnerId, 
                adminId,
                prizeType: prizeInfo.type
            });
            
            return { success: true, winner: updatedUser, raffle: updatedRaffle };

        } finally {
            AtomicLock.unlock(`raffle_draw:${raffleId}`);
        }
    }
};