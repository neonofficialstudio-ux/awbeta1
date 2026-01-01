
import type { User, Mission } from '../../types';
import { getDailyMissionLimit, evaluateCheckIn, calculateMissionRewards } from '../economy/economy';
import { deepClone } from '../helpers';

export const simulateDailyGains = async (simUser: User) => {
    let user = deepClone(simUser);
    const log = [];

    // Simulate one mission completion
    const avgMission: Mission = { id: 'sim-avg', title: 'Simulated Average Mission', description: '', xp: 210, coins: 70, type: 'creative', createdAt: '', deadline: '', status: 'active' };
    const missionResult = await calculateMissionRewards(user, avgMission);
    user = missionResult.updatedUser;
    log.push({ action: 'Mission Completion', xpGained: missionResult.xpGained, coinsGained: missionResult.coinsGained });

    // Simulate one check-in
    const checkInResult = await evaluateCheckIn(user);
    user = checkInResult.updatedUser;
    log.push({ action: 'Daily Check-in', coinsGained: checkInResult.coinsGained, streak: checkInResult.streak });
    
    return { finalUser: user, log };
};

export const simulateDailyLimits = (simUser: User) => {
    const user = deepClone(simUser);
    const limit = getDailyMissionLimit(user.plan);
    return {
        plan: user.plan,
        limit: limit === null ? 'Unlimited' : limit
    };
};

export const simulateEconomyCycle = async (simUser: User, days: number) => {
    let user = deepClone(simUser);
    const cycleLog = [];
    const limit = getDailyMissionLimit(user.plan);

    for (let i = 0; i < days; i++) {
        const dayLog: any[] = [];
        
        // Check-in
        const { updatedUser: userAfterCheckIn, ...checkInDetails } = await evaluateCheckIn(user);
        user = userAfterCheckIn;
        dayLog.push({ type: 'check-in', ...checkInDetails });
        
        // Missions
        const missionsToComplete = limit === null ? 3 : limit; // Simulate 3 missions for unlimited plan
        for (let j = 0; j < missionsToComplete; j++) {
            const avgMission: Mission = { id: `sim-day${i}-mis${j}`, title: 'Simulated Daily Mission', description: '', xp: 210, coins: 70, type: 'creative', createdAt: '', deadline: '', status: 'active' };
            const { updatedUser: userAfterMission, ...missionDetails } = await calculateMissionRewards(user, avgMission);
            user = userAfterMission;
            dayLog.push({ type: 'mission', ...missionDetails });
        }

        cycleLog.push({ day: i + 1, log: dayLog, userState: deepClone(user) });
    }

    return { finalUser: user, cycleLog };
};
