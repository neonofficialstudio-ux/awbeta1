
// api/simulation/anomalyWatchdog.ts

import { BASE_MISSION_REWARDS } from '../economy/economy';

type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
type AnomalyType = 'economy' | 'missions' | 'store' | 'growth' | 'pattern';

interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  relatedData: any;
}

interface WatchdogReport {
  anomalies: Anomaly[];
  scanTimestamp: number;
}

// Thresholds
const THRESHOLDS = {
  MAX_XP_PER_USER_DAY: 2000, // Impossible even for Hitmaker doing max missions
  MAX_LC_PER_USER_DAY: 1000, // Impossible without massive spending or bugs
  MAX_LEVEL_UPS_DAY: 5, // Suspicious level velocity
  STORE_PURCHASE_RATIO: 2.0, // Purchases vs Missions (Spending more than earning actions)
  GROWTH_SPIKE_PERCENT: 0.5, // 50% growth in a single step (suspicious unless day 1)
};

/**
 * Analyzes simulation data for anomalies.
 * Handles data structures from:
 * - UserLoadSimulator (timeline based)
 * - StressEngine (metrics/summary based)
 * - General Simulation Logs
 */
export const detectAnomalies = (simulationData: any): WatchdogReport => {
    const anomalies: Anomaly[] = [];

    if (!simulationData) {
        return { anomalies, scanTimestamp: Date.now() };
    }

    // 1. Analyze User Load Simulator Data (Timeline)
    if (simulationData.fullTimeline && Array.isArray(simulationData.fullTimeline)) {
        analyzeTimeline(simulationData.fullTimeline, anomalies);
    }

    // 2. Analyze Stress Engine Data (Metrics)
    if (simulationData.totalActions && simulationData.actionsByType) {
        analyzeStressMetrics(simulationData, anomalies);
    }

    // 3. Analyze Logs (Pattern Detection)
    if (simulationData.logs && Array.isArray(simulationData.logs)) {
        analyzeLogs(simulationData.logs, anomalies);
    }

    return {
        anomalies,
        scanTimestamp: Date.now()
    };
};

const analyzeTimeline = (timeline: any[], anomalies: Anomaly[]) => {
    timeline.forEach((dayStat: any, index: number) => {
        const day = dayStat.day;
        const users = dayStat.userCount || 1;

        // 1. Economy Irreal Checks
        const xpPerUser = dayStat.xpGenerated / users;
        const lcPerUser = dayStat.coinsGenerated / users;
        
        if (xpPerUser > THRESHOLDS.MAX_XP_PER_USER_DAY) {
            anomalies.push({
                type: 'economy',
                severity: 'critical',
                message: `Dia ${day}: Geração de XP por usuário (${Math.round(xpPerUser)}) excede o limite físico.`,
                relatedData: { day, xpPerUser, limit: THRESHOLDS.MAX_XP_PER_USER_DAY }
            });
        }

        if (lcPerUser > THRESHOLDS.MAX_LC_PER_USER_DAY) {
             anomalies.push({
                type: 'economy',
                severity: 'high',
                message: `Dia ${day}: Geração de LC por usuário (${Math.round(lcPerUser)}) incompatível com missões simuladas.`,
                relatedData: { day, lcPerUser, limit: THRESHOLDS.MAX_LC_PER_USER_DAY }
            });
        }

        const levelUpsPerUser = dayStat.levelUps / users;
        if (levelUpsPerUser > THRESHOLDS.MAX_LEVEL_UPS_DAY) {
            anomalies.push({
                type: 'economy',
                severity: 'medium',
                message: `Dia ${day}: Level-ups rápidos demais (${levelUpsPerUser.toFixed(1)} por usuário).`,
                relatedData: { day, levelUpsPerUser }
            });
        }

        // 2. Store & Missions Ratio
        // If missions are 0 but store purchases exist, it's suspicious (where did the money come from? unless start bonus)
        if (dayStat.missionsCompleted === 0 && dayStat.storePurchases > users * 2 && day > 1) {
             anomalies.push({
                type: 'store',
                severity: 'medium',
                message: `Dia ${day}: Explosão de compras sem missões correspondentes.`,
                relatedData: { day, purchases: dayStat.storePurchases, missions: dayStat.missionsCompleted }
            });
        }

        // 3. Growth Checks
        if (index > 0) {
            const prevUsers = timeline[index - 1].userCount;
            if (users > prevUsers * (1 + THRESHOLDS.GROWTH_SPIKE_PERCENT) && users > 100) {
                 anomalies.push({
                    type: 'growth',
                    severity: 'low',
                    message: `Dia ${day}: Crescimento artificial detectado (> ${(THRESHOLDS.GROWTH_SPIKE_PERCENT * 100)}%).`,
                    relatedData: { day, prevUsers, users }
                });
            }
            if (users < prevUsers * 0.8) {
                anomalies.push({
                    type: 'growth',
                    severity: 'high',
                    message: `Dia ${day}: Queda brusca incoerente de usuários (-20%).`,
                    relatedData: { day, prevUsers, users }
                });
            }
        }
    });
};

