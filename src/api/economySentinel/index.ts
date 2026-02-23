// api/economySentinel/index.ts
import { 
    validateUserEconomy, 
    validateSubmissionEconomy, 
    validateStoreOperation, 
    validateQueues 
} from './sentinelValidator';
import { 
    runFullEconomyScan, 
    runEconomyCheckForUser 
} from './sentinelEngine';
import { 
    generateEconomyHealthReport, 
    generateCriticalAlerts 
} from './sentinelReporter';


/**
 * ECONOMY SENTINEL (V1.0)
 * 
 * This module provides a suite of pure functions to monitor, validate, and protect
 * the game economy from inconsistencies.
 * 
 * How to use (example from browser console):
 * 1. Import the sentinel: `import { runFullEconomyScan, generateEconomyHealthReport } from './api/economySentinel';`
 * 2. Fetch data: `import { fetchAdminData } from './api/index'; const data = await fetchAdminData();`
 * 3. Run a full scan: `const result = runFullEconomyScan(data.allUsers, data.missions, data.missionSubmissions, data.redeemedItems, data.storeItems, data.usableItemQueue);`
 * 4. Generate a report: `const report = generateEconomyHealthReport(result);`
 * 5. Log the report: `console.log(report);`
 */
export {
  validateUserEconomy,
  validateSubmissionEconomy,
  validateStoreOperation,
  validateQueues,
  runFullEconomyScan,
  runEconomyCheckForUser,
  generateEconomyHealthReport,
  generateCriticalAlerts,
};
