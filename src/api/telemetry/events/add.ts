
import { getRepository } from "../../database/repository.factory";

const repo = getRepository();

export interface TelemetryEventV4 {
  id: string;
  type: string;
  category: string;
  details?: any;
  timestamp: number;
  userId?: string;
}

export function addTelemetryEvent(event: Omit<TelemetryEventV4, "id" | "timestamp">) {
  const newEvent: TelemetryEventV4 = {
    id: `tlm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: Date.now(),
    ...event
  };
  
  repo.insert("telemetry", newEvent);
  return newEvent;
}
