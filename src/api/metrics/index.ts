
// api/metrics/index.ts
import * as economyMetrics from './economyMetrics';
import * as missionMetrics from './missionMetrics';
import * as storeMetrics from './storeMetrics';
import * as queueMetrics from './queueMetrics';
import * as userMetrics from './userMetrics';
import * as metrics from './metrics';

/**
 * INTERNAL METRICS & ANALYTICS ENGINE (V1.0)
 * 
 * This module provides a suite of pure functions to analyze the application's
 * data without altering the actual mock database. It is intended for internal
 * use by administrators via the console to monitor system health and detect anomalies.
 */
export {
  economyMetrics,
  missionMetrics,
  storeMetrics,
  queueMetrics,
  userMetrics,
  metrics,
};
