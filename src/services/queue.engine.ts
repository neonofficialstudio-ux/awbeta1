
import { getRepository } from "../api/database/repository.factory";
import { QueueValidators } from "../api/queue/validators";
import { QueueWorkers } from "../api/queue/workers";
import { TelemetryPRO } from "./telemetry.pro";

const repo = getRepository();

export const QueueEngine = {
  add(item: any) {
    // Auto-fix for legacy items missing type
    const itemToValidate = { ...item };
    if (!itemToValidate.type) itemToValidate.type = 'generic';

    if (!QueueValidators.validate(itemToValidate)) {
      TelemetryPRO.anomaly("queue_invalid_item", itemToValidate);
      throw new Error("Invalid queue item");
    }

    const queued = {
      ...itemToValidate,
      priority: QueueValidators.validatePriority(itemToValidate.priority)
        ? itemToValidate.priority
        : "normal",
      status: "waiting",
      createdAt: Date.now(),
    };

    repo.insert("queue", queued);
    TelemetryPRO.event("queue_item_added", { id: queued.id, type: queued.type });
    return queued;
  },

  list() {
    try {
      return repo.select("queue").sort((a: any, b: any) =>
        QueueEngine.priorityWeight(b.priority) -
        QueueEngine.priorityWeight(a.priority)
      );
    } catch (e) {
      return [];
    }
  },

  priorityWeight(p: string) {
    const weights: Record<string, number> = {
      urgent: 4,
      high: 3,
      normal: 2,
      low: 1,
    };
    return weights[p] || 1;
  },

  next() {
    const all = QueueEngine.list();
    return all.length ? all[0] : null;
  },

  async processNext() {
    try {
        const nextItem = QueueEngine.next();
        if (!nextItem) return null;

        const worker = QueueWorkers.resolveWorker(nextItem.type);
        
        // Execute worker safely
        let result;
        try {
            result = await worker(nextItem);
        } catch (workerError: any) {
            console.error("[QueueEngine] Worker failed", workerError);
            result = { ok: false, error: workerError.message };
            TelemetryPRO.anomaly("queue_worker_failure", { id: nextItem.id, error: workerError.message });
        }

        // Always remove item to prevent blocking, unless retry logic is added (skipping retry for V4.3 stability)
        repo.delete("queue", (q: any) => q.id === nextItem.id);

        TelemetryPRO.event("queue_item_processed", {
          id: nextItem.id,
          success: result.ok,
        });

        return result;
    } catch (e) {
        console.error("[QueueEngine] Process failure", e);
        return null;
    }
  },

  async runCycle(limit = 10) {
    let processed = 0;
    
    // Safety cap to prevent infinite loops
    const safeLimit = Math.min(limit, 20);

    for (let i = 0; i < safeLimit; i++) {
      try {
          const result = await QueueEngine.processNext();
          if (!result) break; // No more items or error
          processed++;
      } catch (e) {
          break;
      }
    }
    
    if (processed > 0) {
        TelemetryPRO.metric("queue_cycle_processed", processed);
    }
    return { processed };
  }
};
