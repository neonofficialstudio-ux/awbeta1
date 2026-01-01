
import * as db from '../mockData';
import { calculateLevelFromXp } from '../economy/economy';
import { logStressEvent, getStressLogs, clearStressLogs } from './logs/stress-log';
import type { User } from '../../types';
import { submitMission, dailyCheckIn } from '../missions';
import { redeemItem, useUsableItem, buyRaffleTickets } from '../store';
import { requestSubscriptionUpgrade } from '../users';
import { buyJackpotTicket } from '../games';
import { joinEvent } from '../events';
import { safeApproveMission } from '../safeguard/safeOps';
import { SanitizeObject, SanitizeString as safeString } from '../../core/sanitizer.core';
import { DiagnosticCore } from '../../services/diagnostic.core';
import { rankingAPI } from '../ranking/index';

// --- V1 INTERFACES (LEGACY) ---
interface StressConfig {
  users: number;
  actionsPerUser: number;
  includeMissions: boolean;
  includeStore: boolean;
  includeQueue: boolean;
  includeCheckIn: boolean;
  includeJackpot?: boolean; 
  includeEvents?: boolean;
  randomness: boolean;
}

export interface StressMetrics {
  totalActions: number;
  actionsByType: Record<string, number>;
  totalXpGained: number;
  totalLcGained: number;
  missionFailures: number;
  storeFailures: number;
  queueFailures: number;
  checkinFailures: number;
  jackpotFailures: number;
  eventFailures: number;
  executionTimeMs: number;
}

// --- V2 INTERFACES (MODERN) ---
export interface StressConfigV2 extends StressConfig {
  concurrency: number;         
  rampUpSeconds: number;       
  sustainSeconds: number;      
  rampDownSeconds: number;     
  
  burstMode?: {
    enabled: boolean;
    burstUsers: number;       
    burstDurationMs: number;  
    intervalMs?: number;       
  };
  
  includeSubscriptions?: boolean;
  includeRaffles?: boolean;
  includeRanking?: boolean;
}

export interface StressMetricsV2 {
  totalActions: number;
  actionsByType: Record<string, number>;
  totalXpGained: number;
  totalLcGained: number;
  missionFailures: number;
  storeFailures: number;
  queueFailures: number;
  checkinFailures: number;
  jackpotFailures: number;
  eventFailures: number;
  subscriptionFailures: number;
  raffleFailures: number;
  rankingFailures: number;
  executionTimeMs: number;
  
  throughput: number;           // RPS
  peakConcurrency: number;      
  avgLatencyMs: number;         
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRate: number;          
  
  latencyByType: Record<string, {
    avg: number;
    p95: number;
    count: number;
  }>;
  
  timeline: Array<{
    timestamp: number;
    activeUsers: number;
    actionsPerSecond: number;
  }>;
}

// --- SHARED UTILS ---

const createMockUser = (id: string): User => {
    return SanitizeObject({
        id: `stress-user-${id}-${Date.now()}`,
        name: `Stress Test User ${id}`,
        artisticName: `StressBot ${id}`,
        email: `stress${id}@test.com`,
        plan: 'Free Flow',
        level: 1,
        xp: 0,
        xpToNextLevel: 1000,
        coins: 5000, // Sufficient balance for tests
        monthlyMissionsCompleted: 0,
        totalMissionsCompleted: 0,
        weeklyProgress: 0,
        completedMissions: [],
        pendingMissions: [],
        completedEventMissions: [],
        pendingEventMissions: [],
        joinedEvents: [],
        phone: '',
        role: 'user',
        instagramUrl: '',
        weeklyCheckInStreak: 0,
        subscriptionHistory: [],
        punishmentHistory: [],
        unlockedAchievements: [],
        joined: new Date().toLocaleDateString('pt-BR'),
        joinedISO: new Date().toISOString()
    }) as User;
};

const EXPECTED_ERRORS = [
    "Você já enviou ou completou esta missão",
    "Você já enviou o máximo",
    "Check-in já realizado",
    "Saldo insuficiente",
    "Item esgotado",
    "Evento lotado",
    "Você já está participando",
    "Aguarde alguns segundos",
    "Limite diário atingido",
    "Rate limit",
    "congelada"
];

const isExpectedError = (error: any) => {
    const msg = safeString(error?.message || error);
    return EXPECTED_ERRORS.some(txt => msg.includes(txt));
};

// --- HELPER: Concurrency Runner ---

