
// api/diagnostics/restorationCheck.ts

import * as storeAPI from '../admin/store';

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
