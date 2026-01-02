// api/metrics/queueMetrics.ts
import type { UsableItemQueueEntry, ProcessedUsableItemQueueEntry, ArtistOfTheDayQueueEntry } from '../../types';

type AnyQueueEntry = UsableItemQueueEntry | ArtistOfTheDayQueueEntry;
type AnyProcessedEntry = ProcessedUsableItemQueueEntry;

/**
 * Calculates the average time items spend in the queue before being processed.
 * @param history - The history of processed queue items.
 * @returns The average time in hours.
 */
export const calculateAverageQueueTime = (history: AnyProcessedEntry[]) => {
    if (history.length === 0) return 0;

    const totalWaitTimeMs = history.reduce((sum, item) => {
        const queuedTime = new Date(item.queuedAt).getTime();
        const processedTime = new Date(item.processedAt).getTime();
        return sum + (processedTime - queuedTime);
    }, 0);
    
    const avgTimeMs = totalWaitTimeMs / history.length;
    return avgTimeMs / (1000 * 60 * 60); // Convert to hours
};

/**
 * Finds the most frequently queued items.
 * @param queue - The current queue of items.
 * @returns A sorted list of items by queue count.
 */
export const getMostQueuedItems = (queue: AnyQueueEntry[]) => {
    const counts = queue.reduce((acc, item) => {
        acc[item.itemName] = (acc[item.itemName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
};

/**
 * Detects items that have been in the queue for an unusually long time.
 * @param queue - The current queue of items.
 * @returns An array of alerts for delayed items.
 */
export const detectQueueDelays = (queue: AnyQueueEntry[]) => {
    const alerts: { itemId: string; itemName: string, queuedForHours: number }[] = [];
    const now = new Date().getTime();
    const delayThresholdHours = 72; // 3 days

    for (const item of queue) {
// FIX: Add a fallback value of 0 when creating a Date object from the `queuedAt` property. This prevents "Invalid Date" errors if the string is empty or malformed, ensuring that the calculation for queue delay detection is robust and does not cause runtime exceptions.
        const queuedTime = new Date(item.queuedAt || 0).getTime();
        const hoursInQueue = (now - queuedTime) / (1000 * 60 * 60);

        if (hoursInQueue > delayThresholdHours) {
            alerts.push({
                itemId: item.id,
                itemName: item.itemName,
                queuedForHours: Math.round(hoursInQueue),
            });
        }
    }
    
    return alerts;
};