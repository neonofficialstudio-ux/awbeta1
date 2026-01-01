
import { getRepository } from "../../database/repository.factory";

const repo = getRepository();

export function listTelemetryEvents(limit = 200) {
  return repo.select("telemetry").slice(0, limit);
}

export function listTelemetryEventsByType(type: string, limit = 100) {
  return repo.select("telemetry")
    .filter((e: any) => e.type === type)
    .slice(0, limit);
}
