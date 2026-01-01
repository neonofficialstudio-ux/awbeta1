
// api/persist/localEconomy.ts
import { saveToStorage, loadFromStorage } from './localStorage';
import type { CoinTransaction } from '../../types';

const LEDGER_KEY = 'aw_economy_ledger_v5';

export const persistLedger = (transactions: CoinTransaction[]) => {
    // Save only recent transactions to avoid storage limits, e.g., last 200
    saveToStorage(LEDGER_KEY, transactions.slice(0, 200));
};

export const hydrateLedger = (): CoinTransaction[] => {
    return loadFromStorage<CoinTransaction[]>(LEDGER_KEY, []);
};
    