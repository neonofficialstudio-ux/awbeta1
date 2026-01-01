
import { TelemetryPRO } from "./telemetry.pro";

interface TelemetryEvent {
  event: string;
  data: any;
  t: number;
}

interface TelemetryMetric {
  name: string;
  value: number;
  t: number;
}

interface TelemetryAnomaly {
  tag: string;
  context: any;
  t: number;
}

const buffer = {
  events: [] as TelemetryEvent[],
  metrics: [] as TelemetryMetric[],
  anomalies: [] as TelemetryAnomaly[],
};

export const TelemetryDeep = {
  logEvent(event: string, data: object = {}) {
    buffer.events.push({
      event,
      data,
      t: Date.now(),
    });
    // Forward to PRO service for immediate logging
    TelemetryPRO.event(event, data);
  },

  logMetric(name: string, value: number) {
    buffer.metrics.push({
      name,
      value,
      t: Date.now(),
    });
    TelemetryPRO.metric(name, value);
  },

  logAnomaly(tag: string, context: object = {}) {
    buffer.anomalies.push({
      tag,
      context,
      t: Date.now(),
    });
    TelemetryPRO.anomaly(tag, context);
  },

  getSnapshot() {
    return {
      events: [...buffer.events],
      metrics: [...buffer.metrics],
      anomalies: [...buffer.anomalies],
    };
  },

  clear() {
    buffer.events = [];
    buffer.metrics = [];
    buffer.anomalies = [];
  }
};
