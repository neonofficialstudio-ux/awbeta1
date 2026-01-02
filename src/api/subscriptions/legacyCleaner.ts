import { normalizePlan } from "./normalizePlan";
import type { User } from "../../types";

export function cleanLegacyPlanInUser(user: User): User {
  if (!user) return user;
  const normalized = normalizePlan(user.plan) as User['plan'];
  if (user.plan !== normalized) {
    return { ...user, plan: normalized };
  }
  return user;
}
