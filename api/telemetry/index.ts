
import { TelemetryPRO } from "../../services/telemetry.pro";

export function logEvent(event: string, data: object = {}) {
  // Redirect to V10 Engine
  TelemetryPRO.event(event, data);
  return { ok: true };
}
