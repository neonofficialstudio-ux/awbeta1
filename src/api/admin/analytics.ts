
import { StatisticsEngine } from "../../services/statistics.engine";

export function adminAnalyticsAPI() {
  return StatisticsEngine.global();
}
