
import { runAuditForUser, runAuditForAllUsers } from './auditEngine';
import { summarizeAudit, detectSystemWideAnomalies } from './auditReporter';

/**
 * INTERNAL AUDIT MODE (V1.0)
 * 
 * This module provides a suite of pure functions to audit user behavior
 * and detect suspicious activity or inconsistencies with the game economy.
 * It is intended for internal use by administrators via the console.
 * 
 * How to use (example from browser console):
 * 1. Import the audit engine: `import { runAuditForAllUsers, summarizeAudit } from './api/audit';`
 * 2. Fetch the current data: `import { fetchAdminData } from './api/index'; const data = await fetchAdminData();`
 * 3. Run audit for all users: `const results = runAuditForAllUsers(data.allUsers, { transactions: data.allTransactions, submissions: data.missionSubmissions, redeemedItems: data.redeemedItems });`
 * 4. Generate a summary: `const summary = summarizeAudit(results);`
 * 5. Log the results: `console.log(summary);`
 */
export {
  runAuditForUser,
  runAuditForAllUsers,
  summarizeAudit,
  detectSystemWideAnomalies,
};
