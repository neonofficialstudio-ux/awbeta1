
import * as sim from '../simulation';
import type { User, Mission, StoreItem, UsableItem } from '../../types';
import { deepClone } from '../helpers';
import * as db from '../mockData';
import { addPerformanceLog } from '../logs/performance';

// In-memory state for the simulation environment
let simulationState: {
    user: User | null;
    mission: Mission | null;
    log: any[];
} = {
    user: null,
    mission: null,
    log: [],
};

type StepName =
  | 'createUser'
  | 'resetUser'
  | 'advanceLevel'
  | 'generateMission'
  | 'submitMission'
  | 'resolveMission'
  | 'simulateDay'
  | 'simulateCheckInCycle'
  | 'simulateRedeemItem'
  | 'simulateUseItem';

export const adminRunSimulationStep = async (stepName: StepName, payload?: any) => {
    simulationState.log.unshift({ step: stepName, payload, timestamp: new Date().toISOString() });
    
    addPerformanceLog({ type: 'simulation', source: stepName, details: payload });

    switch (stepName) {
        case 'createUser':
            simulationState.user = sim.createSimUser(payload?.plan || 'Free Flow');
            break;
        case 'resetUser':
            if (simulationState.user) {
                simulationState.user = sim.resetSimUser(simulationState.user);
            }
            break;
        case 'advanceLevel':
            if (simulationState.user && payload?.levels) {
                simulationState.user = sim.advanceSimUserLevel(simulationState.user, payload.levels);
            }
            break;
        case 'generateMission':
            simulationState.mission = sim.generateSimMission();
            break;
        case 'submitMission':
            if (simulationState.user && simulationState.mission) {
                const result = sim.submitSimMission(simulationState.user, simulationState.mission);
                simulationState.user = result.user;
                simulationState.log.unshift({ stepResult: result });
            }
            break;
        case 'resolveMission':
             if (simulationState.user && simulationState.mission && payload?.status) {
                const result = await sim.resolveSimMission(simulationState.user, simulationState.mission, payload.status);
                simulationState.user = result.user;
                simulationState.mission = null; // Mission is resolved
                simulationState.log.unshift({ stepResult: result });
            }
            break;
        case 'simulateDay':
            if(simulationState.user) {
                const result = await sim.simulateDailyGains(simulationState.user);
                simulationState.user = result.finalUser;
                simulationState.log.unshift({ stepResult: result.log });
            }
            break;
        case 'simulateCheckInCycle':
             if(simulationState.user) {
                const result = await sim.simulateCheckInCycle(simulationState.user);
                simulationState.user = result.finalUser;
                simulationState.log.unshift({ stepResult: result.cycleLog });
            }
            break;
// FIX: Changed simulateRedeemItem to simulatePurchase and added logic to find the item object.
        case 'simulateRedeemItem':
            if (simulationState.user && payload?.itemId) {
                const item = [...db.storeItemsData, ...db.usableItemsData].find(i => i.id === payload.itemId);
                if (item) {
                    const result = sim.simulatePurchase(simulationState.user, item);
                    if (result.success && result.finalUser) {
                        simulationState.user = result.finalUser;
                    }
                    simulationState.log.unshift({ stepResult: result });
                }
            }
            break;
// FIX: Corrected call to sim.simulateUseItem.
        case 'simulateUseItem':
            if (simulationState.user && payload?.itemId) {
                const result = sim.simulateUseItem(simulationState.user, payload.itemId);
                simulationState.log.unshift({ stepResult: result });
            }
            break;
        default:
            break;
    }
    
    // Return a clone to prevent external modification
    return adminGetSimulationState();
};

export const adminGetSimulationState = () => {
    return deepClone(simulationState);
};