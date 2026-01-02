
import { getRepository } from "../../database/repository.factory";

const repo = getRepository();

export function listInsights() {
    // Dynamic generation based on telemetry data
    const events = repo.select("telemetry");
    const insights = [];

    const recentEvents = events.filter((e: any) => e.timestamp > Date.now() - 3600000);
    
    if (recentEvents.length > 50) {
        insights.push({ type: 'high_traffic', message: 'Tráfego intenso na última hora.', severity: 'info' });
    }
    
    const errors = recentEvents.filter((e: any) => e.category === 'error');
    if (errors.length > 5) {
        insights.push({ type: 'error_spike', message: 'Pico de erros detectado.', severity: 'warning' });
    }

    return insights;
}
