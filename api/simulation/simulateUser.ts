
import type { User } from '../../types';
import { calculateLevelFromXp, xpForLevelStart } from '../economy/economy';
import { deepClone } from '../helpers';

export const createSimUser = (plan: User['plan'] = 'Free Flow'): User => {
    const now = new Date();
    return {
        id: `sim-${Date.now()}`,
        name: `Simulated User (${plan})`,
        artisticName: `Sim Artist`,
        avatarUrl: `https://i.pravatar.cc/150?u=sim-${Date.now()}`,
        level: 1,
        xp: 0,
        xpToNextLevel: 1000,
        coins: 100,
        monthlyMissionsCompleted: 0,
        totalMissionsCompleted: 0,
        plan,
        weeklyProgress: 0,
        completedMissions: [],
        pendingMissions: [],
        completedEventMissions: [],
        pendingEventMissions: [],
        joinedEvents: [],
        email: 'sim@test.com',
        phone: '+00',
        role: 'user',
        instagramUrl: 'https://instagram.com/simuser',
        joined: now.toLocaleDateString('pt-BR'),
        joinedISO: now.toISOString(),
        weeklyCheckInStreak: 0,
        subscriptionHistory: [],
        punishmentHistory: [],
        unlockedAchievements: [],
    };
};

export const advanceSimUserLevel = (simUser: User, levels: number): User => {
    const user = deepClone(simUser);
    const targetLevel = user.level + levels;
    const targetXp = xpForLevelStart(targetLevel);
    user.xp = targetXp;
    const { level, xpToNextLevel } = calculateLevelFromXp(user.xp);
    user.level = level;
    user.xpToNextLevel = xpToNextLevel;
    return user;
};

export const resetSimUser = (simUser: User): User => {
    return createSimUser(simUser.plan);
};
