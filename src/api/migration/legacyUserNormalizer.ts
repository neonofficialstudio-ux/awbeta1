
import { getRepository } from "../database/repository.factory";
import { normalizePlan } from "../subscriptions/normalizePlan";
import { SanityGuard } from "../../services/sanity.guard";
import { DataConsistency } from "../../services/data.consistency";
import type { User, SubscriptionRequest } from "../../types";
import { LogEngineV4 } from "../admin/logEngineV4";

const repo = getRepository();

export const LegacyUserNormalizer = {
    run: () => {
        console.group("Legacy User Normalizer V1.1");
        const users = repo.select("users") as User[];
        const events = repo.select("events");
        const subRequests = repo.select("subscriptionRequests");
        
        let usersUpdated = 0;
        let eventsUpdated = 0;
        let requestsUpdated = 0;

        // 1. DEEP SCAN: USERS & SUBSCRIPTION HISTORY
        users.forEach(user => {
            // Snapshot for comparison
            const originalJson = JSON.stringify(user);
            let currentUser = { ...user };

            // A. Normalize Active Plan
            const normPlan = normalizePlan(currentUser.plan);
            if (currentUser.plan !== normPlan) {
                currentUser.plan = normPlan;
            }

            // B. Normalize Subscription History
            if (currentUser.subscriptionHistory && Array.isArray(currentUser.subscriptionHistory)) {
                currentUser.subscriptionHistory = currentUser.subscriptionHistory.map(entry => {
                    let oldPlan = entry.oldPlan;
                    let newPlan = entry.newPlan;

                    if (typeof oldPlan === 'string') oldPlan = normalizePlan(oldPlan);
                    if (typeof newPlan === 'string') newPlan = normalizePlan(newPlan);

                    return { ...entry, oldPlan, newPlan };
                });
            }

            // C. Run Sanity Guard (Structure & Types)
            currentUser = SanityGuard.user(currentUser);

            // D. Run Consistency Check (Economy Math)
            // NOTE: We skip logging repairs here to avoid spamming console, just apply fixes
            const consistency = DataConsistency.checkUserEconomy(currentUser);
            currentUser = consistency.user;

            // E. Save if changed
            if (JSON.stringify(currentUser) !== originalJson) {
                repo.update("users", (u: any) => u.id === currentUser.id, (u: any) => currentUser);
                usersUpdated++;
            }
        });

        // 2. DEEP SCAN: EVENTS (Allowed Plans)
        events.forEach((event: any) => {
            if (event.allowedPlans && Array.isArray(event.allowedPlans)) {
                const originalPlans = JSON.stringify(event.allowedPlans);
                
                const normalizedAllowed = event.allowedPlans.map((p: string) => normalizePlan(p));
                
                if (JSON.stringify(normalizedAllowed) !== originalPlans) {
                    const updatedEvent = { ...event, allowedPlans: normalizedAllowed };
                    repo.update("events", (e: any) => e.id === event.id, (e: any) => updatedEvent);
                    eventsUpdated++;
                }
            }
        });

        // 3. DEEP SCAN: SUBSCRIPTION REQUESTS
        subRequests.forEach((req: SubscriptionRequest) => {
            const currentNorm = normalizePlan(req.currentPlan);
            const reqNorm = normalizePlan(req.requestedPlan);

            if (req.currentPlan !== currentNorm || req.requestedPlan !== reqNorm) {
                const updatedReq = { ...req, currentPlan: currentNorm, requestedPlan: reqNorm };
                repo.update("subscriptionRequests", (r: any) => r.id === req.id, (r: any) => updatedReq);
                requestsUpdated++;
            }
        });

        if (usersUpdated > 0 || eventsUpdated > 0 || requestsUpdated > 0) {
            console.log(`[Normalizer V1.1] Scan Complete. Updates: Users (${usersUpdated}), Events (${eventsUpdated}), Requests (${requestsUpdated}).`);
            
            // Log system event
            LogEngineV4.log({
                action: 'system_normalization_v1.1',
                category: 'system',
                payload: { usersUpdated, eventsUpdated, requestsUpdated }
            });
        } else {
            console.log(`[Normalizer V1.1] System Integrity Verified. No legacy plans found.`);
        }

        console.groupEnd();
        return { usersUpdated, eventsUpdated, requestsUpdated };
    }
};
