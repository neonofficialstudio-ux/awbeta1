
import type { User, Mission, StoreItem } from '../../types';
import { 
  calculateMissionRewards, 
  evaluateCheckIn, 
  calculateDiscountedPrice, 
  BASE_MISSION_REWARDS, 
  getDailyMissionLimit 
} from '../economy/economy';
import { storeItemsData, usableItemsData } from '../mockData';

// --- Internal Types (Local) ---

type PlanStats = { users: number; xp: number; lc: number };

type ScenarioResult = {
  label: string;
  description: string;
  totalUsers: number;
  totalMissionsCompleted: number;
  totalXpGenerated: number;
  totalLcGenerated: number;
  totalLcSpentStore: number;
  breakdownByPlan: {
    free: PlanStats;
    ascensao: PlanStats;
    profissional: PlanStats;
    hitmaker: PlanStats;
  };
};

// --- Helper: Mock Data Generator for Simulation ---

const createSimUser = (id: string, plan: User['plan']): User => ({
  id: `sim-user-${id}`,
  name: `Sim User ${id}`,
  artisticName: `Artist ${id}`,
  email: `sim${id}@test.com`,
  plan,
  role: 'user',
  level: 1,
  xp: 0,
  xpToNextLevel: 1000,
  coins: 0,
  monthlyMissionsCompleted: 0,
  totalMissionsCompleted: 0,
  weeklyProgress: 0,
  completedMissions: [],
  pendingMissions: [],
  completedEventMissions: [],
  pendingEventMissions: [],
  joinedEvents: [],
  phone: '',
  avatarUrl: '',
  instagramUrl: '',
  weeklyCheckInStreak: 0,
  subscriptionHistory: [],
  punishmentHistory: [],
  unlockedAchievements: [],
});

const getGenericMission = (type: 'curta' | 'media' | 'longa'): Mission => {
  const rewards = BASE_MISSION_REWARDS[type];
  return {
    id: `sim-mission-${type}`,
    title: `Simulated ${type}`,
    description: 'Simulation',
    type: 'creative',
    xp: rewards.xp,
    coins: rewards.coins,
    createdAt: new Date().toISOString(),
    deadline: new Date().toISOString(),
    status: 'active'
  };
};

const allStoreItems = [...storeItemsData, ...usableItemsData];

// --- Core Simulation Runner ---

