
import { TelemetryDeep } from "../../services/telemetry.deep";

export function telemetryInsights() {
  const { events, anomalies } = TelemetryDeep.getSnapshot();

  const insights = [];

  // Insight 1: Peak Hour Detection
  const hours: Record<number, number> = {};
  events.forEach(e => {
    const h = new Date(e.t).getHours();
    if (!hours[h]) hours[h] = 0;
    hours[h]++;
  });

  const peakHourEntry = Object.entries(hours)
    .sort((a, b) => b[1] - a[1])[0];

  if (peakHourEntry) {
    insights.push({
      type: "peak_hour",
      severity: "info",
      message: `Maior atividade registrada às ${peakHourEntry[0]}h com ${peakHourEntry[1]} eventos.`,
    });
  }

  // Insight 2: Anomaly Spike Detection
  if (anomalies.length > 5) {
    insights.push({
      type: "anomaly_spike",
      severity: "warning",
      message: `Volume de anomalias (${anomalies.length}) acima do limite de segurança (5).`,
    });
  }

  // Insight 3: Low Activity Warning
  if (events.length < 10 && events.length > 0) {
    insights.push({
      type: "low_activity",
      severity: "neutral",
      message: "Sistema operando com baixa atividade. Verifique se os serviços estão online.",
    });
  } else if (events.length === 0) {
    insights.push({
      type: "no_activity",
      severity: "critical",
      message: "Nenhum evento registrado no buffer atual.",
    });
  }

  return insights;
}
