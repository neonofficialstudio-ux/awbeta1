
import type { User, StoreItem, Mission, RedeemedItem } from '../../types';
import { normalizePlan } from '../subscriptions/normalizePlan';

/**
 * MAPPER: Database (Snake_Case) -> App (CamelCase)
 */

const coerceString = (value: any): string => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return String(value);
};

export const mapProfileToUser = (profile: any, extendedData: any = {}): User => {
    const meta = profile?.meta || profile?.metadata || profile?.profile_meta || {};

    return {
        id: profile.id,
        name: profile.name || "Sem Nome",
        artisticName: profile.artistic_name || profile.name || "Artista",
        email: coerceString(profile.email || meta.email),
        avatarUrl: profile.avatar_url || "https://i.pravatar.cc/150?u=default",
        role: profile.role || 'user',
        
        // Economy
        coins: profile.coins || 0,
        xp: profile.xp || 0,
        level: profile.level || 1,
        xpToNextLevel: 1000 * (profile.level || 1), // Simplificação para view
        
        // Plan
        plan: normalizePlan(profile.plan),
        
        // Stats
        monthlyMissionsCompleted: 0, // Precisa de query agregada
        totalMissionsCompleted: 0,   // Precisa de query agregada
        weeklyProgress: 0,
        
        // Arrays (Populated via extendedData from joins)
        completedMissions: extendedData.completedMissions || [],
        pendingMissions: extendedData.pendingMissions || [],
        completedEventMissions: extendedData.completedEventMissions || [],
        pendingEventMissions: extendedData.pendingEventMissions || [],
        joinedEvents: extendedData.joinedEvents || [],
        unlockedAchievements: [], // TODO: Table achievements
        
        // Socials & Meta
        phone: coerceString(profile.phone || meta.phone),
        instagramUrl: coerceString(profile.instagram_url || meta.instagramUrl || meta.instagram),
        tiktokUrl: coerceString(profile.tiktok_url || meta.tiktokUrl || meta.tiktok),
        spotifyUrl: coerceString(profile.spotify_url || meta.spotifyUrl || meta.spotify),
        youtubeUrl: coerceString(profile.youtube_url || meta.youtubeUrl || meta.youtube),
        weeklyCheckInStreak: profile.check_in_streak || 0,
        lastCheckIn: profile.last_check_in,
        joinedISO: profile.joined_at,
        
        // Safety
        isBanned: profile.is_banned || false,
        subscriptionHistory: [],
    };
};

export const mapStoreItemToApp = (item: any): StoreItem => {
    return {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        rarity: item.rarity,
        imageUrl: item.image_url,
        exchanges: 0, // Analytics field
        isOutOfStock: !item.is_active || (item.stock !== -1 && item.stock <= 0)
    };
};

export const mapMissionToApp = (mission: any): Mission => {
    const isActive = mission.active ?? mission.is_active ?? false;
    const status = mission.status || (isActive ? 'active' : 'expired');
    const scheduledFor = mission.scheduled_for || mission.available_at;

    return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        xp: mission.xp_reward,
        coins: mission.coin_reward,
        type: mission.type || 'creative',
        actionUrl: mission.action_url,
        createdAt: mission.created_at,
        deadline: mission.deadline || new Date(Date.now() + 86400000).toISOString(),
        status: status as Mission['status'],
        scheduledFor,
    };
};

export const mapInventoryToRedeemedItem = (inv: any, itemDetails: any, userDetails: any): RedeemedItem => {
    return {
        id: inv.id,
        userId: inv.user_id,
        userName: userDetails?.name || "Unknown",
        itemId: inv.item_id,
        itemName: itemDetails?.name || "Unknown Item",
        itemPrice: inv.purchase_price || 0,
        redeemedAt: new Date(inv.purchased_at).toLocaleDateString('pt-BR'),
        redeemedAtISO: inv.purchased_at,
        coinsBefore: 0, // Historic data hard to reconstruct perfectly without ledger
        coinsAfter: 0,
        status: inv.status === 'available' ? 'Redeemed' : inv.status === 'used' ? 'Used' : 'InProgress',
        formData: inv.metadata
    };
};
