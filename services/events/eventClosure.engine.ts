
import { getRepository } from "../../api/database/repository.factory";
import { EventRankingEngineV5 } from "../ranking/eventRanking.engine";
import { EconomyEngineV6 } from "../../api/economy/economyEngineV6";
import { NotificationDispatcher } from "../notifications/notification.dispatcher";
import type { Event, EventWinner } from "../../types/event";

const repo = getRepository();

export const EventClosureEngine = {
    /**
     * Closes an event, calculates winners, distributes prizes, and updates status.
     */
    closeEvent: (eventId: string) => {
        const event = repo.select("events").find((e: any) => e.id === eventId) as Event;
        if (!event) throw new Error("Evento não encontrado.");
        
        if (event.status === 'closed') {
            return { success: false, error: "Evento já está encerrado." };
        }

        // 1. Get Final Ranking
        const ranking = EventRankingEngineV5.getEventRanking(eventId);
        
        // 2. Determine Winners (Top 3 for MVP, can be dynamic based on rewardsConfig)
        const winners: EventWinner[] = [];
        
        // Hardcoded prize logic for V7.8 Hotfix (can be dynamic later via rewardsConfig)
        const prizes = [
            { rank: 1, coins: 1000, xp: 2000, desc: "1º Lugar - Campeão" },
            { rank: 2, coins: 500, xp: 1000, desc: "2º Lugar - Vice-Campeão" },
            { rank: 3, coins: 250, xp: 500, desc: "3º Lugar - Pódio" }
        ];

        ranking.slice(0, 3).forEach((entry, index) => {
            const prize = prizes[index];
            
            // Record Winner
            winners.push({
                userId: entry.userId,
                userName: entry.userName,
                userAvatar: entry.userAvatar,
                rank: index + 1,
                score: entry.score,
                rewardDescription: prize.desc,
                passType: entry.passType
            });

            // 3. Distribute Rewards
            EconomyEngineV6.addCoins(entry.userId, prize.coins, `Prêmio Evento: ${event.title} (#${index + 1})`);
            EconomyEngineV6.addXP(entry.userId, prize.xp, `Prêmio Evento: ${event.title} (#${index + 1})`);

            // 4. Notify
            NotificationDispatcher.systemInfo(
                entry.userId,
                "Você Venceu!",
                `Parabéns! Você ficou em #${index + 1} no evento "${event.title}" e ganhou ${prize.coins} Coins + ${prize.xp} XP.`
            );
        });

        // 5. Close Event in DB
        repo.update("events", (e: any) => e.id === eventId, (e: any) => ({
            ...e,
            status: 'closed',
            closedAt: new Date().toISOString(),
            winners: winners
        }));

        return { success: true, winners };
    }
};
