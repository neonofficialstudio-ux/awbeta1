
// api/tests/test-cases/queue-tests.ts
import type { TestDefinition } from '../test-runner';
import type { UsableItemQueueEntry } from '../../../types';
import { generateTestUsers } from '../../playground/generateTestUsers';
import { simulateQueueEntry, simulateQueueProcessing, simulateQueueCompletion } from '../../simulation/simulateQueue';
import { deepClone } from '../../helpers';

const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
};

const user = generateTestUsers()[0];
const mockQueueItem: UsableItemQueueEntry = {
    id: 'q-item-1',
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatarUrl,
    itemId: 'ri-1',
    redeemedItemId: 'ri-1',
    itemName: 'Microfone',
    status: 'pending',
    priority: 1,
    createdAt: new Date().toISOString(),
    queuedAt: new Date().toISOString(),
    postUrl: 'https://instagram.com/p/post'
};

export const queueTests: TestDefinition[] = [
    {
        name: 'Adiciona item à fila corretamente',
        fn: () => {
            const initialQueue: UsableItemQueueEntry[] = [];
            const newQueue = simulateQueueEntry(initialQueue, mockQueueItem);
            assert(newQueue.length === 1, 'Queue should have 1 item');
            assert(newQueue[0].id === mockQueueItem.id, 'The correct item should be in the queue');
        }
    },
    {
        name: 'Processa item da fila corretamente (FIFO)',
        fn: () => {
            const item2 = { ...mockQueueItem, id: 'q-item-2' };
            const initialQueue: UsableItemQueueEntry[] = [mockQueueItem, item2];
            const { processedItem, newQueue } = simulateQueueProcessing(initialQueue);
            assert(newQueue.length === 1, 'Queue should have 1 item remaining');
            assert(processedItem?.id === mockQueueItem.id, 'The first item (FIFO) should have been processed');
            assert(newQueue[0].id === item2.id, 'The second item should now be first');
        }
    },
    {
        name: 'Comportamento com fila vazia',
        fn: () => {
            const initialQueue: UsableItemQueueEntry[] = [];
            const { processedItem, newQueue } = simulateQueueProcessing(initialQueue);
            assert(processedItem === null, 'Processed item should be null for an empty queue');
            assert(newQueue.length === 0, 'Queue should remain empty');
        }
    },
    {
        name: 'Fluxo completo de um item na fila',
        fn: () => {
            const log = simulateQueueCompletion(mockQueueItem);
            assert(log.length === 3, 'Log should have 3 steps');
            assert(log[0].queue.length === 0, 'Step 1: Initial queue should be empty');
            assert(log[1].queue.length === 1, 'Step 2: Queue should have 1 item after entry');
            assert(log[2].queue.length === 0, 'Step 3: Queue should be empty after processing');
            assert(log[2].processedItem.id === mockQueueItem.id, 'Step 3: Correct item should be processed');
        }
    }
];
