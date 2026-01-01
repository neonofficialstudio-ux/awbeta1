
import { getRepository } from "../../api/database/repository.factory";
import { EconomyEngineV6 } from "../../api/economy/economyEngineV6";
import { EventSessionEngine } from "../../api/events/session";

const repo = getRepository();

// Mock rewards DB
const EVENT_REWARDS = {
    'milestone_1000pts': { type: 'coins', value: 100, title: '100 Coins' },
    'milestone_vip_bonus': { type: 'xp', value: 500, title: '500 XP VIP' }
};

export const EventRewardEngine = {
    getEventRewards: (eventId: string) => {
        // Return defined rewards for event
        return Object.entries(EVENT_REWARDS).map(([id, r]) => ({ id, ...r }));
    },

    claimEventReward: (userId: string, rewardId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        const session = user?.eventSession;
        
        if (!session) throw new Error("Sessão não encontrada");
        if (session.rewardsClaimed.includes(rewardId)) throw new Error("Recompensa já coletada");

        const reward = (EVENT_REWARDS as any)[rewardId];
        if (!reward) throw new Error("Recompensa inválida");

        // Process Reward
        if (reward.type === 'coins') {
            EconomyEngineV6.addCoins(userId, reward.value, `Event Reward: ${reward.title}`);
        } else if (reward.type === 'xp') {
             EconomyEngineV6.addXP(userId, reward.value, `Event Reward: ${reward.title}`);
        }

        // Update Session
        const newClaimed = [...session.rewardsClaimed, rewardId];
        repo.update("users", (u: any) => u.id === userId, (u: any) => ({
            ...u,
            eventSession: { ...u.eventSession, rewardsClaimed: newClaimed }
        }));

        return { success: true, reward };
    }
};
