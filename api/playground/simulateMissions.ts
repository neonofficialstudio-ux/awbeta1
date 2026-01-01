
// api/playground/simulateMissions.ts
import type { User, Mission } from '../../types';
import { getDailyMissionLimit } from '../economy/economy';
import { deepClone } from '../helpers';

/**
 * Simulates the entire lifecycle of a mission submission for a user.
 * @param user The user performing the actions.
 * @param mission The mission being submitted.
 * @returns A log of the user's state at each step of the flow.
 */
export const simulateMissionFlow = (user: User, mission: Mission) => {
    const log = [];
    let simUser = deepClone(user);

    // 1. Initial State
    log.push({ step: 'Initial State', userState: deepClone(simUser) });

    // 2. Simulate Submission
    simUser.pendingMissions.push(mission.id);
    log.push({ step: 'After Submission (Pending)', userState: deepClone(simUser) });

    // 3. Simulate Approval (Simplified logic, real logic is in review-engine)
    simUser.pendingMissions = simUser.pendingMissions.filter(id => id !== mission.id);
    simUser.completedMissions.push(mission.id);
    simUser.xp += mission.xp; // Note: This is a simplified reward calculation for flow testing.
    simUser.coins += mission.coins;
    log.push({ step: 'After Approval', userState: deepClone(simUser) });

    // 4. Simulate Rejection (from approved state)
    simUser.completedMissions = simUser.completedMissions.filter(id => id !== mission.id);
    simUser.xp -= mission.xp;
    simUser.coins -= mission.coins;
    log.push({ step: 'After Rejection (from Approved)', userState: deepClone(simUser) });

    return log;
};

/**
 * Tests and returns the daily mission submission limits for a given user's plan.
 * @param user The user whose plan will be tested.
 * @returns An object describing the user's daily limit.
 */
export const testMissionLimits = (user: User) => {
    const limit = getDailyMissionLimit(user.plan);
    const canSubmit = (count: number) => {
        if (limit === null) return true;
        return count < limit;
    };

    return {
        plan: user.plan,
        limit: limit === null ? 'Unlimited' : limit,
        canSubmitAfter_0: canSubmit(0),
        canSubmitAfter_1: canSubmit(1),
        canSubmitAfter_2: canSubmit(2),
        canSubmitAfter_3: canSubmit(3),
    };
};
