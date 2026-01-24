
import { getRepository } from "../../api/database/repository.factory";
import { LogEngineV4 } from "../../api/admin/logEngineV4";
import { XPSyncEngine } from "../../api/economy/xpSyncEngine";
import { QueueEngineV5 } from "../../api/queue/queueEngineV5";
import { applyUserHeals } from "../../api/economy/economyAutoHeal";
import { isSupabaseProd } from "../../api/core/productionGuards";

const repo = getRepository();

export const StabilizationEngine = {
    runStartupChecks: async (userId?: string) => {
        // Em Supabase, não executar engine legado (mock-local).
        // A fonte da verdade é o backend.
        if (isSupabaseProd()) {
            return { ok: true, skipped: true, reason: "supabase_prod" };
        }

        console.log("[StabilizationEngine] Running startup checks...");
        let fixedCount = 0;

        // 1. Ensure User Consistency
        if (userId) {
            const user = repo.select("users").find((u: any) => u.id === userId);
            if (user) {
                // Auto-heal economy/stats
                const healedUser = applyUserHeals(user);
                if (JSON.stringify(healedUser) !== JSON.stringify(user)) {
                    repo.update("users", (u: any) => u.id === userId, (u: any) => healedUser);
                    fixedCount++;
                    LogEngineV4.log({ action: 'stabilization_user_healed', category: 'system', payload: { userId } });
                }

                // Sync XP/Level
                const syncedUser = XPSyncEngine.syncUser(userId);
                if (syncedUser !== user) { // Assuming syncUser returns new ref if changed
                    fixedCount++;
                }

                // Check Mission Limits Logic
                StabilizationEngine.ensureMissionStatusIntegrity(userId);
            }
        } else {
            // If no specific user, verify global integrity if needed
            // (Usually on auth we care about the active user)
        }

        // 2. Ensure Queue Consistency
        StabilizationEngine.ensureQueueConsistency();

        // 3. Ensure Economy Ledger
        StabilizationEngine.ensureEconomyConsistency();

        console.log(`[StabilizationEngine] Checks complete. ${fixedCount} issues fixed.`);
        return { fixedCount };
    },

    ensureUserConsistency: (userId: string) => {
        // Wraps specific user checks
        return XPSyncEngine.syncUser(userId);
    },

    ensureEconomyConsistency: () => {
        if (isSupabaseProd()) {
            return;
        }

        // Check for orphaned transactions or negative balances globally
        const users = repo.select("users");
        users.forEach((u: any) => {
            if (u.coins < 0) {
                repo.update("users", (user: any) => user.id === u.id, (user: any) => ({ ...user, coins: 0 }));
                LogEngineV4.log({ action: 'stabilization_negative_coins_fix', category: 'economy', payload: { userId: u.id, oldBalance: u.coins } });
            }
        });
    },

    ensureQueueConsistency: () => {
        if (isSupabaseProd()) {
            return;
        }

        // Clean up queue items referencing processed redemptions that might be stuck
        const queue = QueueEngineV5.getQueue('item');
        const redeemed = repo.select("redeemedItems");
        
        queue.forEach((qItem: any) => {
            const redemption = redeemed.find((r: any) => r.id === qItem.redeemedItemId);
            if (!redemption) {
                // Orphaned queue item
                // In a real app we might delete, but here we'll log warning
                 // LogEngineV4.log({ action: 'stabilization_orphan_queue_item', category: 'queue', payload: { queueId: qItem.id } });
            }
        });
        
        // No active delete implemented in V5 Engine for arbitrary items without processing, 
        // so we rely on process logic to handle errors gracefully.
    },

    ensureMissionStatusIntegrity: (userId: string) => {
        if (isSupabaseProd()) {
            return;
        }

        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) return;

        // Fix mission counters if they drift
        const approvedCount = repo.select("submissions").filter((s: any) => s.userId === userId && s.status === 'approved').length;
        
        if (user.totalMissionsCompleted !== approvedCount) {
            repo.update("users", (u: any) => u.id === userId, (u: any) => ({ ...u, totalMissionsCompleted: approvedCount }));
             LogEngineV4.log({ action: 'stabilization_mission_count_sync', category: 'system', payload: { userId, old: user.totalMissionsCompleted, new: approvedCount } });
        }
    },
    
    ensureSubscriptionState: (userId: string) => {
        // Future: Validate plan vs subscription history
    }
};
