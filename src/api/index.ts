
// API HUB V5.0 - CONSOLIDATED ARCHITECTURE
// Eventos foram descontinuados (Supabase-only). Não reexportar para evitar bundle/rotas mock.

// Admin & Analytics
export { adminPainelData } from "./admin/painel";
export { adminAnalyticsAPI } from "./admin/analytics";
export { adminInsightsAPI } from "./admin/insights";
// Consolidated Admin Engine
import { AdminEngine } from "./admin/AdminEngine";
export { AdminEngine };
import { config } from "../core/config";
import {
    fetchLatestMonthlyWinners as fetchLatestMonthlyWinnersSupabase,
    fetchHallOfFame as fetchHallOfFameSupabase,
} from "./supabase/economy";

export * from "./artistOfDay";
export * from "./missions/public";
export * from "./ranking/public";
export * from "./dashboard/public";
export { loadSupabaseAdminRepository } from "./admin/loader";

// Auth & Session (V4.0)
export { AuthEngineV4 } from "./auth/authEngineV4";
export { SessionEngine } from "./auth/sessionEngine";
export { UserIdentity } from "./auth/userIdentity";

// Import locally and export
import { runAuthSelfTest } from "./auth/authSelfTest";
export { runAuthSelfTest };

// Queue Engine V5.2
import { QueueEngineV5 } from "./queue/queueEngineV5";
import { runQueueSelfTest } from "./queue/queueSelfTest";

export { 
    queueAddAPI, 
    queueListAPI, 
    queueNextAPI, 
    queueProcessNextAPI, 
    queueRunCycleAPI 
} from "./queue/index";

export const queueEngineV5 = QueueEngineV5;
export const auditQueue = runQueueSelfTest;

// Missions (V5.3+)
export { MissionEngineV5 } from "./missions/missionEngineV5";
export { runMissionSelfTest } from "./missions/missionSelfTest";
export { 
    generateWeeklyMissionsAPI, 
    generateIndividualMissionAPI,
    fetchWeeklyMissions, // Added export
    listAllMissions // Added export for Admin Panel
} from "./missions/index";
export { submitMissionV4 } from "./missions/submit";

// User & Auth (Legacy/Wrappers)
export { 
    login, 
    checkAuthStatus, 
    register, 
    fetchTerms, 
    fetchProfileData, 
    updateUser,
    fetchSubscriptionsPageData,
    requestSubscriptionUpgrade,
    markSubscriptionAsAwaitingProof,
    submitSubscriptionProof,
    cancelSubscription,
    markPlanUpgradeAsSeen,
    cancelSubscriptionRequest,
    markRaffleWinAsSeen,
    markAdminNotificationAsSeen,
    dailyCheckIn,
    markAchievementAsSeen // Added export
} from "./users"; 

// Store
export { 
    fetchStoreData, 
    fetchInventoryData, 
    redeemItem, 
    buyCoinPack, 
    buyCustomCoinPack, 
    useUsableItem, 
    queueForArtistOfTheDay, 
    buyRaffleTickets,
    // ✅ Raffles (User) — Supabase driven
    // (mantém compat com src/components/Raffles.tsx)
    openPaymentLink,
    cancelCoinPurchaseRequest,
    submitCoinPurchaseProof,
    submitVisualRewardForm,
    initiatePayment, // Added export
    getMyRequests,
    getQueuePosition
} from "./store";

// ✅ Raffles data fetch (sem Events)
export { fetchRafflesData } from "./raffles/fetchRafflesData";

// Events removidos do produto (UI + Admin + API)

// Games
export { 
    buyJackpotTicket, 
    buyJackpotTicketsBulk, // Added export
    openCyberCrate, 
    fetchJackpotState 
} from "./games";

export const fetchLatestMonthlyWinnersHistory = async () => {
    if (config.backendProvider !== 'supabase') return { cycle: null, winners: [] as any[] };
    const res = await fetchLatestMonthlyWinnersSupabase();
    return res || { cycle: null, winners: [] as any[] };
};

export const fetchHallOfFame = async (limit = 50, offset = 0) => {
    if (config.backendProvider === 'supabase') {
        const response = await fetchHallOfFameSupabase(limit, offset);
        return response.entries;
    }
    return [];
};

// Admin Actions (Delegating to Consolidated Engine)
export const fetchAdminData = AdminEngine.getDashboardData; 