const runWithConcurrency = async <T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> => {
  const results: T[] = [];
  const executing: Set<Promise<void>> = new Set();
  
  for (const task of tasks) {
    const p = task().then(r => { results.push(r); });
    
    // Wrapper to cleanup from set when done
    const wrapper = p.then(() => { executing.delete(wrapper); });
    executing.add(wrapper);
    
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(executing);
  return results;
};

// --- CYCLE EXECUTORS ---

const runMissionCycle = async (user: User): Promise<{ success: boolean, xp: number, lc: number }> => {
    if (!user) return { success: false, xp: 0, lc: 0 };
    const missions = db.missionsData.filter(m => m.status === 'active');
    if (missions.length === 0) return { success: false, xp: 0, lc: 0 };
    
    const mission = missions[Math.floor(Math.random() * missions.length)];
    // Unique proof to bypass anti-duplicate checks in high concurrency
    const proof = `https://instagram.com/p/stress-${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    try {
        const result = await submitMission(user.id, mission.id, proof);
        if (result.newSubmission) {
            // Auto-approve to complete cycle and cleanup pending state for next run
            const { updatedUser } = await safeApproveMission(result.newSubmission, 'approved');
            if (updatedUser) {
                const xpDelta = Math.max(0, updatedUser.xp - user.xp);
                const lcDelta = Math.max(0, updatedUser.coins - user.coins);
                return { success: true, xp: xpDelta, lc: lcDelta };
            }
        }
        return { success: true, xp: 0, lc: 0 };
    } catch (e: any) {
        if (isExpectedError(e)) return { success: true, xp: 0, lc: 0 }; 
        DiagnosticCore.errors.capture(e, { context: "StressTest Mission" });
        return { success: false, xp: 0, lc: 0 };
    }
};

const runStoreCycle = async (user: User): Promise<{ success: boolean, cost: number }> => {
    if (!user) return { success: false, cost: 0 };
    const items = db.storeItemsData.filter(i => !i.isOutOfStock && i.price <= user.coins);
    if (items.length === 0) return { success: false, cost: 0 };
    const item = items[Math.floor(Math.random() * items.length)];
    try {
        const result = await redeemItem(user.id, item.id);
        if (result.success && result.updatedUser) {
             return { success: true, cost: user.coins - result.updatedUser.coins };
        }
        return { success: false, cost: 0 };
    } catch (e) {
        return { success: isExpectedError(e), cost: 0 };
    }
};

const runCheckInCycle = async (user: User): Promise<{ success: boolean, coins: number }> => {
    if (!user) return { success: false, coins: 0 };
    try {
        const result = await dailyCheckIn(user.id);
        return { success: true, coins: result.coinsGained };
    } catch (e) {
        return { success: isExpectedError(e), coins: 0 };
    }
};

const runQueueCycle = async (user: User): Promise<{ success: boolean }> => {
    if (!user) return { success: false };
    const items = db.usableItemsData.filter(i => !i.isOutOfStock && i.price <= user.coins);
    if (items.length === 0) return { success: false };
    const item = items[Math.floor(Math.random() * items.length)];
    try {
        const redeemResult = await redeemItem(user.id, item.id);
        if (!redeemResult.success) return { success: false };
        
        // Find the redeemed item
        const redeemedItem = db.redeemedItemsData.find(r => r.itemId === item.id && r.userId === user.id && r.status === 'Redeemed');
        if (redeemedItem) {
            const useResult = await useUsableItem(user.id, redeemedItem.id, `https://instagram.com/p/stress-${Date.now()}`);
            return { success: useResult.success };
        }
        return { success: false };
    } catch (e) {
        return { success: false };
    }
};

const runJackpotCycle = async (user: User): Promise<{ success: boolean, cost: number }> => {
    if (!user) return { success: false, cost: 0 };
    try {
        const result = await buyJackpotTicket(user.id);
        if (result.success && result.updatedUser) {
            return { success: true, cost: user.coins - result.updatedUser.coins };
        }
        if (result.message && isExpectedError(result.message)) return { success: true, cost: 0 };
        return { success: false, cost: 0 };
    } catch (e) {
        return { success: isExpectedError(e), cost: 0 };
    }
};

