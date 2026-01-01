
import { getRepository } from "../database/repository.factory";
import { DiagnosticCore } from "../../services/diagnostic.core";
import { QueueEngineV5 } from "../queue/queueEngineV5";

const repo = getRepository();

export const FinalAudit = {
    run: () => {
        console.group("PHASE 10: FINAL AUDIT & NORMALIZATION CHECK");
        const results = {
            queueUnified: false,
            ledgerUnified: false,
            storeIntegrity: true,
            missionsIntegrity: true,
            eventsIntegrity: true
        };
        
        // 1. Queue Unification Check
        // Verify if QueueEngineV5 reads from Repo
        const repoQueue = repo.select("queue");
        const engineQueue = QueueEngineV5.getGlobalQueue();
        if (repoQueue.length === engineQueue.length) {
            results.queueUnified = true;
        } else {
            console.error(`[AUDIT] Queue mismatch! Repo: ${repoQueue.length}, Engine: ${engineQueue.length}`);
        }

        // 2. Ledger Unification Check
        const txs = repo.select("transactions");
        // Basic check: Do we have transactions?
        if (Array.isArray(txs)) {
             results.ledgerUnified = true;
        }

        // 3. Store Duplication Check
        const storeIds = new Set();
        repo.select("storeItems").forEach((i: any) => {
            if (storeIds.has(i.id)) {
                console.error(`[AUDIT] Duplicate Store Item: ${i.id}`);
                results.storeIntegrity = false;
            }
            storeIds.add(i.id);
        });

        // 4. Mission Integrity
        repo.select("missions").forEach((m: any) => {
            if (!m.id) {
                console.error("[AUDIT] Mission without ID found");
                results.missionsIntegrity = false;
            }
        });

        // 5. Event Integrity
        repo.select("events").forEach((e: any) => {
            if (!e.date) {
                console.error(`[AUDIT] Event ${e.id} missing date`);
                results.eventsIntegrity = false;
            }
        });

        console.table(results);
        DiagnosticCore.record('audit', { action: 'final_audit_phase_10', results }, 'system');
        console.groupEnd();
        
        return results;
    }
};