export {
    fetchUserHistory,
    getMissionSnapshot,
    getUserSnapshot,
    punishUser,
    unbanUser,
    saveMission,
    deleteMission,
    setFeaturedMission,
    saveStoreItem,
    deleteStoreItem,
    toggleStoreItemStock,
    saveUsableItem,
    deleteUsableItem,
    toggleUsableItemStock,
    saveCoinPack,
    toggleCoinPackStock,
    reviewSubmission,
    editSubmissionStatus,
    approveAllPendingSubmissions,
    resetMonthlyRanking,
    manualRefund,
    completeVisualReward,
    setEstimatedCompletionDate,
    processQueueItem,
    batchProcessQueueItems,
    processArtistOfTheDayQueueItem,
    saveRaffle,
    deleteRaffle,
    drawRaffleWinner,
    approveSubscriptionRequest,
    rejectSubscriptionRequest,
    saveSubscriptionPlan,
    saveAdvertisement,
    deleteAdvertisement,
    updateTerms,
    adminSubmitPaymentLink,
    reviewCoinPurchase,
    sendAdminNotification,
    getMissionAuditData,
    getEconomyAuditData,
    getUserAuditData,
    adminUpdateUser,
    convertQueueItemToMission,
    saveMissionsBatch,
    createMissionFromQueue,
    adminDrawJackpot,
    adminInjectJackpot,
    adminEditJackpot,
    fetchJackpotAnalytics,
    adminScheduleJackpot // Added
} from "./admin";

// Admin Store Editor (Restored & Normalized)
export {
    getStoreData as getAdminStoreData,
    getItems,
    createItem,
    updateItem,
    updateStoreItem,
    deleteItem
} from "./admin/store";

// Diagnostics (Restored & New)
export { runStoreDiagnostic } from "./diagnostics/restorationCheck";
import { runFullNormalizationDiagnostic } from "./diagnostics/fullNormalization";
export { runFullNormalizationDiagnostic };

// Economy V4.3
export { 
    getLedgerAPI, 
    registerEconomyEvent 
} from "./economy/ledger";
export { 
    getGlobalEconomyStatsAPI, 
    getDailyStatsAPI 
} from "./economy/stats";
export { 
    getPlanDetailsAPI 
} from "./economy/plans";
export { 
    getEconomyAlertsAPI 
} from "./economy/sentinel";

// Subscriptions (RPC)
export {
    getMyPlanBenefits,
    getAllPlanOffers,
    getMyMissionQuota,
    createPagbankCheckout,
    verifyPagbankCheckout
} from "./subscriptions/index";

// Utilities & Diagnostics
export { runEconomySanityCheck } from './diagnostics/economyCheck';
export { runAuthSanityCheck } from './diagnostics/authCheck';
export { applyUserHeals } from './economy/economyAutoHeal';

// Stabilization (V7.0)
import { StabilizationEngine } from '../core/stabilization/stabilizationEngine';
import { PreStressTestV1 } from '../core/stress/preStressTestV1';
import { HealthCheck } from '../core/health/healthCheck';
// Stress Engine (V4.0 - Internal)
import { StressEngine } from "../services/stress.engine";
// Diagnostic Core (V9.0)
import { DiagnosticCore } from "../services/diagnostic.core";

export { StabilizationEngine, PreStressTestV1, HealthCheck, DiagnosticCore };

// Telemetry & Audit
export {
  logAuditEvent,
  getAuditLogs
} from "./audit/log";

export { addTelemetryEvent } from "./telemetry/events/add";
export {
  listTelemetryEvents,
  listTelemetryEventsByType
} from "./telemetry/events/list";

export {
  listAnomalies,
  addAnomaly
} from "./telemetry/anomalies/list";

export {
  runAnomalyDetector
} from "./telemetry/anomaly-detector";

export {
  listInsights
} from "./telemetry/insights/list";

export {
  getArtistOfDay,
  recordArtistOfDayClick,
  adminSetArtistOfDay,
  upsertMySocialLinks,
  adminClearArtistOfDay,
  adminGetArtistOfDayMetrics,
  getArtistOfDayMetrics,
  adminListArtistOfDaySchedule,
  adminScheduleArtistOfDay,
  adminUnscheduleArtistOfDay,
  adminClearArtistOfDayScheduleDay,
  adminApplyArtistOfDayToday,
} from "./supabase/artistOfDay";

// Export global diagnostic runner
export const runDiagnosticReport = DiagnosticCore.runReport;

if (typeof window !== "undefined") {
    (window as any).AW = { 
        ...((window as any).AW || {}), 
        runAuthCheck: runAuthSelfTest,
        healthCheck: HealthCheck.runFullScan,
        stressTest: PreStressTestV1.run,
        stabilize: StabilizationEngine.runStartupChecks,
        diagnoseFull: runFullNormalizationDiagnostic,
        diagnosticReport: runDiagnosticReport // New V9.0
    };

    // Internal Stress Helpers
    (window as any).__AW_STRESS__ = {
        burnUser: (user: any) => StressEngine.fullSystemBurn(user),
        spamMissions: (user: any) => StressEngine.runMissionSpam(user),
        spamEconomy: (user: any) => StressEngine.runEconomySpam(user),
        spamQueue: (userId: string) => StressEngine.runQueueSpam(userId),
        getLogs: () => StressEngine.getLogs()
    };
}
