
// api/simulation/index.ts
import { createSimUser, advanceSimUserLevel, resetSimUser } from './simulateUser';
import { generateSimMission, submitSimMission, resolveSimMission } from './simulateMission';
import { simulateDailyGains, simulateDailyLimits, simulateEconomyCycle } from './simulateEconomy';
import { simulatePurchase, simulateUseItem } from './simulateStore';
import { simulateQueueEntry, simulateQueueProcessing, simulateQueueCompletion } from './simulateQueue';
import { simulateCheckIn, simulateCheckInCycle } from './simulateCheckIn';
import { UserLoadSimulator } from './userLoadSimulator';
// stressTest removed to avoid circular dependency
import { resetEconomyState } from './resetEconomy';
import { generateHeatmap } from './systemHeatmap';
import { detectAnomalies } from './anomalyWatchdog';
import { analyzeMissionImpact } from './missionImpact';
import { analyzeReleaseReadiness } from './releaseReadiness';

// Global Debug Binding
if (typeof window !== "undefined") {
    (window as any).AW = (window as any).AW || {};
    (window as any).AW.simulation = (window as any).AW.simulation || {};
    (window as any).AW.simulation.heatmap = {
        run: generateHeatmap
    };
    (window as any).AW.simulation.watchdog = {
        run: detectAnomalies
    };
    (window as any).AW.simulation.impact = {
        analyze: analyzeMissionImpact
    };
    (window as any).AW.simulation.release = {
        analyze: analyzeReleaseReadiness
    };
}

export {
 createSimUser,
 advanceSimUserLevel,
 resetSimUser,
 generateSimMission,
 submitSimMission,
 resolveSimMission,
 simulateDailyGains,
 simulateDailyLimits,
 simulateEconomyCycle,
 simulatePurchase,
 simulateUseItem,
 simulateQueueEntry,
 simulateQueueProcessing,
 simulateQueueCompletion,
 simulateCheckIn,
 simulateCheckInCycle,
 UserLoadSimulator,
 resetEconomyState,
 generateHeatmap,
 detectAnomalies,
 analyzeMissionImpact,
 analyzeReleaseReadiness
}
