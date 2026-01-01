
import { QueueEngine } from "../../services/queue/queue.engine";
import { QueueWorkerEngine } from "../../services/queue/worker.engine";

// V4.2 API Exports
export const addToQueue = QueueEngine.addToQueue;
export const getUserQueue = QueueEngine.getUserQueue;
export const getGlobalQueue = QueueEngine.getGlobalQueue;
export const processNext = QueueEngine.processNext;
export const markAsDone = QueueEngine.markAsDone;
export const syncQueueState = QueueEngine.syncQueueState;

// Legacy / Compatibility Exports (Mapping to new engine)
export const queueListAPI = () => QueueEngine.getGlobalQueue();
export const queueAddAPI = (item: any) => QueueEngine.addToQueue(item.userId, item); 
export const queueNextAPI = () => {
    const pending = QueueEngine.getGlobalQueue('pending');
    return pending.length > 0 ? pending[0] : null;
};
export const queueProcessNextAPI = () => QueueEngine.processNext();
export const queueRunCycleAPI = (limit?: number) => QueueWorkerEngine.runCycle();


// Worker Control
export const startQueueWorker = QueueWorkerEngine.startAutoWorker;
export const stopQueueWorker = QueueWorkerEngine.stopAutoWorker;

// Legacy Export for Provider
export const QueueEngineV5 = {
    ...QueueEngine,
    getQueue: (type: string) => QueueEngine.getGlobalQueue() // Adaptor
};
