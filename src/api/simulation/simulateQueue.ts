
import type { UsableItemQueueEntry } from '../../types';
import { deepClone } from '../helpers';

type Queue = UsableItemQueueEntry[];

/**
 * Simulates adding a new item to a queue.
 * @param queue The initial state of the queue.
 * @param item The item to add.
 * @returns The new state of the queue after adding the item.
 */
export const simulateQueueEntry = (queue: Queue, item: UsableItemQueueEntry): Queue => {
    const newQueue = deepClone(queue);
    newQueue.push(item);
    return newQueue;
};

/**
 * Simulates processing the first item in a queue.
 * @param queue The initial state of the queue.
 * @returns An object containing the processed item and the new state of the queue.
 */
export const simulateQueueProcessing = (queue: Queue) => {
    if (queue.length === 0) {
        return { processedItem: null, newQueue: [] };
    }
    const newQueue = deepClone(queue);
    const processedItem = newQueue.shift(); // Removes the first item
    
    return {
        processedItem: processedItem || null,
        newQueue,
    };
};

/**
 * Simulates the entire lifecycle: entry, processing, and completion for an item.
 * @param item The item to simulate.
 * @returns A log of the queue state at each step.
 */
export const simulateQueueCompletion = (item: UsableItemQueueEntry) => {
    const log = [];
    let queue: Queue = [];

    // 1. Initial empty queue
    log.push({ step: 'Initial Queue', queue: deepClone(queue) });

    // 2. Add item to queue
    queue = simulateQueueEntry(queue, item);
    log.push({ step: 'After Entry', queue: deepClone(queue) });

    // 3. Process item
    const { processedItem, newQueue } = simulateQueueProcessing(queue);
    queue = newQueue;
    log.push({ step: 'After Processing', queue: deepClone(queue), processedItem });

    return log;
};
