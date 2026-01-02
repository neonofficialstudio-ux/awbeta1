
// api/economy/index.ts (Unified)
import { CurrencySyncEngine } from "../../services/economy/sync.engine";
import { LedgerEngine } from "../../services/economy/ledger.engine";
import { CheckinEngineV4 } from "./checkin";
import { SubscriptionMultiplierEngine } from "../../services/economy/subscriptionMultiplier.engine";
import { EconomyEngineV6 } from "./economyEngineV6";

// Core Engine Export
export const EconomyEngine = EconomyEngineV6;

// Core API Exports
export const applyXPGain = CurrencySyncEngine.applyXPGain;
export const applyLCGain = CurrencySyncEngine.applyLCGain;
export const applyLCSpend = CurrencySyncEngine.applyLCSpend;
export const getLedgerHistory = LedgerEngine.getLedgerHistory;
export const getMultiplier = SubscriptionMultiplierEngine.getMultiplier;
export const performCheckin = CheckinEngineV4.performCheckin;
export const canCheckin = CheckinEngineV4.canCheckin;

// V4.3 Stats & Plans Exports (Admin Panel Compatibility)
export { 
    getLedgerAPI, 
    registerEconomyEvent 
} from "./ledger";
export { 
    getGlobalEconomyStatsAPI, 
    getDailyStatsAPI 
} from "./stats";
export { 
    getPlanDetailsAPI 
} from "./plans";
export { 
    getEconomyAlertsAPI 
} from "./sentinel";

// Constants & Helpers
export * from './economy-constants';
export { calculateLevelFromXp, getDailyMissionLimit, applyPlanMultiplier, calculateDiscountedPrice } from './economy';
