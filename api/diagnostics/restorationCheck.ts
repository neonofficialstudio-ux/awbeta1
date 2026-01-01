
// api/diagnostics/restorationCheck.ts

import * as eventAPI from '../events/index';
import * as storeAPI from '../admin/store';

export const runEventDiagnostic = () => {
    const results = {
        getEventMissions: typeof eventAPI.getEventMissions === 'function',
        getVipEventMissions: typeof eventAPI.getVipEventMissions === 'function',
        getEventRanking: typeof eventAPI.getEventRanking === 'function',
        submitEventMission: typeof eventAPI.submitEventMission === 'function',
    };

    const missing = Object.keys(results).filter(k => !(results as any)[k]);
    
    return {
        status: missing.length === 0 ? 'PASS' : 'FAIL',
        missingEndpoints: missing,
        details: results
    };
};

export const runStoreDiagnostic = () => {
    const results = {
        getItems: typeof storeAPI.getItems === 'function',
        createItem: typeof storeAPI.createItem === 'function',
        updateItem: typeof storeAPI.updateItem === 'function',
        deleteItem: typeof storeAPI.deleteItem === 'function',
    };

    const missing = Object.keys(results).filter(k => !(results as any)[k]);

    return {
        status: missing.length === 0 ? 'PASS' : 'FAIL',
        missingEndpoints: missing,
        details: results
    };
};
