// api/actionSentinel/index.ts
import { validateMissionCreation, validateUserSubmission } from './actionValidator';
import { runMissionValidation, runSubmissionValidation, runFullActionScan } from './actionEngine';
import { generateActionHealthReport, generateCriticalActionAlerts } from './actionReporter';

/**
 * ACTION SENTINEL (V1.0)
 * 
 * This module provides a suite of pure functions to validate missions, user actions,
 * and submissions to prevent abuse and ensure consistency with platform rules.
 * 
 * How to use (example from browser console):
 * 1. Import the sentinel: `import { runFullActionScan, generateActionHealthReport } from './api/actionSentinel';`
 * 2. Fetch data: `import { fetchAdminData } from './api/index'; const data = await fetchAdminData();`
 * 3. Run a full scan: `const scanResult = runFullActionScan(data.missions, data.missionSubmissions);`
 * 4. Generate a report: `const report = generateActionHealthReport(scanResult);`
 * 5. Log the report: `console.log(report);`
 */
export {
  validateMissionCreation,
  validateUserSubmission,
  runMissionValidation,
  runSubmissionValidation,
  runFullActionScan,
  generateActionHealthReport,
  generateCriticalActionAlerts,
};
