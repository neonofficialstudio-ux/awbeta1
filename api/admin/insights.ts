
import { InsightEngine } from "../../services/insight.engine";

export function adminInsightsAPI() {
  return InsightEngine.generate();
}
