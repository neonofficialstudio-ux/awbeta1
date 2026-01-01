
import { MasterSync } from '../state/masterSync';
import { appReducer, initialState } from '../state/reducer';
import type { User } from '../types';
import { EconomyEngineV6 } from '../api/economy/economyEngineV6';

const mockDispatch = (action: any) => {
    console.log("[StressTest] Dispatch:", action.type);
    return action;
};

export const StateStressTest = {
    simulateLoginFlow: async (userId: string) => {
        console.group("State Stress: Login Flow");
        const start = performance.now();
        
        // 1. Initial Sync
        await MasterSync.runGlobalSync(userId, mockDispatch);
        
        // 2. Reducer State Transition
        let state = { ...initialState };
        const userMock = { id: userId, coins: 100, xp: 0, level: 1, plan: 'Free Flow' } as User;
        
        state = appReducer(state, { type: 'LOGIN', payload: { user: userMock, notifications: [], unseenAdminNotifications: [] } });
        console.log("State after Login:", !!state.activeUser);

        // 3. Economy Update
        const ecoUpdate = { type: 'ECONOMY_SYNC', payload: { coins: 150, xp: 50, level: 1 } };
        state = appReducer(state, ecoUpdate as any);
        
        if (state.activeUser?.coins === 150) console.log("PASS: Economy Sync");
        else console.error("FAIL: Economy Sync");
        
        console.log(`Duration: ${(performance.now() - start).toFixed(2)}ms`);
        console.groupEnd();
    },
    
    simulateRapidUpdates: (count = 100) => {
        console.group(`State Stress: ${count} Rapid Updates`);
        let state = { ...initialState };
        // Mock a logged in user to allow updates
        state.activeUser = { id: 'stress-user', coins: 0, xp: 0, level: 1 } as User;

        const start = performance.now();
        
        for(let i = 0; i < count; i++) {
            state = appReducer(state, { type: 'ECONOMY_SYNC', payload: { coins: i, xp: i * 10, level: 1 } });
        }
        
        console.log("Final Coins:", state.activeUser?.coins);
        console.log(`Total Time: ${(performance.now() - start).toFixed(2)}ms`);
        console.log(`Avg Time: ${((performance.now() - start) / count).toFixed(4)}ms`);
        console.groupEnd();
    }
};
