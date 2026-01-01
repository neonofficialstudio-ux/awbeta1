
import type { UsableItemQueueEntry, ArtistOfTheDayQueueEntry, User, QueueItem } from '../../types';
import { saveToStorage, loadFromStorage } from '../persist/localStorage';
import * as db from '../mockData';
import { NotificationDispatcher } from "../../services/notifications/notification.dispatcher";
import { logQueueEvent } from '../telemetry/queueTelemetry';
import { registerEconomyEvent } from '../economy/ledger';
import { SanityGuard } from '../../services/sanity.guard';
import { getRepository } from "../database/repository.factory";

const repo = getRepository();

class QueueEngineClass extends EventTarget {
    private processingInterval: any = null;
    private lock: boolean = false;

    constructor() {
        super();
        this.startLoop();
    }

    private notifyUpdate() {
        this.dispatchEvent(new Event('update'));
    }

    public addToQueue(entry: UsableItemQueueEntry | ArtistOfTheDayQueueEntry, type: 'item' | 'spotlight') {
        if (this.lock) return;
        this.lock = true;

        try {
            const queue = repo.select(type === 'item' ? 'queue' : 'spotlightQueue');
            
            if (type === 'item') {
                const itemEntry = SanityGuard.queueItem(entry);
                // Check duplicate
                const exists = queue.some((i: any) => i.userId === itemEntry.userId && i.itemId === itemEntry.itemId);
                if (exists) return;
                
                const newEntry: QueueItem = {
                    ...itemEntry,
                    progress: 0,
                    status: 'pending' // Start as pending
                };
                repo.insert("queue", newEntry);
                NotificationDispatcher.queueUpdate(itemEntry.userId, itemEntry.itemName, "Item adicionado à fila de produção.");
            } else {
                 const exists = queue.some((i: any) => i.userId === entry.userId);
                 if (exists) return;
                 repo.insert("spotlightQueue", entry);
                 NotificationDispatcher.queueUpdate(entry.userId, entry.itemName, "Você entrou na fila de destaque!");
            }
            
            const payloadId = type === 'item' 
                ? (entry as any).itemId || (entry as any).redeemedItemId 
                : (entry as any).redeemedItemId;

            logQueueEvent({ timestamp: Date.now(), userId: entry.userId, queueType: type === 'item' ? 'usable' : 'spotlight', action: 'queue_add', payload: { itemId: payloadId } });
            
            this.notifyUpdate();
        } finally {
            this.lock = false;
        }
    }

    public getQueue(type: 'item' | 'spotlight') {
        if (type === 'item') {
             const items = repo.select("queue");
             // Return as legacy compatible UsableItemQueueEntry[]
             return items.map((item: any) => ({
                ...item,
                redeemedItemId: item.itemId,
                queuedAt: item.createdAt
            })) as UsableItemQueueEntry[];
        }
        return repo.select("spotlightQueue");
    }
    
    // Advanced getter for sorting/filtering
    public getGlobalQueue(statusFilter?: string) {
        let all = repo.select("queue");
        if (statusFilter) {
            all = all.filter((i: any) => i.status === statusFilter);
        } else {
            all = all.filter((i: any) => i.status !== 'done');
        }
        
        // Sort: Highest Priority First, then Oldest First
        return all.sort((a: any, b: any) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
    }

    public processItem(queueId: string) {
        const queue = repo.select("queue");
        const item = queue.find((i: any) => i.id === queueId);
        
        if (item) {
            this.finishItem(item);
            // finishItem handles removal logic or status update via repo
            this.notifyUpdate();
        }
    }

    private finishItem(item: QueueItem) {
        NotificationDispatcher.queueUpdate(item.userId, item.itemName, "Produção concluída! Item pronto para uso.");

        const redeemedItem = repo.select("redeemedItems").find((ri: any) => ri.id === item.itemId);
        if (redeemedItem) {
            repo.update("redeemedItems", (ri: any) => ri.id === item.itemId, (ri: any) => ({
                ...ri,
                status: 'Used',
                completedAt: new Date().toISOString()
            }));
        }

        registerEconomyEvent(item.userId, 0, 'spend', 'production_finish', `Conclusão: ${item.itemName}`);
        
        // Move to history (mockDB only logic, real DB uses separate table or status)
        db.processedItemQueueHistoryData.unshift({
            ...item,
            redeemedItemId: item.itemId,
            queuedAt: item.createdAt,
            processedAt: new Date().toISOString()
        } as any);

        // Remove from active queue
        repo.delete("queue", (q: any) => q.id === item.id);

        logQueueEvent({ timestamp: Date.now(), userId: item.userId, queueType: 'usable', action: 'queue_complete', payload: { itemId: item.itemId } });
    }
    
    private startLoop() {
        // AUTOMATIC PROCESSING DISABLED
        // We removed the interval loop that simulates auto-progress and auto-completion.
        // Now the queue waits for Manual Admin Action via processItem().
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }
    
    public getQueueForUser(userId: string) {
        return this.getQueue('item')
            .filter((i: any) => i.userId === userId)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
}

export const QueueEngineV5 = new QueueEngineClass();
