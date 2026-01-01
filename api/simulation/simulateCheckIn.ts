
import type { User } from '../../types';
import { evaluateCheckIn } from '../economy/economy';
import { deepClone } from '../helpers';

export const simulateCheckIn = async (simUser: User) => {
    const user = deepClone(simUser);
    return await evaluateCheckIn(user);
};

export const simulateCheckInCycle = async (simUser: User) => {
    let simUserForCycle = deepClone(simUser);
    simUserForCycle.weeklyCheckInStreak = 0;
    // Set last check-in to a week ago to start fresh
    let lastCheckInDate = new Date();
    lastCheckInDate.setDate(lastCheckInDate.getDate() - 8); 
    simUserForCycle.lastCheckIn = lastCheckInDate.toISOString();
    
    const cycleLog = [];

    for(let i=0; i<7; i++) {
        const result = await evaluateCheckIn(simUserForCycle);
        simUserForCycle = result.updatedUser;
        
        // IMPORTANT: evaluateCheckIn sets lastCheckIn to the real "now".
        // For simulation, we must override it to be the next consecutive day.
        lastCheckInDate.setDate(lastCheckInDate.getDate() + 1);
        simUserForCycle.lastCheckIn = lastCheckInDate.toISOString();
        
        cycleLog.push({day: i+1, ...result});
    }

    return { finalUser: simUserForCycle, cycleLog };
};
