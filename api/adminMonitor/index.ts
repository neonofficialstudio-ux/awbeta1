// api/adminMonitor/index.ts

import {
  monitorMissionCreation,
  monitorStoreEdit,
  monitorPunishment,
  monitorLevelAdjustment,
  monitorQueueAction,
} from './adminMonitor';
import { generateAdminAlerts, isCritical } from './adminAlerts';
import { loadAdminLogs } from './adminLogger';


/**
 * ADMIN ACTION MONITOR (V1.0)
 * 
 * This module provides a suite of pure functions to monitor and validate
 * critical administrative actions to ensure system integrity.
 * 
 * It is intended for internal use within the API.
 */
export {
  monitorMissionCreation,
  monitorStoreEdit,
  monitorPunishment,
  monitorLevelAdjustment,
  monitorQueueAction,
  generateAdminAlerts,
  isCritical,
  loadAdminLogs,
};
