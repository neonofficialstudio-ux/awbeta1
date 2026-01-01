
import { WeeklyMissionSlots } from "./generator-presets";
import { getRepository } from "../database/repository.factory";
import { TelemetryPRO } from "../../services/telemetry.pro";
import { SanitizeString } from "../../core/sanitizer.core";
import { SubscriptionMultiplierEngine } from "../../services/economy/subscriptionMultiplier.engine";
import type { User } from "../../types";

const repo = getRepository();

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Helper to ensure exact date selection without timezone shifts
function normalizeLocalDate(dateInput: string) {
  return new Date(`${dateInput}T00:00:00`);
}

// Logic replacement for legacy 'calculateMission'
function calculateRewards(xp: number, coins: number, plan: User['plan']) {
  const multiplier = SubscriptionMultiplierEngine.getMultiplier(plan);
  return { 
      xp: Math.floor(xp * multiplier), 
      lc: Math.floor(coins * multiplier) 
  };
}

export function generateWeeklySchedule(startDate: string, plan: User['plan'] = "Free Flow") {
  const baseDate = normalizeLocalDate(startDate);
  const missions: any[] = [];

  WeeklyMissionSlots.forEach((slot, index) => {
    const scheduledDate = addDays(baseDate, index);
    const deadlineDate = addDays(scheduledDate, 1); 

    // Default XP/Coins for preset types
    // Mock values as presets don't have them defined in 'generator-presets.ts' usually
    // We assume standard values if not present
    const baseXP = 50;
    const baseCoins = 5;

    const mission = {
      id: `gen-weekly-${Date.now()}-${index}`,
      type: slot.type,
      duration: slot.duration,
      slot: slot.name,
      scheduledFor: scheduledDate.toISOString(),
      deadline: deadlineDate.toISOString(),
      title: `${slot.name} Mission`,
      description: `Generated mission for ${slot.name}`,
      xp: baseXP,
      coins: baseCoins,
      status: "scheduled"
    };

    const rewards = calculateRewards(mission.xp, mission.coins, plan);

    missions.push({
      ...mission,
      xp: rewards.xp,
      coins: rewards.lc,
    });
  });

  missions.forEach(m => repo.insert("missions", m));

  TelemetryPRO.event("weekly_schedule_generated", {
    count: missions.length,
    startDate,
  });

  return missions;
}

export function generateIndividualMission(config: any, plan: User['plan'] = "Free Flow") {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Direct Sanitization instead of legacy 'sanitize' function
  const mission = {
    id: `gen-ind-${Date.now()}`,
    type: SanitizeString(config.type),
    duration: SanitizeString(config.duration),
    slot: "Individual",
    scheduledFor: now.toISOString(),
    deadline: tomorrow.toISOString(),
    title: SanitizeString(config.title || "Individual Mission"),
    description: SanitizeString(config.description || "Generated individual mission"),
    xp: Number(config.xp) || 0,
    coins: Number(config.coins) || 0,
    format: config.format,
    platform: config.platform,
    status: "scheduled"
  };

  // Calculate Rewards using Modern Engine
  const rewards = calculateRewards(mission.xp, mission.coins, plan);

  const finalMission = {
    ...mission,
    xp: rewards.xp,
    coins: rewards.lc
  };

  repo.insert("missions", finalMission);

  TelemetryPRO.event("individual_mission_generated", { type: mission.type });

  return finalMission;
}
