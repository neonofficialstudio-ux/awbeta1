
import {
  getDailyXpStats,
  getDailyLcStats,
  getMissionCompletionStats,
  getStoreConsumptionStats,
  getPlanEconomyStats,
  getQueueHealthStats
} from './economyStats';

export const getEconomyDashboard = () => {
  return {
    timestamp: new Date().toISOString(),
    xpDaily: getDailyXpStats(),
    lcDaily: getDailyLcStats(),
    missionStats: getMissionCompletionStats(),
    storeStats: getStoreConsumptionStats(),
    planStats: getPlanEconomyStats(),
    queueStats: getQueueHealthStats(),
  };
};
