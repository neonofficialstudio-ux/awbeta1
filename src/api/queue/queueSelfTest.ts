
import { QueueEngineV5 } from './queueEngineV5';
import * as db from '../mockData';

export const runQueueSelfTest = () => {
    console.group("Running Queue Self-Test");
    let errors = 0;

    const items = QueueEngineV5.getQueue('item');
    
    // 1. Check duplicates
    const ids = new Set();
    items.forEach((item: any) => {
        if (ids.has(item.id)) {
            console.error(`[FAIL] Duplicate Queue ID: ${item.id}`);
            errors++;
        }
        ids.add(item.id);
        
        // 2. Check orphan references
        const redemption = db.redeemedItemsData.find(r => r.id === item.redeemedItemId);
        if (!redemption) {
            console.error(`[FAIL] Queue item ${item.id} refers to missing redemption ${item.redeemedItemId}`);
            errors++;
        }
        
        // 3. Check valid progress
        if (item.progress && (item.progress < 0 || item.progress > 100)) {
            console.error(`[FAIL] Invalid progress ${item.progress} for item ${item.id}`);
            errors++;
        }
    });

    console.log(`Queue Self-Test Complete. Errors found: ${errors}`);
    console.groupEnd();
    return errors === 0;
};
