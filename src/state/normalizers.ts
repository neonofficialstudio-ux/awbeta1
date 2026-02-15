
import type { User, Mission, Event, RankingUser, QueueItem, AdminNotification, Toast, StoreTab, InventoryTab, AdminTab, JackpotTicket, JackpotRound } from '../types';
import { EventSession, ArenaStatus, EventLiveFeedItem } from '../types/event';
import { MissionDefinition } from '../api/missions/missions.db';
import { RankingSession, EventRankingEntry } from '../types/ranking';
import { AppState } from './state.types';

export const normalizeActiveUser = (user: User | null | undefined): User | null => {
    if (!user) return null;

    const safeUser = { ...user };

    // Ensure essentials
    safeUser.id = safeUser.id || "unknown";
    safeUser.name = safeUser.name || "Unknown User";
    safeUser.artisticName = safeUser.artisticName || safeUser.name || "Artist";
    safeUser.email = safeUser.email || "";
    safeUser.avatarUrl = safeUser.avatarUrl || "https://i.pravatar.cc/150?u=default";
    safeUser.plan = safeUser.plan || 'Free Flow';
    safeUser.role = safeUser.role || 'user';
    
    // Ensure numbers
    safeUser.coins = typeof safeUser.coins === 'number' ? safeUser.coins : 0;
    safeUser.xp = typeof safeUser.xp === 'number' ? safeUser.xp : 0;
    
    // Level values are provided by backend profile (no client-side derivation)
    safeUser.level = typeof safeUser.level === 'number' ? safeUser.level : 1;
    safeUser.xpToNextLevel = typeof safeUser.xpToNextLevel === 'number' ? safeUser.xpToNextLevel : 0;

    safeUser.monthlyMissionsCompleted = safeUser.monthlyMissionsCompleted ?? 0;
    safeUser.totalMissionsCompleted = safeUser.totalMissionsCompleted ?? 0;
    safeUser.weeklyProgress = safeUser.weeklyProgress ?? 0;
    safeUser.weeklyCheckInStreak = safeUser.weeklyCheckInStreak ?? 0;

    // Ensure Arrays
    safeUser.completedMissions = Array.isArray(safeUser.completedMissions) ? safeUser.completedMissions : [];
    safeUser.pendingMissions = Array.isArray(safeUser.pendingMissions) ? safeUser.pendingMissions : [];
    safeUser.completedEventMissions = Array.isArray(safeUser.completedEventMissions) ? safeUser.completedEventMissions : [];
    safeUser.pendingEventMissions = Array.isArray(safeUser.pendingEventMissions) ? safeUser.pendingEventMissions : [];
    safeUser.joinedEvents = Array.isArray(safeUser.joinedEvents) ? safeUser.joinedEvents : [];
    safeUser.subscriptionHistory = Array.isArray(safeUser.subscriptionHistory) ? safeUser.subscriptionHistory : [];
    safeUser.unlockedAchievements = Array.isArray(safeUser.unlockedAchievements) ? safeUser.unlockedAchievements : [];
    
    // Ensure Optional Strings
    safeUser.instagramUrl = safeUser.instagramUrl || "";
    safeUser.tiktokUrl = safeUser.tiktokUrl || "";
    safeUser.phone = safeUser.phone || "";
    
    // Optional Arrays
    safeUser.seenArtistOfTheDayAnnouncements = Array.isArray(safeUser.seenArtistOfTheDayAnnouncements) ? safeUser.seenArtistOfTheDayAnnouncements : [];
    safeUser.seenAdminNotifications = Array.isArray(safeUser.seenAdminNotifications) ? safeUser.seenAdminNotifications : [];
    safeUser.lastArtistLinkClickClaims = Array.isArray(safeUser.lastArtistLinkClickClaims) ? safeUser.lastArtistLinkClickClaims : [];

    return safeUser;
};

export const normalizeEventsState = (events: any): AppState['events'] => {
    if (!events) {
        return {
            activeEvent: null,
            session: null,
            allEvents: [],
            arenaStatus: null,
            liveFeed: []
        };
    }
    return {
        activeEvent: events.activeEvent || null,
        session: events.session || null,
        allEvents: Array.isArray(events.allEvents) ? events.allEvents : [],
        arenaStatus: events.arenaStatus || null,
        liveFeed: Array.isArray(events.liveFeed) ? events.liveFeed : []
    };
};

export const normalizeState = (state: any): AppState => {
    const safeUser = normalizeActiveUser(state.activeUser);
    
    return {
        currentView: state.currentView || 'dashboard',
        activeUser: safeUser,
        isAdmin: typeof state.isAdmin === 'boolean' ? state.isAdmin : null,
        notifications: Array.isArray(state.notifications) ? state.notifications : [],
        ledger: Array.isArray(state.ledger) ? state.ledger : [],
        showWelcomeModal: !!state.showWelcomeModal,
        prevCoins: state.prevCoins ?? (safeUser ? safeUser.coins : null),
        prevXp: state.prevXp ?? (safeUser ? safeUser.xp : null),
        
        // Admin
        adminActiveTab: state.adminActiveTab || 'dashboard',
        adminMissionsInitialSubTab: state.adminMissionsInitialSubTab || 'manage',
        adminStoreInitialSubTab: state.adminStoreInitialSubTab || 'visual',
        adminQueuesInitialSubTab: state.adminQueuesInitialSubTab || 'items',
        adminSettingsInitialSubTab: state.adminSettingsInitialSubTab || 'advertisements',
        adminEconomyInitialSubTab: state.adminEconomyInitialSubTab || 'console',
        adminUsersInitialSubTab: state.adminUsersInitialSubTab || 'list',
        adminSubscriptionsInitialSubTab: state.adminSubscriptionsInitialSubTab || 'plans',
        unseenAdminNotifications: Array.isArray(state.unseenAdminNotifications) ? state.unseenAdminNotifications : [],

        // UI
        storeInitialTab: state.storeInitialTab || 'redeem',
        inventoryInitialTab: state.inventoryInitialTab || 'visual',
        toasts: Array.isArray(state.toasts) ? state.toasts : [],
        
        // Engine
        eventSession: state.eventSession || null,
        rankingSession: state.rankingSession || null,
        queue: Array.isArray(state.queue) ? state.queue : [],
        
        // Data Cache
        missionsWeekly: Array.isArray(state.missionsWeekly) ? state.missionsWeekly : [],
        missionsEvent: Array.isArray(state.missionsEvent) ? state.missionsEvent : [],
        dashboardSnapshot: state.dashboardSnapshot || null,

        // V8.4
        eventSettings: state.eventSettings || {},

        // Ranking
        rankingGlobal: Array.isArray(state.rankingGlobal) ? state.rankingGlobal : [],
        rankingEconomy: Array.isArray(state.rankingEconomy) ? state.rankingEconomy : [],
        rankingMissions: Array.isArray(state.rankingMissions) ? state.rankingMissions : [],
        rankingEvent: Array.isArray(state.rankingEvent) ? state.rankingEvent : [],

        // Events
        events: normalizeEventsState(state.events),

        // Jackpot V9.1
        jackpotData: state.jackpotData || null,

        // V1.4 Subscription State
        upgradeRequests: Array.isArray(state.upgradeRequests) ? state.upgradeRequests : [],
        subscriptionEvents: Array.isArray(state.subscriptionEvents) ? state.subscriptionEvents : [],
        subscriptionUsers: Array.isArray(state.subscriptionUsers) ? state.subscriptionUsers : []
    };
};
