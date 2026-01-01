
import { TelemetryDeep } from "../../services/telemetry.deep";

export function telemetryAnalytics() {
  const snapshot = TelemetryDeep.getSnapshot();
  const events = snapshot.events || [];
  const metrics = snapshot.metrics || [];
  const anomalies = snapshot.anomalies || [];

  const eventCount = events.length;
  const metricsCount = metrics.length;
  const anomalyCount = anomalies.length;

  const topEvents: Record<string, number> = {};
  
  if (Array.isArray(events)) {
      events.forEach(e => {
        if (e && typeof e.event === 'string') {
            if (!topEvents[e.event]) topEvents[e.event] = 0;
            topEvents[e.event]++;
        }
      });
  }

  // Sort top events
  const sortedEvents = Object.entries(topEvents)
    .sort(([,a], [,b]) => b - a)
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

  return {
    totals: {
      events: eventCount,
      metrics: metricsCount,
      anomalies: anomalyCount,
    },
    topEvents: sortedEvents,
  };
}
