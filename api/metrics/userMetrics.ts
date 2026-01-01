
// api/metrics/userMetrics.ts
import type { User } from '../../types';

/**
 * Categorizes users as active or inactive based on their last check-in date.
 * @param users - All users in the system.
 * @returns An object with counts of active and inactive users.
 */
export const getActiveVsInactiveUsers = (users: User[]) => {
    const now = new Date().getTime();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let active = 0;
    let inactive = 0;

    users.filter(u => u.role === 'user').forEach(user => {
        const lastCheckInTime = user.lastCheckIn ? new Date(user.lastCheckIn).getTime() : 0;
        if (lastCheckInTime > thirtyDaysAgo) {
            active++;
        } else {
            inactive++;
        }
    });

    return { active, inactive };
};

/**
 * Counts the number of users per subscription plan.
 * @param users - All users in the system.
 * @returns An object with user counts for each plan.
 */
export const getPlanDistribution = (users: User[]) => {
    return users.filter(u => u.role === 'user').reduce((acc, user) => {
        acc[user.plan] = (acc[user.plan] || 0) + 1;
        return acc;
    }, {} as Record<User['plan'], number>);
};

/**
 * Detects users with suspicious patterns, like impossible streaks.
 * @param users - All users in the system.
 * @returns An array of alerts for suspicious users.
 */
export const detectSuspiciousUsers = (users: User[]) => {
    const alerts: { userId: string, reason: string, details: string }[] = [];
    const now = new Date();

    for (const user of users) {
        if (user.role !== 'user') continue;

        // Anomaly 1: Impossible streak
        const joinedDate = user.joinedISO ? new Date(user.joinedISO) : now;
        const maxPossibleStreak = Math.floor((now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (user.weeklyCheckInStreak > maxPossibleStreak) {
            alerts.push({
                userId: user.id,
                reason: 'Sequência de check-in impossível',
                details: `Usuário ${user.name} tem streak de ${user.weeklyCheckInStreak} dias, mas está na plataforma há apenas ${maxPossibleStreak - 1} dias.`
            });
        }

        // Anomaly 2: LC balance seems too high for level/activity
        const expectedMaxCoins = (user.totalMissionsCompleted * 100) + (user.level * 50); // Very rough heuristic
        if (user.coins > expectedMaxCoins + 1000) {
             alerts.push({
                userId: user.id,
                reason: 'Saldo de LC anormalmente alto',
                details: `Usuário ${user.name} (Nível ${user.level}) possui ${user.coins} LC, o que é inesperado para ${user.totalMissionsCompleted} missões.`
            });
        }
    }
    return alerts;
};