const runEventCycle = async (user: User): Promise<{ success: boolean, cost: number }> => {
    if (!user) return { success: false, cost: 0 };
    const activeEvents = db.eventsData.filter(e => e.status === 'current');
    if (activeEvents.length === 0) return { success: false, cost: 0 };
    const event = activeEvents[0];
    
    if (user.joinedEvents.includes(event.id)) return { success: true, cost: 0 };
    if (user.coins < event.entryCost) return { success: false, cost: 0 };
    
    try {
        const result = await joinEvent(user.id, event.id, event.entryCost, false);
        if (result.success && result.updatedUser) {
            return { success: true, cost: user.coins - result.updatedUser.coins };
        }
        return { success: false, cost: 0 };
    } catch (e) {
        return { success: isExpectedError(e), cost: 0 };
    }
};

const runSubscriptionCycle = async (user: User): Promise<{ success: boolean }> => {
    if (!user) return { success: false };
    try {
        const result = await requestSubscriptionUpgrade(user.id, 'Hitmaker');
        return { success: !!result.newRequest };
    } catch(e) {
        return { success: isExpectedError(e) };
    }
};

const runRaffleCycle = async (user: User): Promise<{ success: boolean, cost: number }> => {
     if (!user) return { success: false, cost: 0 };
     const activeRaffles = db.rafflesData.filter(r => r.status === 'active');
     if (activeRaffles.length === 0) return { success: false, cost: 0 };
     const raffle = activeRaffles[0];
     
     if (user.coins < raffle.ticketPrice) return { success: false, cost: 0 };
     
     try {
         const res = await buyRaffleTickets(user.id, raffle.id, 1);
         if (res.success && res.updatedUser) {
             return { success: true, cost: user.coins - res.updatedUser.coins };
         }
         return { success: false, cost: 0 };
     } catch (e) {
         return { success: isExpectedError(e), cost: 0 };
     }
};

const runRankingCycle = async (): Promise<{ success: boolean }> => {
    try {
        await rankingAPI.refresh();
        rankingAPI.getGlobalRanking();
        return { success: true };
    } catch (e) { return { success: false }; }
};

// --- BURST MODE ---

const executeBurst = async (burstUsers: number, durationMs: number) => {
  const burstStart = performance.now();
  const burstTasks: Promise<void>[] = [];
  
  // Create temp users for burst
  const tempUsers: User[] = [];
  for(let i=0; i<burstUsers; i++) {
      tempUsers.push(createMockUser(`burst-${i}`));
  }
  db.allUsersData.push(...tempUsers);
  
  console.log(`[STRESS V2] 🧨 BURST MODE: ${burstUsers} users firing simultaneously...`);

  // Fire ALL simultaneously
  for (let i = 0; i < burstUsers; i++) {
     const user = tempUsers[i];
     const p = runJackpotCycle(user).catch(e => null).then(() => {});
     burstTasks.push(p);
  }
  
  // Race against time limit
  await Promise.race([
    Promise.all(burstTasks),
    new Promise(r => setTimeout(r, durationMs))
  ]);

  const duration = performance.now() - burstStart;
  console.log(`[STRESS V2] 🧨 Burst Complete. Time: ${duration.toFixed(2)}ms`);
  
  // Cleanup
  db.allUsersData.splice(db.allUsersData.length - burstUsers, burstUsers);
};

// --- TASK GENERATION ---

const generateTasks = (users: User[], config: StressConfigV2) => {
    const tasks: (() => Promise<{ type: string, result: any, duration: number }>)[] = [];
    
    users.forEach(user => {
        for (let j = 0; j < config.actionsPerUser; j++) {
             const availableActions = [];
             if (config.includeMissions) availableActions.push('mission');
             if (config.includeStore) availableActions.push('store');
             if (config.includeQueue) availableActions.push('queue');
             if (config.includeCheckIn) availableActions.push('checkin');
             if (config.includeJackpot !== false) availableActions.push('jackpot');
             if (config.includeEvents !== false) availableActions.push('event');
             if (config.includeSubscriptions) availableActions.push('subscription');
             if (config.includeRaffles) availableActions.push('raffle');
             if (config.includeRanking) availableActions.push('ranking');

             if (availableActions.length === 0) break;
             
             const actionType = config.randomness 
                ? availableActions[Math.floor(Math.random() * availableActions.length)]
                : availableActions[j % availableActions.length];

             tasks.push(async () => {
                 const tStart = performance.now();
                 let result: any = { success: false };
                 
                 try {
                     if (actionType === 'mission') result = await runMissionCycle(user);
                     else if (actionType === 'store') result = await runStoreCycle(user);
                     else if (actionType === 'checkin') result = await runCheckInCycle(user);
                     else if (actionType === 'queue') result = await runQueueCycle(user);
                     else if (actionType === 'jackpot') result = await runJackpotCycle(user);
                     else if (actionType === 'event') result = await runEventCycle(user);
                     else if (actionType === 'subscription') result = await runSubscriptionCycle(user);
                     else if (actionType === 'raffle') result = await runRaffleCycle(user);
                     else if (actionType === 'ranking') result = await runRankingCycle();
                 } catch (e) {
                     DiagnosticCore.errors.capture(e, { context: `Stress V2 ${actionType}` });
                 }
                 
                 const tEnd = performance.now();
                 return { type: actionType, result, duration: tEnd - tStart };
             });
        }
    });
    
    return tasks;
};

