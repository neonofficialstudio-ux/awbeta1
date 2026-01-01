
import { getRepository } from "../database/repository.factory";

const repo = getRepository();

export const EventDailyBoosters = {
    getDailyBoosters: (userId: string, eventId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        const session = user?.eventSession;
        
        if (!session || session.eventId !== eventId) return [];

        // Logic: VIP gets 2 boosters, Normal gets 1
        const available = session.passType === 'vip' 
            ? [{ type: 'xp_10', label: '+10% XP (VIP)', active: false }, { type: 'xp_5', label: '+5% XP', active: false }]
            : [{ type: 'xp_5', label: '+5% XP', active: false }];
            
        return available;
    },
    
    consumeBooster: (userId: string, type: string) => {
        // Logic to activate booster in session
        return { success: true, message: "Booster ativado!" };
    }
};
