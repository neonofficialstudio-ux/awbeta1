// api/errors/index.ts

import {
    logInfo,
    logWarning,
    logError,
    logCritical
} from './logger';

import {
    detectXpSpike,
    detectCoinSpike,
    detectMissionAbuse,
    detectQueueStall,
    detectStoreExploit
} from './anomaly-detector';

import {
    handleApiError,
    handleCriticalFailure,
    handleUnexpectedBehavior
} from './error-handler';

import {
    generateAdminAlert,
    autoAlertEconomy,
    autoAlertQueues,
    autoAlertStore,
    autoAlertMissions,
    autoAlertSystem
} from './alerts';

export {
    logInfo,
    logWarning,
    logError,
    logCritical,
    detectXpSpike,
    detectCoinSpike,
    detectMissionAbuse,
    detectQueueStall,
    detectStoreExploit,
    handleApiError,
    handleCriticalFailure,
    handleUnexpectedBehavior,
    generateAdminAlert,
    autoAlertEconomy,
    autoAlertQueues,
    autoAlertStore,
    autoAlertMissions,
    autoAlertSystem
};
