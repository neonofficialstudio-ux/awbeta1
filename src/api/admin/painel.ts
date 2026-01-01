
import { AdminEngine as AdminEngineV7 } from "./AdminEngine";
import { adminAnalyticsAPI } from "./analytics";
import { adminInsightsAPI } from "./insights";
import { generateHeatmap } from "../telemetry/heatmap";
import { telemetryAnalytics } from "../telemetry/analytics";
import { listTelemetryEvents } from "../telemetry/events/list";

export function adminPainelData() {
  // Get core data from V7 Engine to ensure consistency
  const dashboardData = AdminEngineV7.getDashboardData();

  const analytics = adminAnalyticsAPI();
  const insights = adminInsightsAPI();
  const heatmap = generateHeatmap(); 
  const telemetry = telemetryAnalytics();
  const recentEvents = listTelemetryEvents(20);

  return {
    analytics,
    insights,
    heatmap,
    telemetry,
    recentEvents,
    // Expose raw dashboard data for advanced panels if needed
    ...dashboardData 
  };
}