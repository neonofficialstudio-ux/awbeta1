
import type { User, StoreItem, Mission, RedeemedItem, Raffle, RaffleTicket, MissionSubmission } from '../../types';
import { normalizePlan } from '../subscriptions/normalizePlan';

/**
 * MAPPER: Database (Snake_Case) -> App (CamelCase)
 */

export const mapProfileToUser = (profile: any, extendedData: any = {}): User => {
    return {
        id: profile.id,
        name: profile.name || "Sem Nome",
        artisticName: profile.artistic_name || profile.name || "Artista",
        email: profile.email || "",
        avatarUrl: profile.avatar_url || "https://i.pravatar.cc/150?u=default",
        role: 'user', 
        
        // Economy
        coins: Number(profile.coins) || 0,
        xp: Number(profile.xp) || 0,
        level: Number(profile.level) || 1,
        xpToNextLevel: 1000 * (Number(profile.level) || 1), 
        
        // Plan
        plan: normalizePlan(profile.plan),
        
        // Stats
        monthlyMissionsCompleted: Number(profile.monthly_missions_completed) || 0,
        totalMissionsCompleted: Number(profile.total_missions_completed) || 0,
        weeklyProgress: 0,
        
        // Arrays 
        completedMissions: extendedData.completedMissions || [],
        pendingMissions: extendedData.pendingMissions || [],
        completedEventMissions: extendedData.completedEventMissions || [],
        pendingEventMissions: extendedData.pendingEventMissions || [],
        joinedEvents: extendedData.joinedEvents || [],
        unlockedAchievements: [], 
        
        // Socials & Meta
        phone: profile.phone || "",
        instagramUrl: profile.instagram_url || "",
        tiktokUrl: profile.tiktok_url || "",
        spotifyUrl: profile.spotify_url || "",
        youtubeUrl: profile.youtube_url || "",
        
        weeklyCheckInStreak: Number(profile.check_in_streak) || 0,
        lastCheckIn: profile.last_check_in,
        joinedISO: profile.created_at,
        
        // Safety
        isBanned: false,
        subscriptionHistory: [],
    };
};

export const mapStoreItemToApp = (item: any): StoreItem => {
    return {
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        rarity: item.rarity,
        imageUrl: item.image_url,
        exchanges: 0, 
        isOutOfStock: !item.is_active || (Number(item.stock) !== -1 && Number(item.stock) <= 0)
    };
};

export const mapMissionToApp = (mission: any): Mission => {
    return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        xp: Number(mission.xp) || 0,
        coins: Number(mission.coins) || 0,
        type: mission.type || 'creative',
        actionUrl: mission.action_url,
        createdAt: mission.created_at,
        deadline: mission.deadline || new Date(Date.now() + 86400000).toISOString(),
        status: mission.status || 'active',
        format: 'link', 
        platform: mission.platform
    };
};

export const mapSubmissionToApp = (sub: any, userName: string = "", userAvatar: string = "", missionTitle: string = ""): MissionSubmission => {
    return {
        id: sub.id,
        userId: sub.user_id,
        missionId: sub.mission_id,
        userName: userName,
        userAvatar: userAvatar,
        missionTitle: missionTitle,
        submittedAt: new Date(sub.submitted_at).toLocaleDateString('pt-BR'),
        submittedAtISO: sub.submitted_at,
        proofUrl: sub.proof_url,
        status: sub.status
    };
};

export const mapInventoryToRedeemedItem = (inv: any, itemName: string = "Unknown Item"): RedeemedItem => {
    return {
        id: inv.id,
        userId: inv.user_id,
        userName: "", 
        itemId: inv.item_id,
        itemName: itemName,
        itemPrice: Number(inv.purchase_price) || 0,
        redeemedAt: new Date(inv.purchased_at).toLocaleDateString('pt-BR'),
        redeemedAtISO: inv.purchased_at,
        coinsBefore: 0,
        coinsAfter: 0,
        status: inv.status,
        formData: inv.metadata
    };
};

export const mapRaffleToApp = (raffle: any): Raffle => {
    return {
        id: raffle.id,
        itemId: '', 
        itemName: raffle.title,
        itemImageUrl: raffle.image_url,
        ticketPrice: Number(raffle.ticket_price),
        ticketLimitPerUser: 100, 
        endsAt: raffle.ends_at,
        status: raffle.status,
        winnerId: raffle.winner_id
    };
};

export const mapTicketToApp = (ticket: any): RaffleTicket => {
    return {
        id: ticket.id,
        raffleId: ticket.raffle_id,
        userId: ticket.user_id,
        purchasedAt: ticket.purchased_at
    };
};