// --- MAIN ENGINE ---

let lastTestMetricsV2: StressMetricsV2 | null = null;
let lastTestMetrics: StressMetrics | null = null;

const runStressTestV2 = async (config: StressConfigV2): Promise<StressMetricsV2> => {
    const startTime = performance.now();
    console.log(`[STRESS V2] Starting with ${config.users} users. Target Concurrency: ${config.concurrency}`);

    const latencies: number[] = [];
    const latenciesByType: Record<string, number[]> = {};
    
    const metrics: StressMetricsV2 = {
        totalActions: 0,
        actionsByType: {},
        totalXpGained: 0,
        totalLcGained: 0,
        missionFailures: 0,
        storeFailures: 0,
        queueFailures: 0,
        checkinFailures: 0,
        jackpotFailures: 0,
        eventFailures: 0,
        subscriptionFailures: 0,
        raffleFailures: 0,
        rankingFailures: 0,
        executionTimeMs: 0,
        throughput: 0,
        peakConcurrency: config.concurrency,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        successRate: 0,
        latencyByType: {},
        timeline: []
    };

    // 1. Create User Pool
    const tempUsers: User[] = [];
    for (let i = 0; i < config.users; i++) {
        tempUsers.push(createMockUser(String(i)));
    }
    const initialUserCount = db.allUsersData.length;
    db.allUsersData.push(...tempUsers);

    // 2. Generate Tasks
    const allTasks = generateTasks(tempUsers, config);
    
    // 3. Execution Phases (RampUp / Sustain / RampDown)
    // We split tasks roughly to simulate phases if duration is set, otherwise run all.
    // For V2 simple implementation, we just run all with concurrency control.
    // To simulate phases, we would need a task generator that runs over time.
    // Here we respect the 'concurrency' limit which is the key requirement.
    
    const results = await runWithConcurrency(allTasks, config.concurrency);
    
    // Process Results
    results.forEach(({ type, result, duration }) => {
        latencies.push(duration);
        if (!latenciesByType[type]) latenciesByType[type] = [];
        latenciesByType[type].push(duration);
        
        metrics.totalActions++;
        metrics.actionsByType[type] = (metrics.actionsByType[type] || 0) + 1;
        
        if (result.success) {
            if (result.xp) metrics.totalXpGained += result.xp;
            if (result.lc) metrics.totalLcGained += result.lc; // Can be negative for spend
        } else {
            if (type === 'mission') metrics.missionFailures++;
            else if (type === 'store') metrics.storeFailures++;
            else if (type === 'queue') metrics.queueFailures++;
            else if (type === 'checkin') metrics.checkinFailures++;
            else if (type === 'jackpot') metrics.jackpotFailures++;
            else if (type === 'event') metrics.eventFailures++;
            else if (type === 'subscription') metrics.subscriptionFailures++;
            else if (type === 'raffle') metrics.raffleFailures++;
            else if (type === 'ranking') metrics.rankingFailures++;
        }

        // Diagnostic Sampling (1%)
        if (Math.random() < 0.01) {
            DiagnosticCore.record('security', { 
                action: 'stress_action_v2',
                type,
                latencyMs: duration,
                success: result.success
            }, "stress-bot");
        }
    });

    // 4. Burst Mode
    if (config.burstMode?.enabled) {
        await executeBurst(config.burstMode.burstUsers, config.burstMode.burstDurationMs);
        metrics.peakConcurrency += config.burstMode.burstUsers;
    }

    // 5. Cleanup & Final Metrics
    db.allUsersData.splice(initialUserCount, tempUsers.length);

    const totalDuration = performance.now() - startTime;
    metrics.executionTimeMs = totalDuration;
    metrics.throughput = (metrics.totalActions / (totalDuration / 1000));
    
    latencies.sort((a, b) => a - b);
    if (latencies.length > 0) {
        metrics.avgLatencyMs = latencies.reduce((a,b)=>a+b, 0) / latencies.length;
        metrics.p50LatencyMs = latencies[Math.floor(latencies.length * 0.50)];
        metrics.p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)];
        metrics.p99LatencyMs = latencies[Math.floor(latencies.length * 0.99)];
    }

    Object.keys(latenciesByType).forEach(type => {
        const typeLats = latenciesByType[type].sort((a,b)=>a-b);
        metrics.latencyByType[type] = {
            count: typeLats.length,
            avg: typeLats.reduce((a,b)=>a+b,0)/typeLats.length,
            p95: typeLats[Math.floor(typeLats.length * 0.95)] || 0
        };
    });

    const totalFailures = metrics.missionFailures + metrics.storeFailures + metrics.queueFailures + metrics.checkinFailures + metrics.jackpotFailures + metrics.eventFailures + metrics.subscriptionFailures + metrics.raffleFailures + metrics.rankingFailures;
    metrics.successRate = metrics.totalActions > 0 ? ((metrics.totalActions - totalFailures) / metrics.totalActions) * 100 : 0;

    lastTestMetricsV2 = metrics;
    
    // Legacy mapping for compatibility
    lastTestMetrics = {
        totalActions: metrics.totalActions,
        actionsByType: metrics.actionsByType,
        totalXpGained: metrics.totalXpGained,
        totalLcGained: metrics.totalLcGained,
        missionFailures: metrics.missionFailures,
        storeFailures: metrics.storeFailures,
        queueFailures: metrics.queueFailures,
        checkinFailures: metrics.checkinFailures,
        jackpotFailures: metrics.jackpotFailures,
        eventFailures: metrics.eventFailures,
        executionTimeMs: metrics.executionTimeMs
    };

    console.log(`[STRESS V2] Finished. Throughput: ${metrics.throughput.toFixed(2)} req/s`);
    return metrics;
};

