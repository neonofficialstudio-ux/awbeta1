
import { getRepository } from "../database/repository.factory";
import { TelemetryPRO } from "../../services/telemetry.pro";

export function auditSnapshot() {
  const repo = getRepository();
  
  // Calculate snapshots with safety checks
  const data = {
    users_count: repo.select("users")?.length || 0,
    missions_count: repo.select("missions")?.length || 0,
    queue_depth: repo.select("queue")?.length || 0,
    economy_ledger_size: repo.select("economy")?.length || 0,
    timestamp: new Date().toISOString()
  };
  
  TelemetryPRO.metric("audit_snapshot", data.users_count);
  
  return {
      status: "success",
      data
  };
}
