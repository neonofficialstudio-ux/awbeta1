
import { getRepository } from "../database/repository.factory";
import { normalizeUserBasic } from "../core/normalizeUser";
import { normalizeUpgradeRequest } from "../subscriptions/normalizer";
import { SanityGuard } from "../../services/sanity.guard";
import type { SubscriptionEvent } from "../../types";

const repo = getRepository();

export async function syncAppState() {
  const users = repo.select("users");
  const upgradeRequests = repo.select("subscriptionRequests");

  const normalizedUsers = users.map((u: any) => SanityGuard.user(u));
  const normalizedRequests = upgradeRequests.map((r: any) => normalizeUpgradeRequest(r));
  
  // Flatten events from user history
  const events: SubscriptionEvent[] = normalizedUsers.flatMap((u: any) => u.subscriptionHistory || []);

  if (typeof window !== 'undefined' && (window as any).__APP_DISPATCH__) {
    (window as any).__APP_DISPATCH__({
      type: "SUBSCRIPTIONS_SYNC",
      payload: {
        users: normalizedUsers,
        upgradeRequests: normalizedRequests,
        events: events
      }
    });
  }
}
