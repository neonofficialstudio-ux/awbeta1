
import { FraudScanV3 } from "../../services/fraudscan.v3";

export function runFraudScan(mission: any) {
  // Redirect to V3 Engine
  return FraudScanV3.check(mission);
}
