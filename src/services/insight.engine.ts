
import { TelemetryDeep } from "./telemetry.deep";

export const InsightEngine = {
  generate() {
    const snap = TelemetryDeep.getSnapshot();

    const insights: { type: string; message: string }[] = [];

    // ✔ Detecta aumento de atividade
    if (snap.events.length > 150) {
      insights.push({
        type: "high_activity",
        message: "Atividade alta detectada no sistema.",
      });
    }

    // ✔ Detecta queda de atividade
    if (snap.events.length < 20) {
      insights.push({
        type: "low_activity",
        message: "Atividade baixa detectada. Pode ser hora de otimizar conteúdo.",
      });
    }

    // ✔ Detecta concentração de horários
    const hourly: Record<number, number> = {};
    snap.events.forEach(e => {
      const h = new Date(e.t).getHours();
      if (!hourly[h]) hourly[h] = 0;
      hourly[h]++;
    });

    const peak = Object.entries(hourly).sort((a: any, b: any) => b[1] - a[1])[0];
    if (peak) {
      insights.push({
        type: "peak_hour",
        message: `Horário de maior uso: ${peak[0]}h (${peak[1]} eventos).`,
      });
    }

    // ✔ Detecção de fraudes explícitas em massa
    if (snap.anomalies.length > 10) {
      insights.push({
        type: "fraud_risk",
        message: "Volume incomum de anomalias. Verificação necessária.",
      });
    }

    return insights;
  }
};
