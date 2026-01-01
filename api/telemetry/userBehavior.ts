
// api/telemetry/userBehavior.ts
import { getRepository } from "../database/repository.factory";
import { TelemetryPRO } from "../../services/telemetry.pro";

const repo = getRepository();

type BehaviorEvent = {
  timestamp: number;
  userId: string;
  action: string;
  payload?: any;
};

export function logBehaviorEvent(event: BehaviorEvent) {
  TelemetryPRO.event(event.action, { ...event.payload, userId: event.userId, category: 'security' });
}

export function getBehaviorLog() {
    return repo.select("telemetry")
    .filter((e: any) => e.category === 'security' || ['mission_spam', 'suspicious_velocity', 'repeated_links'].includes(e.type))
    .map((e: any) => ({
        timestamp: e.timestamp,
        userId: e.details?.userId,
        action: e.type,
        payload: e.details
    }));
}

export function detectMissionSpam(userId: string, count: number) {
  if (count >= 3) {
    logBehaviorEvent({
      timestamp: Date.now(),
      userId,
      action: "mission_spam",
      payload: { count }
    });
  }
}

export function detectRepeatedLinks(userId: string, links: string[]) {
  const unique = new Set(links);
  if (unique.size <= Math.floor(links.length / 2)) {
    logBehaviorEvent({
      timestamp: Date.now(),
      userId,
      action: "repeated_links",
      payload: { links }
    });
  }
}

export function detectSuspiciousVelocity(userId: string, intervalMs: number) {
  if (intervalMs < 8000) { 
    logBehaviorEvent({
      timestamp: Date.now(),
      userId,
      action: "suspicious_velocity",
      payload: { intervalMs }
    });
  }
}

export function detectExpiredAttempt(userId: string) {
  logBehaviorEvent({
    timestamp: Date.now(),
    userId,
    action: "mission_expired_attempt"
  });
}

export function detectPossibleBot(userId: string) {
  logBehaviorEvent({
    timestamp: Date.now(),
    userId,
    action: "possible_bot"
  });
}
