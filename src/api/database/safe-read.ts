import { normalizePlan } from "../subscriptions/normalizePlan";
import type { User } from "../../types";

export function safeReadUser(u: any): any {
  if (!u) return null;

  // Normalize plan on read
  if (u.plan) {
      u.plan = normalizePlan(u.plan);
  }
  
  return u;
}
