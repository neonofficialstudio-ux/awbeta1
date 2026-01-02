
// api/economy/economyLogger.ts

type EconomyLogEvent = {
  timestamp: number;
  type: string;
  userId: string;
  amount?: number;
  before?: number;
  after?: number;
  source?: string;   // "mission", "level_up", "checkin", "store", etc
  payload?: any;
};

const economyLog: EconomyLogEvent[] = [];

export function logEconomyEvent(event: EconomyLogEvent) {
  economyLog.push(event);
}

export function getEconomyLog() {
  return [...economyLog];
}

export function getEconomyTotals() {
    const totals = {
       totalXp: 0,
       totalLc: 0,
       totalLevelUps: 0,
       totalCheckins: 0,
       totalStoreSpend: 0
    };
    economyLog.forEach(e => {
       if (e.type === 'mission_reward') {
           totals.totalLc += e.amount || 0;
           if (e.payload?.xp) totals.totalXp += e.payload.xp;
       }
       if (e.type === 'level_up_bonus') {
            totals.totalLc += e.amount || 0;
       }
       if (e.type === 'level_up') {
            totals.totalLevelUps++;
       }
       if (e.type === 'daily_check_in') {
            totals.totalLc += e.amount || 0;
            totals.totalCheckins++;
       }
       if (e.type === 'checkin_bonus') {
            totals.totalLc += e.amount || 0;
       }
       if (e.type === 'store_purchase') {
           totals.totalStoreSpend += e.amount || 0;
       }
    });
    return totals;
}

export function getEconomyEventsByType() {
    const counts: Record<string, number> = {};
    economyLog.forEach(e => {
        counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return counts;
}

export function getUserEconomyStats(userId: string) {
   const stats = {
      xpEarned: 0,
      lcEarned: 0,
      lcSpent: 0,
      levelUps: 0,
      checkins: 0,
      missionRewards: 0,
      purchases: 0,
      punishments: 0,
   };
   economyLog.filter(e => e.userId === userId).forEach(e => {
       if (e.type === 'mission_reward') {
           stats.missionRewards++;
           stats.lcEarned += e.amount || 0;
           if (e.payload?.xp) stats.xpEarned += e.payload.xp;
       }
       if (e.type === 'level_up_bonus') {
           stats.lcEarned += e.amount || 0;
       }
       if (e.type === 'level_up') {
           stats.levelUps++;
       }
       if (e.type === 'daily_check_in') {
           stats.checkins++;
           stats.lcEarned += e.amount || 0;
       }
       if (e.type === 'checkin_bonus') {
           stats.lcEarned += e.amount || 0;
       }
       if (e.type === 'store_purchase') {
           stats.purchases++;
           stats.lcSpent += e.amount || 0;
       }
       if (e.type === 'punishment') {
           stats.punishments++;
       }
   });
   return stats;
}
