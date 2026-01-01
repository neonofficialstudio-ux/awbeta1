
// api/telemetry/missionTelemetry.ts
import { getRepository } from "../database/repository.factory";
import { DiagnosticCore } from "../../services/diagnostic.core";

const repo = getRepository();

type MissionEvent = {
  timestamp: number;
  missionId: string;
  userId?: string;
  action: 
    | "mission_created"
    | "mission_deleted"
    | "mission_sent"
    | "mission_approved"
    | "mission_rejected"
    | "mission_expired"
    | "mission_auto_fail"
    | "mission_completed";
  payload?: any;
};

export function logMissionEvent(event: MissionEvent) {
  DiagnosticCore.record('mission', { action: event.action, ...event.payload, missionId: event.missionId }, event.userId);
}

export function getMissionLog() {
  return repo.select("telemetry")
    .filter((e: any) => e.category === 'mission' || e.type.startsWith('mission_'))
    .map((e: any) => ({
        timestamp: e.timestamp,
        missionId: e.details?.missionId,
        userId: e.details?.userId || e.userId,
        action: e.type,
        payload: e.details
    }));
}

export function getMissionStats() {
  const log = getMissionLog();
  return {
    totalCreated: log.filter((e: any) => e.action === "mission_created").length,
    totalSent: log.filter((e: any) => e.action === "mission_sent").length,
    totalApproved: log.filter((e: any) => e.action === "mission_approved").length,
    totalRejected: log.filter((e: any) => e.action === "mission_rejected").length,
    totalExpired: log.filter((e: any) => e.action === "mission_expired").length,
    totalAutoFail: log.filter((e: any) => e.action === "mission_auto_fail").length,
    totalCompleted: log.filter((e: any) => e.action === "mission_completed").length
  };
}

export function getUserMissionStats(userId: string) {
  const entries = getMissionLog().filter((e: any) => e.userId === userId);

  return {
    sent: entries.filter((e: any) => e.action === "mission_sent").length,
    approved: entries.filter((e: any) => e.action === "mission_approved").length,
    rejected: entries.filter((e: any) => e.action === "mission_rejected").length,
    completed: entries.filter((e: any) => e.action === "mission_completed").length,
    expired: entries.filter((e: any) => e.action === "mission_expired").length,
  };
}

export function getMissionPerformance(missionId: string) {
  const entries = getMissionLog().filter((e: any) => e.missionId === missionId);

  return {
    created: entries.find((e: any) => e.action === "mission_created")?.timestamp,
    sentByUsers: entries.filter((e: any) => e.action === "mission_sent").length,
    approvals: entries.filter((e: any) => e.action === "mission_approved").length,
    rejections: entries.filter((e: any) => e.action === "mission_rejected").length,
    expires: entries.find((e: any) => e.action === "mission_expired")?.timestamp,
  };
}
