
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

export const simulateMissionCompletion = async (user: User, mission: Mission, days: number = 1) => {
    let simUser = deepClone(user);

    for (let i = 0; i < days; i++) {
        const { updatedUser } = await calculateMissionRewards(simUser, mission);
        simUser = updatedUser;
        simUser.totalMissionsCompleted++;
    }

    return simUser;
};

export const simulateDailyCheckIn = async (user: User, days: number) => {
    let simUser = deepClone(user);
    const results = [];

    for (let i = 0; i < days; i++) {
        // To simulate consecutive days, we need to manipulate the lastCheckIn date
        const lastCheckIn = simUser.lastCheckIn ? new Date(simUser.lastCheckIn) : new Date(Date.now() - 2 * 86400000);
        lastCheckIn.setDate(lastCheckIn.getDate() + 1);
        simUser.lastCheckIn = lastCheckIn.toISOString();

        const { updatedUser, coinsGained, isBonus, streak } = await evaluateCheckIn(simUser);
        simUser = updatedUser;
        results.push({ day: i + 1, coinsGained, isBonus, streak });
    }

    return { finalUser: simUser, dailyLog: results };
};

export const simulateLevelProgression = async (user: User, targetLevel: number) => {
    if (user.level >= targetLevel) {
        return { missionsNeeded: 0, finalUser: user };
    }

    let simUser = deepClone(user);
    const { xpForLevelStart } = await import('../economy/economy');

    const xpNeeded = xpForLevelStart(targetLevel);
    let missionsCount = 0;

    // Use a standard "average" mission for simulation
    const avgMission: Mission = {
        id: 'sim-mission',
        title: 'Simulated Mission',
        description: '',
        xp: 210, // Média
        coins: 70, // Média
        type: 'creative',
        createdAt: '',
        deadline: '',
        status: 'active',
    };

    while (simUser.xp < xpNeeded) {
        const { updatedUser } = await calculateMissionRewards(simUser, avgMission);
        simUser = updatedUser;
        missionsCount++;
    }

    return { missionsNeeded: missionsCount, finalUser: simUser };
};
