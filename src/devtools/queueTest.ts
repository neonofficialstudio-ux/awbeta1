

import { QueueEngine } from "../services/queue/queue.engine";
import { QueueWorkerEngine } from "../services/queue/worker.engine";
import { StoreEconomyEngine } from "../services/store/storeEconomy.engine";
import { getRepository } from "../api/database/repository.factory";
import * as db from "../api/mockData";

const repo = getRepository();

export const QueueTest = {
    simulateQueueLoad: async () => {
        console.group("Queue Engine V4.2: Load Test");
        
        // Create dummy user
        const userId = `sim-queue-${Date.now()}`;
        repo.insert("users", { id: userId, plan: 'Free Flow', coins: 10000, name: "Queue Tester" });
        
        // Add items
        console.log("Adding 5 items...");
        for(let i=0; i<5; i++) {
            QueueEngine.addToQueue(userId, { id: `item-${i}`, name: `Test Item ${i}`, rarity: 'Regular' });
        }
        
        const queue = QueueEngine.getGlobalQueue('pending');
        console.log("Pending Queue Size:", queue.length);
        
        if (queue.length !== 5) console.error("FAIL: Queue load incorrect");
        else console.log("PASS: Queue load correct");
        
        // Cleanup
        repo.delete("users", (u:any) => u.id === userId);
        console.groupEnd();
    },

    simulatePurchaseAndQueue: async () => {
        console.group("Queue Engine V4.2: Store Integration Test");
        const userId = `sim-store-${Date.now()}`;
        const itemId = "s-cover"; // Existing store item id
        
        repo.insert("users", { id: userId, plan: 'Hitmaker', coins: 5000, name: "Store Tester" }); // Hitmaker = Priority 3
        
        // Purchase
        const result = await StoreEconomyEngine.applyStorePurchase(userId, itemId);
        console.log("Purchase Result:", result);
        
        if (!result.success) {
            console.error("FAIL: Purchase failed");
            console.groupEnd();
            return;
        }
        
        // NOTE: In V4.2 logic, purchase only adds to inventory. Queue addition is manual via UI -> API.
        // Simulating user activation:
        const redeemedId = result.redeemedItem?.id;
        if (redeemedId) {
             QueueEngine.addToQueue(userId, { id: redeemedId, name: result.redeemedItem!.itemName });
             const userQueue = QueueEngine.getUserQueue(userId);
             const item = userQueue.find(i => i.itemId === redeemedId);
             
             if (item && item.priority === 3) {
                  console.log("PASS: Item queued with Hitmaker priority (3)");
             } else {
                  console.error("FAIL: Priority mismatch or item not queued", item);
             }
        } else {
            console.error("FAIL: No redeemed item returned");
        }
        
        repo.delete("users", (u:any) => u.id === userId);
        console.groupEnd();
    },

    simulateWorkerProcess: async () => {
        console.group("Queue Engine V4.2: Worker Test");
        
        // Force run worker cycle
        const result = QueueWorkerEngine.runCycle();
        console.log("Worker Cycle Result:", result);
        
        const processing = QueueEngine.getGlobalQueue('processing');
        console.log("Items Processing:", processing.length);
        
        if (processing.length > 0) {
             console.log("PASS: Worker picked up items");
        } else {
             console.log("INFO: No items pending or worker capacity full/throttled");
        }
        
        console.groupEnd();
    }
};
