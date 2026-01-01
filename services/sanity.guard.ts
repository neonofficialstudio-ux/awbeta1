
import type { User, Mission, StoreItem, UsableItem, Event, RankingUser, QueueItem } from '../types';
import { calculateLevelFromXp } from '../api/economy/economy';
import { normalizePlan } from '../api/subscriptions/normalizePlan';

export const SanityGuard = {
    // --- Primitives ---
    number: (val: any, fallback = 0, min?: number, max?: number): number => {
        let num = Number(val);
        if (isNaN(num) || val === null || val === undefined) num = fallback;
        if (min !== undefined) num = Math.max(min, num);
        if (max !== undefined) num = Math.min(max, num);
        return num;
    },

    string: (val: any, fallback = ""): string => {
        if (typeof val === 'string') return val;
        if (val === null || val === undefined) return fallback;
        return String(val);
    },

    boolean: (val: any, fallback = false): boolean => {
        if (typeof val === 'boolean') return val;
        return Boolean(val ?? fallback);
    },

    array: <T>(val: any, fallback: T[] = []): T[] => {
        if (Array.isArray(val)) return val;
        return fallback;
    },

    // --- Entities ---

    user: (u: any): User => {
        if (!u || typeof u !== 'object') {
            console.warn("[SanityGuard] Invalid user object detected, returning clean fallback.");
            // Return a safe skeleton user to prevent crash
            return {
                id: "corrupted-user",
                name: "Unknown",
                artisticName: "Unknown",
                email: "",
                phone: "",
                role: "user",
                plan: "Free Flow",
                coins: 0,
                xp: 0,
                level: 1,
                xpToNextLevel: 1000,
                monthlyMissionsCompleted: 0,
                totalMissionsCompleted: 0,
                weeklyProgress: 0,
                weeklyCheckInStreak: 0,
                avatarUrl: "https://i.pravatar.cc/150?u=default",
                instagramUrl: "",
                joinedEvents: [],
                completedMissions: [],
                pendingMissions: [],
                completedEventMissions: [],
                pendingEventMissions: [],
                unlockedAchievements: [],
                subscriptionHistory: []
            };
        }

        // 1. Numeric & Economy Safety
        const xp = SanityGuard.number(u.xp, 0, 0);
        const coins = SanityGuard.number(u.coins, 0, 0);
        
        // 2. Level Consistency
        const { level: calcLevel, xpToNextLevel: calcNext } = calculateLevelFromXp(xp);
        let level = SanityGuard.number(u.level, 1, 1);
        
        // Auto-repair level if desynced significantly
        if (Math.abs(level - calcLevel) > 1) {
            level = calcLevel;
        }
        
        const xpToNextLevel = SanityGuard.number(u.xpToNextLevel, 1000, 1);

        // 3. Plan Validity & Normalization (V1.1 Update)
        const plan = normalizePlan(u.plan) as User['plan'];

        return {
            ...u,
            id: SanityGuard.string(u.id, `user-${Date.now()}`),
            name: SanityGuard.string(u.name, "Unnamed User"),
            artisticName: SanityGuard.string(u.artisticName, u.name || "Artist"),
            email: SanityGuard.string(u.email),
            avatarUrl: SanityGuard.string(u.avatarUrl, "https://i.pravatar.cc/150?u=default"),
            plan,
            coins,
            xp,
            level,
            xpToNextLevel,
            monthlyMissionsCompleted: SanityGuard.number(u.monthlyMissionsCompleted, 0, 0),
            totalMissionsCompleted: SanityGuard.number(u.totalMissionsCompleted, 0, 0),
            weeklyProgress: SanityGuard.number(u.weeklyProgress, 0, 0),
            weeklyCheckInStreak: SanityGuard.number(u.weeklyCheckInStreak, 0, 0),
            
            // Arrays
            completedMissions: SanityGuard.array(u.completedMissions),
            pendingMissions: SanityGuard.array(u.pendingMissions),
            completedEventMissions: SanityGuard.array(u.completedEventMissions),
            pendingEventMissions: SanityGuard.array(u.pendingEventMissions),
            joinedEvents: SanityGuard.array(u.joinedEvents),
            subscriptionHistory: SanityGuard.array(u.subscriptionHistory),
            unlockedAchievements: SanityGuard.array(u.unlockedAchievements),
            
            // Strings
            instagramUrl: SanityGuard.string(u.instagramUrl),
            spotifyUrl: SanityGuard.string(u.spotifyUrl),
            youtubeUrl: SanityGuard.string(u.youtubeUrl),
            tiktokUrl: SanityGuard.string(u.tiktokUrl),
            
            // Booleans/Nullable
            isBanned: SanityGuard.boolean(u.isBanned, false),
            hasReceivedWelcomeBonus: SanityGuard.boolean(u.hasReceivedWelcomeBonus, false),
        };
    },

    mission: (m: any): Mission => {
        const validTypes = ['instagram', 'tiktok', 'creative', 'special', 'youtube'];
        const type = validTypes.includes(m.type) ? m.type : 'creative';
        
        let deadline = m.deadline;
        if (!deadline || isNaN(new Date(deadline).getTime())) {
            const d = new Date();
            d.setDate(d.getDate() + 7);
            deadline = d.toISOString();
        }

        return {
            ...m,
            id: SanityGuard.string(m.id, `mission-${Date.now()}`),
            title: SanityGuard.string(m.title, "Untitled Mission"),
            description: SanityGuard.string(m.description, "No description provided."),
            xp: SanityGuard.number(m.xp, 0, 0),
            coins: SanityGuard.number(m.coins, 0, 0),
            type,
            status: (m.status === 'active' || m.status === 'expired') ? m.status : 'active',
            deadline: deadline,
            createdAt: SanityGuard.string(m.createdAt, new Date().toISOString()),
            actionUrl: SanityGuard.string(m.actionUrl),
        };
    },

    storeItem: (i: any): StoreItem => {
        const validRarities = ['Regular', 'Raro', 'Épico', 'Lendário'];
        return {
            ...i,
            id: SanityGuard.string(i.id, `item-${Date.now()}`),
            name: SanityGuard.string(i.name, "Unknown Item"),
            description: SanityGuard.string(i.description, ""),
            price: SanityGuard.number(i.price, 0, 0),
            rarity: validRarities.includes(i.rarity) ? i.rarity : 'Regular',
            imageUrl: SanityGuard.string(i.imageUrl, "https://via.placeholder.com/150"),
            exchanges: SanityGuard.number(i.exchanges, 0, 0),
            isOutOfStock: SanityGuard.boolean(i.isOutOfStock, false),
        };
    },

    queueItem: (q: any): QueueItem => {
        return {
            ...q,
            id: SanityGuard.string(q.id, `q-${Date.now()}`),
            userId: SanityGuard.string(q.userId),
            itemId: SanityGuard.string(q.itemId || q.redeemedItemId), // Fallback for legacy field
            itemName: SanityGuard.string(q.itemName, "Unknown Item"),
            status: ['pending', 'processing', 'done'].includes(q.status) ? q.status : 'pending',
            priority: SanityGuard.number(q.priority, 1, 1),
            createdAt: SanityGuard.string(q.createdAt || q.queuedAt, new Date().toISOString()),
            // Legacy fields mapped if present
            userName: SanityGuard.string(q.userName),
            userAvatar: SanityGuard.string(q.userAvatar),
            postUrl: SanityGuard.string(q.postUrl)
        };
    },

    ranking: (r: any): RankingUser => {
        return {
            ...r,
            rank: SanityGuard.number(r.rank, 0, 1),
            name: SanityGuard.string(r.name, "User"),
            artisticName: SanityGuard.string(r.artisticName, "Artist"),
            avatarUrl: SanityGuard.string(r.avatarUrl, "https://i.pravatar.cc/150"),
            level: SanityGuard.number(r.level, 1, 1),
            monthlyMissionsCompleted: SanityGuard.number(r.monthlyMissionsCompleted, 0, 0),
            plan: normalizePlan(r.plan) as User['plan'], // Normalized
            isCurrentUser: SanityGuard.boolean(r.isCurrentUser, false),
        };
    },

    event: (e: any): Event => {
        return {
            ...e,
            id: SanityGuard.string(e.id, `evt-${Date.now()}`),
            title: SanityGuard.string(e.title, "Unnamed Event"),
            description: SanityGuard.string(e.description, ""),
            status: ['current', 'past', 'future', 'closed'].includes(e.status) ? e.status : 'future',
            entryCost: SanityGuard.number(e.entryCost, 0, 0),
            goldenPassCost: SanityGuard.number(e.goldenPassCost, 0, 0),
            imageUrl: SanityGuard.string(e.imageUrl, ""),
            date: SanityGuard.string(e.date, new Date().toISOString()),
            prize: SanityGuard.string(e.prize, "TBA"),
            allowedPlans: SanityGuard.array(e.allowedPlans).map((p: any) => normalizePlan(p))
        };
    }
};
