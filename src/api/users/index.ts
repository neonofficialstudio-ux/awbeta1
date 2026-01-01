import { getRepository } from "../database/repository.factory";
import { rateLimit } from "../security/rate-limit";
import { TelemetryPRO } from "../../services/telemetry.pro";

const repo = getRepository();

export async function createUser(data: any) {
  if (!rateLimit("createUser", 30)) throw new Error("Rate Limited");
  repo.insert("users", data);
  TelemetryPRO.event("user_created", data);
  return data;
}

export async function getUser(id: string) {
  const list = repo.select("users");
  return list.find((u: any) => u.id === id) || null;
}

export async function updateUser(id: string, updateFn: (user: any) => any) {
  repo.update("users", (u: any) => u.id === id, updateFn);
  TelemetryPRO.event("user_updated", { id });
}