
// api/telemetry/economyTelemetry.ts
import { getRepository } from "../database/repository.factory";
import { DiagnosticCore } from "../../services/diagnostic.core";

const repo = getRepository();

type EconomyEvent = {
  timestamp: number;
  userId: string;
  action: string;
  amount: number;
  payload?: any;
};

export function logEconomyEvent(event: EconomyEvent) {
  // Use Diagnostic Core to record 'economy' type logs
  DiagnosticCore.record('economy', { action: event.action, amount: event.amount, ...event.payload }, event.userId);
}

export function getEconomyLog() {
    return repo.select("telemetry")
    .filter((e: any) => e.category === 'economy' || e.type.includes('coin') || e.type.includes('xp'))
    .map((e: any) => ({
        timestamp: e.timestamp,
        userId: e.details?.userId || e.userId,
        action: e.type,
        amount: e.details?.amount || 0,
        payload: e.details
    }));
}

export function getUserEconomyStats(userId: string) {
  const events = getEconomyLog().filter((e: any) => e.userId === userId);

  return {
    xpGained: events.filter((e: any) => e.action === "xp_gain").reduce((t: any, e: any) => t + e.amount, 0),
    coinsGained: events.filter((e: any) => e.action === "coin_gain").reduce((t: any, e: any) => t + e.amount, 0),
    coinsSpent: events.filter((e: any) => e.action === "coin_spend").reduce((t: any, e: any) => t + e.amount, 0),
    levelUps: events.filter((e: any) => e.action === "level_up").length,
    checkIns: events.filter((e: any) => e.action === "daily_check_in").length,
    purchases: events.filter((e: any) => e.action === "store_purchase").length
  };
}

export function getEconomyOverview() {
    const log = getEconomyLog();
  return {
    totalXpGained: log.filter((e: any) => e.action === "xp_gain").reduce((t: any, e: any) => t + e.amount, 0),
    totalCoinsGained: log.filter((e: any) => e.action === "coin_gain").reduce((t: any, e: any) => t + e.amount, 0),
    totalCoinsSpent: log.filter((e: any) => e.action === "coin_spend").reduce((t: any, e: any) => t + e.amount, 0),
    totalPurchases: log.filter((e: any) => e.action === "store_purchase").length,
    totalLevelUps: log.filter((e: any) => e.action === "level_up").length,
  };
}
