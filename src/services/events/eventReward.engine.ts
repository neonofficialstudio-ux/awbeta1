
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
        void userId;
        void rewardId;
        return { success: false, disabled: true, error: "Eventos desativados (Supabase-only)." };
    }
};
