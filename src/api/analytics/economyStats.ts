
import {
  missionCompletionLogData,
  coinTransactionsLogData,
  missionSubmissionsData,
  missionsData,
  redeemedItemsData,
  allUsersData,
  usableItemQueueData,
  artistOfTheDayQueueData,
  usableItemsData,
  storeItemsData
} from '../mockData';
import { BASE_MISSION_REWARDS } from '../economy/economy';
import { normalizePlan } from '../economy/plan-normalizer';

export const getDailyXpStats = () => {
  const stats: Record<string, number> = {};
  
  missionCompletionLogData.forEach(log => {
    const date = new Date(log.completedAt).toISOString().split('T')[0];
    stats[date] = (stats[date] || 0) + log.xpGained;
  });

  return stats;
};

export const getDailyLcStats = () => {
  const stats: Record<string, number> = {};

  coinTransactionsLogData
    .filter(t => t.type === 'earn')
    .forEach(t => {
      const date = new Date(t.dateISO).toISOString().split('T')[0];
      stats[date] = (stats[date] || 0) + t.amount;
    });

  return stats;
};

export const getMissionCompletionStats = () => {
  const byDuration = { short: 0, medium: 0, long: 0, custom: 0 };
  // Assuming categories A-F are stored in mission description or type in a specific way in a real DB.
  // For mock, we map types to categories if possible, or just count types.
  const byType: Record<string, number> = {};

  const approvedSubmissions = missionSubmissionsData.filter(s => s.status === 'approved');

  approvedSubmissions.forEach(sub => {
    const mission = missionsData.find(m => m.id === sub.missionId);
    if (mission) {
      // Duration stats
      if (mission.xp === BASE_MISSION_REWARDS.curta.xp) byDuration.short++;
      else if (mission.xp === BASE_MISSION_REWARDS.media.xp) byDuration.medium++;
      else if (mission.xp === BASE_MISSION_REWARDS.longa.xp) byDuration.long++;
      else byDuration.custom++;

      // Type stats
      byType[mission.type] = (byType[mission.type] || 0) + 1;
    }
  });

  return { byDuration, byType };
};

export const getStoreConsumptionStats = () => {
  const stats = {
    visual: 0,
    usable: 0,
    spotlight: 0,
    microphone: 0
  };

  const visualIds = new Set(storeItemsData.map(i => i.id));
  const usableIds = new Set(usableItemsData.map(i => i.id));

  redeemedItemsData.forEach(item => {
    if (item.itemId === 'ui-spotlight') {
      stats.spotlight++;
      stats.usable++; // It is also a usable item
    } else if (item.itemId === 'ui1') { // Microphone ID in mock
      stats.microphone++;
      stats.usable++;
    } else if (visualIds.has(item.itemId)) {
      stats.visual++;
    } else if (usableIds.has(item.itemId)) {
      stats.usable++;
    }
  });

  return stats;
};

export const getPlanEconomyStats = () => {
  // Normalized keys internally
  const stats: Record<string, { xp: number, lc: number, userCount: number }> = {
    'free': { xp: 0, lc: 0, userCount: 0 },
    'ascensao': { xp: 0, lc: 0, userCount: 0 },
    'profissional': { xp: 0, lc: 0, userCount: 0 },
    'hitmaker': { xp: 0, lc: 0, userCount: 0 }
  };

  // Map users to normalized plans
  const userPlans: Record<string, string> = {};
  allUsersData.forEach(u => {
    const normalized = normalizePlan(u.plan);
    if (stats[normalized]) {
      userPlans[u.id] = normalized;
      stats[normalized].userCount++;
    }
  });

  // Aggregate XP
  missionCompletionLogData.forEach(log => {
    const plan = userPlans[log.userId];
    if (plan) {
      stats[plan].xp += log.xpGained;
    }
  });

  // Aggregate LC (Earnings only)
  coinTransactionsLogData
    .filter(t => t.type === 'earn')
    .forEach(t => {
      const plan = userPlans[t.userId];
      if (plan) {
        stats[plan].lc += t.amount;
      }
    });

  // Remap to Display Names for Dashboard Compatibility
  return {
    'Free Flow': stats['free'],
    'Artista em Ascensão': stats['ascensao'],
    'Artista Profissional': stats['profissional'],
    'Hitmaker': stats['hitmaker']
  };
};

export const getQueueHealthStats = () => {
  const usablePending = usableItemQueueData.length;
  // In progress items in redeemedItemsData correspond to processing queue items roughly
  const usableProcessing = redeemedItemsData.filter(r => r.status === 'InProgress' && !r.formData).length; // formData check excludes visual rewards

  const spotlightPending = artistOfTheDayQueueData.length;
  // Spotlight doesn't really have a "processing" state in the queue, it goes straight to processed history/dashboard.
  // But we can count visual rewards in progress separately
  const visualProcessing = redeemedItemsData.filter(r => r.status === 'InProgress' && !!r.formData).length;

  return {
    usable: { pending: usablePending, processing: usableProcessing },
    spotlight: { pending: spotlightPending, processing: 0 },
    visualRewards: { processing: visualProcessing }
  };
};
