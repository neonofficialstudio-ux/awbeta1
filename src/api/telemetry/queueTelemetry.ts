
import { getRepository } from "../database/repository.factory";
import { DiagnosticCore } from "../../services/diagnostic.core";

const repo = getRepository();

type QueueEvent = {
  timestamp: number;
  userId: string;
  queueType: "visual" | "usable" | "spotlight";
  action: string;
  payload?: any;
};

export function logQueueEvent(event: QueueEvent) {
  DiagnosticCore.record('queue', { action: event.action, queueType: event.queueType, ...event.payload }, event.userId);
}

export function getQueueLog() {
    return repo.select("telemetry")
    .filter((e: any) => e.category === 'queue' || e.type.startsWith('queue_'))
    .map((e: any) => ({
        timestamp: e.timestamp,
        userId: e.details?.userId || e.userId,
        queueType: e.details?.queueType,
        action: e.type,
        payload: e.details
    }));
}

export function getQueueStats() {
  const log = getQueueLog();
  return {
    totalVisual: log.filter((e: any) => e.queueType === "visual").length,
    totalUsable: log.filter((e: any) => e.queueType === "usable").length,
    totalSpotlight: log.filter((e: any) => e.queueType === "spotlight").length,
    completed: log.filter((e: any) => e.action === "queue_complete").length,
    rejected: log.filter((e: any) => e.action === "queue_rejected").length,
    started: log.filter((e: any) => e.action === "queue_started").length
  };
}

export function getUserQueueStats(userId: string) {
  const events = getQueueLog().filter((e: any) => e.userId === userId);

  return {
    itemsCreated: events.filter((e: any) => e.action === "queue_add").length,
    itemsCompleted: events.filter((e: any) => e.action === "queue_complete").length,
    itemsRejected: events.filter((e: any) => e.action === "queue_rejected").length,
    delays: events.filter((e: any) => e.action === "queue_delayed").length
  };
}

export function getAverageCompletionTime() {
  const completes = getQueueLog().filter((e: any) => e.action === "queue_complete" && e.payload?.createdAt);
  if (completes.length === 0) return 0;

  const sum = completes.reduce(
    (t: any, e: any) => {
        const created = new Date(e.payload.createdAt).getTime();
        if (isNaN(created)) return t;
        return t + (e.timestamp - created);
    },
    0
  );

  return Math.round(sum / completes.length);
}
