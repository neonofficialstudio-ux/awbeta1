
import { TelemetryPRO } from "../../services/telemetry.pro";

export const QueueWorkers = {
  async missionWorker(task: any) {
    TelemetryPRO.event("queue_mission_processed", { task });
    return { ok: true };
  },

  async defaultWorker(task: any) {
    TelemetryPRO.event("queue_generic_processed", { task });
    return { ok: true };
  },

  resolveWorker(type: string) {
    const table: Record<string, Function> = {
      mission: QueueWorkers.missionWorker,
    };
    return table[type] || QueueWorkers.defaultWorker;
  }
};
