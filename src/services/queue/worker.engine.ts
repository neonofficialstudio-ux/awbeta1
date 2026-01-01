
import { QueueEngine } from "./queue.engine";
import { createNotification } from "../../api/helpers";
import { getRepository } from "../../api/database/repository.factory";
import { safeUserId } from "../../api/utils/safeUser";

const repo = getRepository();
let workerInterval: any = null;

export const QueueWorkerEngine = {
    runCycle: () => {
        // 1. Pick up new item if capacity allows
        QueueEngine.processNext();

        // 2. Advance progress of all "processing" items
        const processing = QueueEngine.getGlobalQueue('processing');
        
        processing.forEach(item => {
            const uid = safeUserId(item.userId);
            if (!uid) {
                console.warn("[QueueWorker] Invalid userId for item, removing:", item.id);
                QueueEngine.markAsDone(item.id); // Or delete
                return;
            }

            const currentProgress = item.progress || 0;
            
            // Simulate work: +10% to +20% per cycle
            const increment = Math.floor(Math.random() * 10) + 10; 
            const newProgress = Math.min(100, currentProgress + increment);
            
            if (newProgress >= 100) {
                QueueEngine.markAsDone(item.id);
                
                // Notify User (using direct repo access to avoid circular deps if necessary)
                const user = repo.select("users").find((u: any) => u.id === uid);
                if (user) {
                   // Normally we'd use NotificationDispatcher here, but in this specific file context
                   // we rely on QueueEngine completing the task which handles economy logs,
                   // but notifications might need a helper if not centralized.
                   // For V7.1 stability, we just ensure no crash.
                }
            } else {
                QueueEngine.updateProgress(item.id, newProgress);
            }
        });
        
        return { processed: processing.length };
    },

    startAutoWorker: () => {
        if (workerInterval) return;
        console.log("[QueueWorker] Started V4.2 Auto-Process (Sanitized)");
        workerInterval = setInterval(() => {
            QueueWorkerEngine.runCycle();
        }, 10000); // Run every 10 seconds
    },

    stopAutoWorker: () => {
        if (workerInterval) {
            clearInterval(workerInterval);
            workerInterval = null;
            console.log("[QueueWorker] Stopped");
        }
    }
};
