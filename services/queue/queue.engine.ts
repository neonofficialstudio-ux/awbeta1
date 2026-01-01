
import { getRepository } from "../../api/database/repository.factory";
import type { QueueItem, QueueStatus } from "../../types/queue";
import { safeUserId } from "../../api/utils/safeUser";
import { TelemetryPRO } from "../telemetry.pro";

const repo = getRepository();

const PLAN_PRIORITIES: Record<string, number> = {
    'Hitmaker': 3,
    'Artista Profissional': 2,
    'Artista em Ascensão': 1.5,
    'Free Flow': 1
};

export const QueueEngine = {
    /**
     * Adds an item to the production queue via Repository.
     */
    addToQueue: (userId: string, itemData: { id: string, name: string, rarity?: string }, metadata?: any) => {
        const uid = safeUserId(userId);
        if (!uid) throw new Error("Invalid User ID");

        const user = repo.select("users").find((u: any) => u.id === uid);
        if (!user) throw new Error("User not found");

        const priority = PLAN_PRIORITIES[user.plan] || 1;
        
        const newItem: QueueItem = {
            id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            userId: uid,
            itemId: itemData.id, // Redeemed Item ID reference
            itemName: itemData.name,
            rarity: itemData.rarity,
            status: 'pending',
            priority,
            createdAt: new Date().toISOString(),
            userName: user.name,
            userAvatar: user.avatarUrl,
            metadata: metadata || {}
        };

        repo.insert("queue", newItem);
        TelemetryPRO.event("queue_add", { userId, itemId: newItem.id, priority });
        
        return newItem;
    },

    /**
     * Returns the active queue for a specific user from Repository.
     */
    getUserQueue: (userId: string) => {
        const uid = safeUserId(userId);
        if (!uid) return [];
        const all = repo.select("queue");
        return all.filter((i: any) => i.userId === uid).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    /**
     * Returns the global queue sorted by Priority (Desc) then Date (Asc) from Repository.
     */
    getGlobalQueue: (statusFilter?: QueueStatus) => {
        let all = repo.select("queue");
        
        if (statusFilter) {
            all = all.filter((i: any) => i.status === statusFilter);
        } else {
            // Default: Show pending and processing
            all = all.filter((i: any) => i.status !== 'done');
        }
        
        return all.sort((a: any, b: any) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
    },

    /**
     * Processes the next item in the queue via Repository Update.
     */
    processNext: () => {
        const pending = QueueEngine.getGlobalQueue('pending');
        if (pending.length === 0) return null;

        const nextItem = pending[0];
        
        // Mark as Processing in Repo
        repo.update("queue", (q: any) => q.id === nextItem.id, (q: any) => ({ ...q, status: 'processing', progress: 0 }));
        
        TelemetryPRO.event("queue_process_start", { itemId: nextItem.id });
        
        return nextItem;
    },

    /**
     * Marks an item as completed in Repository.
     */
    markAsDone: (queueId: string) => {
        repo.update("queue", (q: any) => q.id === queueId, (q: any) => ({ 
            ...q, 
            status: 'done', 
            completedAt: new Date().toISOString(), 
            progress: 100 
        }));
        TelemetryPRO.event("queue_complete", { itemId: queueId });
    },
    
    /**
     * Updates progress of an item in Repository.
     */
    updateProgress: (queueId: string, progress: number) => {
        repo.update("queue", (q: any) => q.id === queueId, (q: any) => ({ ...q, progress }));
    },

    syncQueueState: () => {
        return repo.select("queue");
    }
};