const runSimulationLoop = async (
  config: {
    label: string,
    description: string,
    durationDays: number,
    userConfig: { plan: User['plan'], count: number }[],
    behavior: {
      missionCompletionRate: number; // 0-1 (probability of maxing out daily limit)
      storePurchaseRate: number; // 0-1 (probability of buying if affordable)
      checkInRate: number; // 0-1
    }
  }
): Promise<ScenarioResult> => {
  // 1. Init State
  let users: User[] = [];
  let counter = 0;
  
  config.userConfig.forEach(conf => {
    for (let i = 0; i < conf.count; i++) {
      users.push(createSimUser(String(counter++), conf.plan));
    }
  });

  let totalMissionsCompleted = 0;
  let totalLcSpentStore = 0;

  // 2. Run Day Loop
  for (let day = 0; day < config.durationDays; day++) {
    for (let user of users) {
      // A. Check-in
      if (Math.random() <= config.behavior.checkInRate) {
        // Manually handle date logic for simulation to force streak update without relying on real time
        user.weeklyCheckInStreak = (user.weeklyCheckInStreak % 7) + 1; 
        
        // Calculate rewards
        // We use evaluateCheckIn logic conceptually, but simplified for speed/stability in loop
        // Base
        user.coins += 3; 
        // Bonus day 7
        if (user.weeklyCheckInStreak === 7) {
           user.coins += 10;
        }
      } else {
        user.weeklyCheckInStreak = 0;
      }

      // B. Missions
      const limit = getDailyMissionLimit(user.plan) ?? 10; // Hitmaker 'unlimited' capped at 10 for realistic sim
      if (Math.random() <= config.behavior.missionCompletionRate) {
        for (let m = 0; m < limit; m++) {
          // Rotate mission types
          const missionType = m % 3 === 0 ? 'longa' : (m % 2 === 0 ? 'media' : 'curta');
          const mission = getGenericMission(missionType);
          
          const result = await calculateMissionRewards(user, mission);
          user = result.updatedUser; // Update user state (xp, coins, level)
          totalMissionsCompleted++;
        }
      }

      // C. Store
      if (Math.random() <= config.behavior.storePurchaseRate) {
        // Try to buy a random item
        const randomItem = allStoreItems[Math.floor(Math.random() * allStoreItems.length)];
        if (randomItem) {
          const price = calculateDiscountedPrice(randomItem.price, user.plan);
          if (user.coins >= price) {
            user.coins -= price;
            totalLcSpentStore += price;
          }
        }
      }
    }
  }

  // 3. Aggregate Results
  const result: ScenarioResult = {
    label: config.label,
    description: config.description,
    totalUsers: users.length,
    totalMissionsCompleted,
    totalXpGenerated: 0,
    totalLcGenerated: 0,
    totalLcSpentStore,
    breakdownByPlan: {
      free: { users: 0, xp: 0, lc: 0 },
      ascensao: { users: 0, xp: 0, lc: 0 },
      profissional: { users: 0, xp: 0, lc: 0 },
      hitmaker: { users: 0, xp: 0, lc: 0 },
    }
  };

  // Helper to map plan string to key
  const mapPlanToKey = (p: string): keyof ScenarioResult['breakdownByPlan'] | null => {
    if (p.includes('Free')) return 'free';
    if (p.includes('Ascensão')) return 'ascensao';
    if (p.includes('Profissional')) return 'profissional';
    if (p.includes('Hitmaker')) return 'hitmaker';
    return null;
  };

  users.forEach(u => {
    const key = mapPlanToKey(u.plan);
    if (key) {
      result.breakdownByPlan[key].users++;
      result.breakdownByPlan[key].xp += u.xp;
      result.breakdownByPlan[key].lc += u.coins; // Remaining coins (generated - spent)
    }
    result.totalXpGenerated += u.xp;
    result.totalLcGenerated += u.coins; // This is actually net balance, but serves for the snapshot
  });
  
  // Adjust total LC generated to include spent amount for accurate "Generation" metric
  result.totalLcGenerated += totalLcSpentStore;
  
  // Adjust breakdown LC to include spent? No, let's keep breakdown as "Net Wealth"
  
  return result;
};

// --- Exported Scenarios ---

export const runLightMonthScenario = async (): Promise<ScenarioResult> => {
  return await runSimulationLoop({
    label: "Light Month",
    description: "30 dias, poucos usuários, uso leve.",
    durationDays: 30,
    userConfig: [
      { plan: 'Free Flow', count: 20 },
      { plan: 'Artista em Ascensão', count: 5 }
    ],
    behavior: {
      missionCompletionRate: 0.3,
      checkInRate: 0.5,
      storePurchaseRate: 0.1
    }
  });
};

export const runHeavyHitmakerScenario = async (): Promise<ScenarioResult> => {
  return await runSimulationLoop({
    label: "Heavy Hitmaker",
    description: "Alta atividade de usuários premium.",
    durationDays: 30,
    userConfig: [
      { plan: 'Hitmaker', count: 10 },
      { plan: 'Artista Profissional', count: 10 }
    ],
    behavior: {
      missionCompletionRate: 0.9, // Maxing limits almost every day
      checkInRate: 0.95,
      storePurchaseRate: 0.8 // Buying frequently
    }
  });
};

export const runFreeAbuseScenario = async (): Promise<ScenarioResult> => {
  return await runSimulationLoop({
    label: "Free Tier Abuse",
    description: "Muitos usuários Free maximizando ganhos.",
    durationDays: 30,
    userConfig: [
      { plan: 'Free Flow', count: 100 }
    ],
    behavior: {
      missionCompletionRate: 1.0, // Always hitting the 1 mission limit
      checkInRate: 1.0, // Perfect streak
      storePurchaseRate: 0.05 // Hoarding coins mostly
    }
  });
};

export const runStoreStressScenario = async (): Promise<ScenarioResult> => {
  return await runSimulationLoop({
    label: "Store Stress Test",
    description: "Alta pressão de resgates na loja.",
    durationDays: 60, // Longer period to accumulate coins
    userConfig: [
      { plan: 'Artista em Ascensão', count: 50 },
      { plan: 'Artista Profissional', count: 20 }
    ],
    behavior: {
      missionCompletionRate: 0.8,
      checkInRate: 0.8,
      storePurchaseRate: 1.0 // Attempts to buy every day if possible
    }
  });
};