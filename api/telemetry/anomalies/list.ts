
import { getRepository } from "../../database/repository.factory";

const repo = getRepository();

export function listAnomalies(limit = 50) {
  return repo.select("anomalies").slice(0, limit);
}

export function addAnomaly(anomaly: any) {
    const newAnomaly = {
        id: `anm-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        ...anomaly
    };
    repo.insert("anomalies", newAnomaly);
    return newAnomaly;
}