// --- LEGACY WRAPPER ---
const runStressTest = async (config: StressConfig) => {
    return runStressTestV2({
        ...config,
        concurrency: 50, // Default for V1
        rampUpSeconds: 0,
        sustainSeconds: 0,
        rampDownSeconds: 0
    });
};

export const resetStressState = () => {
    lastTestMetrics = null;
    lastTestMetricsV2 = null;
    clearStressLogs();
};

const stressTest = {
    run: runStressTest,
    lastResults: () => lastTestMetrics,
    logs: getStressLogs,
    clearLogs: clearStressLogs,
    reset: resetStressState,
};

export const StressTestV2 = {
    run: runStressTestV2,
    runBurst: executeBurst,
    lastResults: () => lastTestMetricsV2,
    logs: getStressLogs,
    clearLogs: clearStressLogs,
    
    presets: {
        light: { users: 50, actionsPerUser: 5, concurrency: 10, includeMissions: true, includeStore: true, includeQueue: false, includeCheckIn: true, randomness: true, rampUpSeconds: 0, sustainSeconds: 0, rampDownSeconds: 0 } as StressConfigV2,
        medium: { users: 200, actionsPerUser: 10, concurrency: 50, includeMissions: true, includeStore: true, includeQueue: true, includeCheckIn: true, randomness: true, rampUpSeconds: 2, sustainSeconds: 5, rampDownSeconds: 2 } as StressConfigV2,
        heavy: { users: 500, actionsPerUser: 20, concurrency: 100, includeMissions: true, includeStore: true, includeQueue: true, includeCheckIn: true, includeJackpot: true, randomness: true, rampUpSeconds: 5, sustainSeconds: 10, rampDownSeconds: 5 } as StressConfigV2,
        nftDrop: { 
            users: 1000, 
            actionsPerUser: 3,
            concurrency: 200,
            includeJackpot: true,
            includeStore: true,
            randomness: false,
            includeMissions: false,
            includeQueue: false,
            includeCheckIn: false,
            rampUpSeconds: 1, sustainSeconds: 5, rampDownSeconds: 1,
            burstMode: { enabled: true, burstUsers: 500, burstDurationMs: 5000 }
        } as StressConfigV2
    },
    
    help: () => console.log(`
        StressTestV2 - Concorrência Real
        ================================
        AW.stressV2.run(config) - Executar teste custom
        AW.stressV2.run(AW.stressV2.presets.nftDrop) - Preset Drop
        AW.stressV2.runBurst(users, durationMs) - Burst isolado
    `)
};

export default stressTest;