const analyzeStressMetrics = (metrics: any, anomalies: Anomaly[]) => {
    // 1. Mission/Store Imbalance
    const missions = metrics.actionsByType?.mission || 0;
    const store = metrics.actionsByType?.store || 0;
    
    if (store > missions * THRESHOLDS.STORE_PURCHASE_RATIO && missions > 0) {
        anomalies.push({
            type: 'pattern',
            severity: 'high',
            message: `Stress Test: Ciclo infinito de XP -> LC -> XP detectado ou saldo infinito.`,
            relatedData: { missions, store, ratio: (store/missions).toFixed(2) }
        });
    }

    // 2. Failure Rates
    const totalActions = metrics.totalActions || 1;
    const totalFailures = (metrics.missionFailures || 0) + (metrics.storeFailures || 0) + (metrics.queueFailures || 0) + (metrics.checkinFailures || 0);
    const failureRate = totalFailures / totalActions;

    if (failureRate > 0.5) {
         anomalies.push({
            type: 'pattern',
            severity: 'critical',
            message: `Stress Test: Taxa de falha crítica (${(failureRate * 100).toFixed(1)}%). O sistema pode estar instável.`,
            relatedData: { totalActions, totalFailures }
        });
    }

    // 3. Store Logic
    if (metrics.storeFailures > metrics.actionsByType?.store * 0.9 && metrics.actionsByType?.store > 10) {
         anomalies.push({
            type: 'store',
            severity: 'medium',
            message: `Stress Test: Comportamento repetitivo de compra falha (possível loop de compra sem saldo).`,
            relatedData: { attempts: metrics.actionsByType?.store, failures: metrics.storeFailures }
        });
    }
};

const analyzeLogs = (logs: any[], anomalies: Anomaly[]) => {
    // 1. Detect Spam of specific queue items (Spotlight/Mic)
    const spotlightCount = logs.filter(l => 
        l.type === 'queue' && 
        l.status === 'success' && 
        // Heuristic: check payload or context
        JSON.stringify(l.payload).includes('spotlight') 
    ).length;

    const totalQueue = logs.filter(l => l.type === 'queue').length;

    if (totalQueue > 50 && spotlightCount > totalQueue * 0.8) {
        anomalies.push({
            type: 'store',
            severity: 'medium',
            message: `Simulação: Spam de SPOTLIGHT/Microfone detectado na fila.`,
            relatedData: { spotlightCount, totalQueue }
        });
    }

    // 2. Pattern Check: Repeating same mission ID
    const missionIds = logs
        .filter(l => l.type === 'mission' && l.payload?.missionId)
        .map(l => l.payload.missionId);
    
    const uniqueMissions = new Set(missionIds).size;
    if (missionIds.length > 100 && uniqueMissions < 5) {
         anomalies.push({
            type: 'missions',
            severity: 'low',
            message: `Uso repetitivo das mesmas 5 ou menos missões em grande volume.`,
            relatedData: { totalMissions: missionIds.length, uniqueMissions }
        });
    }
};
