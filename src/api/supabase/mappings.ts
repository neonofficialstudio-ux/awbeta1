
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

    const displayName = profile.display_name || profile.artistic_name || profile.name || "Sem Nome";

    // ✅ NUNCA sobrescrever name com display_name.
    // name = nome real do perfil
    const name = profile.name || "";

    // artisticName = nome artístico real
    const artisticName = profile.artistic_name || "";

    return {
        id: profile.id,
        name,
        artisticName,
        displayName,
        email: coerceString(profile.email || meta.email),
        avatarUrl: profile.avatar_url || "https://i.pravatar.cc/150?u=default",
        role: profile.role || 'user',
        
        // Economy
        coins: profile.coins || 0,
        xp: profile.xp || 0,
        level: profile.level || 1,
        xpToNextLevel: 0, // Legacy (Supabase é autoridade)
        
        // Plan
        plan: normalizePlan(profile.plan),
        
        // Stats
        monthlyMissionsCompleted: profile.monthly_missions_completed ?? 0,
        totalMissionsCompleted: profile.total_missions_completed ?? 0,
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
        instagramUrl: coerceString(profile.instagram_url || ""),
        tiktokUrl: coerceString(profile.tiktok_url || ""),
        spotifyUrl: coerceString(profile.spotify_url || ""),
        youtubeUrl: coerceString(profile.youtube_url || ""),
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
        description: item.description ?? '',
        // ✅ Supabase usa price_coins
        price: Number(item.price_coins ?? item.price ?? 0),
        rarity: item.rarity,
        imageUrl: item.image_url ?? '',
        exchanges: Number(item?.meta?.exchanges ?? 0),
        isOutOfStock: Boolean(item?.meta?.isOutOfStock ?? false) || !item.is_active
    };
};

export const mapMissionToApp = (mission: any): Mission => {
    const meta = mission?.meta || mission?.metadata || {};
    const isActive = mission.active ?? mission.is_active ?? false;
    const status = mission.status || (isActive ? 'active' : 'expired');
    const scheduledFor = mission.scheduled_for || mission.available_at;
    const coinReward = mission.coins_reward ?? mission.coin_reward ?? mission.coins;
    const format = mission.format ?? meta.format ?? meta.proof_type ?? meta.verification_type ?? 'link';
    const platform = meta.platform ?? mission.platform;
    const icon = meta.icon ?? mission.icon;
    const scope = mission.scope ?? mission.type;

    return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        xp: mission.xp_reward ?? mission.xp ?? 0,
        coins: coinReward || 0,
        type: mission.type || 'creative',
        actionUrl: mission.action_url ?? mission.actionUrl ?? '',
        createdAt: mission.created_at || new Date().toISOString(),
        deadline: mission.deadline || new Date(Date.now() + 86400000).toISOString(),
        status: status as Mission['status'],
        scheduledFor: scheduledFor || null,
        isActive,
        scope,
        format,
        platform,
        icon,
        meta,
    };
};

export const mapInventoryToRedeemedItem = (inv: any, itemDetails: any, userDetails: any): RedeemedItem => {
    const statusRaw = String(inv.status ?? '').toLowerCase();

    // owned = comprado/disponível; consumed = produção iniciada
    const uiStatus =
        statusRaw === 'consumed' ? 'InProgress'
        : statusRaw === 'owned' || statusRaw === 'equipped' ? 'Redeemed'
        : 'Redeemed';

    return {
        id: inv.id, // inventory_id
        userId: inv.user_id,
        userName: userDetails?.name || userDetails?.display_name || "Unknown",
        itemId: inv.item_id, // store_item_id
        itemName: itemDetails?.name || "Unknown Item",
        itemPrice: 0, // opcional (reconstrução perfeita exigiria ledger)
        redeemedAt: inv.created_at ? new Date(inv.created_at).toLocaleDateString('pt-BR') : '',
        redeemedAtISO: inv.created_at || null,

        // economia histórica (se quiser depois a gente preenche via ledger)
        coinsBefore: 0,
        coinsAfter: 0,

        status: uiStatus as any,

        // 👇 aqui a ponte para produção
        productionStartedAt: inv.meta?.consumed_at || inv.meta?.consumedAt || null,
        completedAt: inv.meta?.completed_at || inv.meta?.completedAt || null,
        completionUrl: inv.meta?.completion_url || inv.meta?.completionUrl || null,
        estimatedCompletionDate: inv.meta?.estimatedCompletionDate || inv.meta?.estimated_completion_date || null,

        // formData legado pode não existir mais (agora está em production_requests)
        formData: inv.meta?.formData || null,
    };
};
