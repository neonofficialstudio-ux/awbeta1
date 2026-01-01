
import { calculateLevelFromXp, BASE_MISSION_REWARDS } from '../economy/economy';

interface SimulationConfig {
  startUsers: number;
  dailyGrowth: number; // percentage (0.05 = 5%)
  days: number;
  missionRate: number; // 0-1
  storeRate: number; // 0-1
  checkinRate: number; // 0-1
}

interface SimUser {
  id: number;
  xp: number;
  coins: number;
  level: number;
}

interface DailyStats {
  day: number;
  userCount: number;
  missionsCompleted: number;
  storePurchases: number;
  checkins: number;
  levelUps: number;
  coinsGenerated: number;
  xpGenerated: number;
}

interface SimulationResult {
  totalDays: number;
  userCountTimeline: number[];
  missionsTimeline: number[];
  storeTimeline: number[];
  checkinTimeline: number[];
  levelUpsTimeline: number[];
  coinsGeneratedTotal: number;
  xpGeneratedTotal: number;
  finalUserCount: number;
  fullTimeline: DailyStats[];
}

let lastResults: SimulationResult | null = null;

// Internal state for the simulation run
let simUsers: SimUser[] = [];
let nextUserId = 1;

// --- Helper Functions ---

const generateUsers = (count: number): SimUser[] => {
  const newUsers: SimUser[] = [];
  for (let i = 0; i < count; i++) {
    newUsers.push({
      id: nextUserId++,
      xp: 0,
      coins: 100, // Starter bonus simulation
      level: 1
    });
  }
  return newUsers;
};

const simulateCheckIn = (user: SimUser): number => {
  // Simplified check-in logic: flat 5 coins avg (blending streak bonuses)
  const coins = 5;
  user.coins += coins;
  return coins;
};

const simulateMissionForUser = (user: SimUser): { xp: number, coins: number } => {
  // Randomly pick a mission type weight
  const rand = Math.random();
  let reward = BASE_MISSION_REWARDS.curta;
  if (rand > 0.6) reward = BASE_MISSION_REWARDS.media;
  if (rand > 0.9) reward = BASE_MISSION_REWARDS.longa;

  user.xp += reward.xp;
  user.coins += reward.coins;
  
  // Check Level Up
  const { level } = calculateLevelFromXp(user.xp);
  let levelUp = 0;
  if (level > user.level) {
    levelUp = level - user.level;
    user.level = level;
  }
  
  return { xp: reward.xp, coins: reward.coins };
};

const simulateStorePurchase = (user: SimUser): boolean => {
  // Simplified store logic: avg item cost 500
  const avgCost = 500;
  if (user.coins >= avgCost) {
    user.coins -= avgCost;
    return true;
  }
  return false;
};

const simulateDay = (dayIndex: number, config: SimulationConfig): DailyStats => {
  const stats: DailyStats = {
    day: dayIndex + 1,
    userCount: simUsers.length,
    missionsCompleted: 0,
    storePurchases: 0,
    checkins: 0,
    levelUps: 0,
    coinsGenerated: 0,
    xpGenerated: 0,
  };

  // 1. Growth: Add new users at start of day
  const newCount = Math.floor(simUsers.length * config.dailyGrowth);
  if (newCount > 0) {
    const newUsers = generateUsers(newCount);
    simUsers.push(...newUsers);
    stats.userCount += newCount;
  }

  // 2. Activity Loop
  for (const user of simUsers) {
    // Check-in
    if (Math.random() <= config.checkinRate) {
      stats.checkins++;
      stats.coinsGenerated += simulateCheckIn(user);
    }

    // Missions
    if (Math.random() <= config.missionRate) {
      stats.missionsCompleted++;
      const rewards = simulateMissionForUser(user);
      stats.coinsGenerated += rewards.coins;
      stats.xpGenerated += rewards.xp;
    }

    // Store
    if (Math.random() <= config.storeRate) {
      if (simulateStorePurchase(user)) {
        stats.storePurchases++;
      }
    }
  }
  
  return stats;
};

// --- Main Function ---

export const simulateUserGrowth = async (config: SimulationConfig): Promise<SimulationResult> => {
  console.time("UserLoadSimulation");
  
  // Reset State
  simUsers = generateUsers(config.startUsers);
  nextUserId = config.startUsers + 1;
  
  const timeline: DailyStats[] = [];
  let totalCoins = 0;
  let totalXp = 0;

  // Since this is a high-level heuristic simulation loop not hitting the actual async engines
  // we can keep it synchronous logic wrapped in async promise to match interface expectations.
  // The logic inside uses simplified math for speed, not the heavy EconomyEngineV6.
  
  for (let day = 0; day < config.days; day++) {
    const dayStats = simulateDay(day, config);
    timeline.push(dayStats);
    totalCoins += dayStats.coinsGenerated;
    totalXp += dayStats.xpGenerated;
    // Allow UI to breathe in heavy sim
    if (day % 10 === 0) await new Promise(r => setTimeout(r, 0));
  }

  // Aggregate Results
  const result: SimulationResult = {
    totalDays: config.days,
    userCountTimeline: timeline.map(d => d.userCount),
    missionsTimeline: timeline.map(d => d.missionsCompleted),
    storeTimeline: timeline.map(d => d.storePurchases),
    checkinTimeline: timeline.map(d => d.checkins),
    levelUpsTimeline: timeline.map(d => d.levelUps), // Currently 0 due to optimization decision, could connect later
    coinsGeneratedTotal: totalCoins,
    xpGeneratedTotal: totalXp,
    finalUserCount: simUsers.length,
    fullTimeline: timeline
  };

  lastResults = result;
  console.timeEnd("UserLoadSimulation");
  console.log("[User Load Sim] Complete:", result);
  
  return result;
};

export const resetUserLoadState = () => {
    simUsers = [];
    nextUserId = 1;
    lastResults = null;
};

export const UserLoadSimulator = {
  run: simulateUserGrowth,
  last: () => lastResults,
  reset: resetUserLoadState
};

// Register globally
if (typeof window !== "undefined") {
    (window as any).AW = (window as any).AW || {};
    (window as any).AW.simulation = (window as any).AW.simulation || {};
    (window as any).AW.simulation.userGrowth = UserLoadSimulator;
}

export default UserLoadSimulator;