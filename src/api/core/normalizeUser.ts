
import type { User } from '../../types';
import { normalizePlan } from '../subscriptions/normalizePlan';

export const normalizeUserBasic = (user: User): User => {
    // Normalize plan first
    const normalizedPlan = normalizePlan(user.plan) as User['plan'];

    const normalizedUser = {
        ...user,
        // String Guards
        name: user.name || "Usuário",
        artisticName: user.artisticName || user.name || "Artista",
        email: user.email || "",
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "https://i.pravatar.cc/150?u=default",
        instagramUrl: user.instagramUrl || "",
        tiktokUrl: user.tiktokUrl || "",
        spotifyUrl: user.spotifyUrl || "",
        youtubeUrl: user.youtubeUrl || "",
        
        // Numeric Guards
        xp: Math.max(0, Number(user.xp) || 0),
        coins: Math.max(0, Number(user.coins) || 0),
        level: Math.max(1, Number(user.level) || 1),
        xpToNextLevel: Math.max(1000, Number(user.xpToNextLevel) || 1000),
        monthlyMissionsCompleted: Math.max(0, Number(user.monthlyMissionsCompleted) || 0),
        totalMissionsCompleted: Math.max(0, Number(user.totalMissionsCompleted) || 0),
        weeklyProgress: Math.max(0, Number(user.weeklyProgress) || 0),
        weeklyCheckInStreak: Math.max(0, Number(user.weeklyCheckInStreak) || 0),
        
        // Plan Integrity
        plan: normalizedPlan,

        // Array Guards
        completedMissions: Array.isArray(user.completedMissions) ? user.completedMissions : [],
        pendingMissions: Array.isArray(user.pendingMissions) ? user.pendingMissions : [],
        completedEventMissions: Array.isArray(user.completedEventMissions) ? user.completedEventMissions : [],
        pendingEventMissions: Array.isArray(user.pendingEventMissions) ? user.pendingEventMissions : [],
        joinedEvents: Array.isArray(user.joinedEvents) ? user.joinedEvents : [],
        subscriptionHistory: Array.isArray(user.subscriptionHistory) ? user.subscriptionHistory : [],
        punishmentHistory: Array.isArray(user.punishmentHistory) ? user.punishmentHistory : [],
        unlockedAchievements: Array.isArray(user.unlockedAchievements) ? user.unlockedAchievements : [],
        unseenAchievements: Array.isArray(user.unseenAchievements) ? user.unseenAchievements : [],
        lastArtistLinkClickClaims: Array.isArray(user.lastArtistLinkClickClaims) ? user.lastArtistLinkClickClaims : [],
        seenArtistOfTheDayAnnouncements: Array.isArray(user.seenArtistOfTheDayAnnouncements) ? user.seenArtistOfTheDayAnnouncements : [],
        seenAdminNotifications: Array.isArray(user.seenAdminNotifications) ? user.seenAdminNotifications : [],
        
        // Object Guards
        eventSession: user.eventSession || null,
        unseenRaffleWin: user.unseenRaffleWin || undefined,
        
        // Anti-Cheat V1.2
        riskScore: user.riskScore || 0,
        shieldLevel: user.shieldLevel || 'normal',
        deviceFingerprint: user.deviceFingerprint,
        stats: user.stats || {},
    };

    // SECURITY FIX: Remove password from state object
    delete (normalizedUser as any).password;

    return normalizedUser;
};

export const normalizeUserEconomy = (user: User): User => {
    return user;
};
