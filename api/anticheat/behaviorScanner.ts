
// Behavior Pattern Scanner
import { DiagnosticCore } from "../../services/diagnostic.core";
import { getRepository } from "../database/repository.factory";

const repo = getRepository();

// JACKPOT SECURITY FIX - SAFE REWARD MODE V1.0
// Whitelist trusted system sources to prevent auto-freeze on legitimate large prizes
const TRUSTED_SOURCES = [
  "Admin", 
  "System", 
  "Event", 
  "Prêmio", 
  "Bulk", 
  "Automated", 
  "Stress", 
  "Test",
  "Jackpot", // Critical for Jackpot Payouts
  "jackpot_engine",
  "jackpot_reward",
  "Sorteio", // Added for Raffles
  "Raffle"
];

export function analyzeBehavior(userId: string, deltas: { coins: number; xp: number; }, source: string = "") {
  // TRUSTED SOURCE BYPASS V1.1
  if (source && TRUSTED_SOURCES.some(prefix => source.includes(prefix))) {
      return "normal";
  }

  // Fetch user to check for admin role
  const user = repo.select("users").find((u:any) => u.id === userId);
  
  // ADMIN WHITELIST PATCH V1.0
  if (user && (user.role === "admin" || user.role === "superadmin")) {
      return "normal";
  }

  if (deltas.coins > 5000 || deltas.xp > 8000) {
    DiagnosticCore.record("security", {
      action: "behavior_risk_high",
      userId,
      reason: "Ganho anormal detectado",
      deltas,
      source
    }, userId);
    return "high";
  }

  if (deltas.coins > 1000 || deltas.xp > 2000) {
    DiagnosticCore.record("security", {
      action: "behavior_risk_medium",
      userId,
      reason: "Ganho acelerado acima do normal",
      deltas,
      source
    }, userId);
    return "medium";
  }

  return "normal";
}
