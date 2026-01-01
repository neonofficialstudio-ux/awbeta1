
import { TelemetryDeep } from "../../services/telemetry.deep";

export function generateHeatmap() {
  const events = TelemetryDeep.getSnapshot().events;

  const heatmap: Record<number, number> = {};

  // Initialize 24h buckets
  for(let i=0; i<24; i++) {
      heatmap[i] = 0;
  }

  events.forEach(e => {
    const hour = new Date(e.t).getHours();
    heatmap[hour]++;
  });

  return heatmap;
}
