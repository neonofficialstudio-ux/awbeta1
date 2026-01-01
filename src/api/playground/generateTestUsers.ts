
// api/playground/generateTestUsers.ts
import type { User } from '../../types';
import { calculateLevelFromXp } from '../economy/economy';

/**
 * Generates an array of test users with different plans, levels, and stats.
 * This function does NOT modify the main database.
 * @returns An array of User objects for testing purposes.
 */
export const generateTestUsers = (): User[] => {
    const createTestUser = (id: string, name: string, plan: User['plan'], xp: number, coins: number, streak: number): User => {
        const { level, xpToNextLevel } = calculateLevelFromXp(xp);
        const now = new Date();
        const joinedDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Joined 30 days ago

        return {
            id,
            name,
            artisticName: name,
            avatarUrl: `https://i.pravatar.cc/150?u=${id}`,
            level,
            xp,
            xpToNextLevel,
            coins,
            monthlyMissionsCompleted: Math.floor(Math.random() * 30),
            totalMissionsCompleted: Math.floor(Math.random() * 100) + 30,
            plan,
            weeklyProgress: Math.floor(Math.random() * 7),
            completedMissions: [],
            pendingMissions: [],
            completedEventMissions: [],
            pendingEventMissions: [],
            joinedEvents: [],
            email: `${id}@test.com`,
            phone: '+00 (00) 00000-0000',
            role: 'user',
            instagramUrl: `https://instagram.com/${id}`,
            joined: joinedDate.toLocaleDateString('pt-BR'),
            joinedISO: joinedDate.toISOString(),
            weeklyCheckInStreak: streak,
            subscriptionHistory: [],
            punishmentHistory: [],
            unlockedAchievements: [],
        };
    };

    return [
        createTestUser('test_free', 'Free Flow User', 'Free Flow', 500, 100, 2),
        createTestUser('test_ascensao', 'Ascensão User', 'Artista em Ascensão', 8000, 500, 4),
        createTestUser('test_pro', 'Pro User', 'Artista Profissional', 50000, 2000, 6),
        createTestUser('test_hitmaker', 'Hitmaker User', 'Hitmaker', 150000, 10000, 0),
        createTestUser('test_poor', 'Poor User', 'Free Flow', 100, 5, 1),
    ];
};
