
import { getRepository } from "../../api/database/repository.factory";
import type { LedgerEntry, CurrencyType, TransactionType, TransactionSource, CoinTransaction } from "../../types/economy";
import { saveToStorage, loadFromStorage } from "../../api/persist/localStorage";
import { TelemetryPRO } from "../telemetry.pro";

const repo = getRepository();
const LEDGER_STORAGE_KEY = "aw_economy_ledger_v6_5";

export const LedgerEngine = {
  /**
   * Records a transaction in the immutable ledger with Telemetry and Validation.
   * This is the SINGLE SOURCE OF TRUTH for all economic history.
   */
  recordTransaction: (
    userId: string,
    currency: CurrencyType,
    amount: number,
    transactionType: TransactionType,
    source: TransactionSource,
    description: string,
    currentBalance: number, // Balance AFTER transaction (Snapshot)
    metadata: any = {}
  ): LedgerEntry => {
    
    // 1. Validation Integrity
    if (!Number.isFinite(amount) || isNaN(amount)) {
        throw new Error(`[Ledger] Invalid transaction amount: ${amount}`);
    }

    // 2. Construct Entry
    const timestamp = Date.now();
    const entry: LedgerEntry = {
      id: `led-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: currency,
      amount,
      transactionType,
      source,
      timestamp,
      balanceAfter: currentBalance, // Snapshot of balance at that time
      description,
      metadata
    };

    // 3. Persist Internal Ledger (Storage)
    const ledger = LedgerEngine.loadLedger();
    ledger.push(entry);
    LedgerEngine.saveLedger(ledger);

    // 4. Persist Legacy Mirror (Transactions Table) for UI compatibility
    if (currency === 'COIN') {
        const coinTx: CoinTransaction = {
            id: entry.id,
            userId: entry.userId,
            amount: entry.amount,
            type: entry.transactionType,
            source: entry.source,
            description: entry.description,
            date: new Date(entry.timestamp).toLocaleString('pt-BR'),
            dateISO: new Date(entry.timestamp).toISOString()
        };
        repo.insert("transactions", coinTx);
    }

    // 5. Telemetry PRO Integration (Mandatory for Audit)
    const balanceBefore = currentBalance - amount;
    
    TelemetryPRO.event("economy_transaction", {
        userId,
        currency,
        type: transactionType,
        amount,
        balanceBefore,
        balanceAfter: currentBalance,
        source,
        description,
        timestamp
    });

    return entry;
  },

  getLedgerHistory: (userId: string): LedgerEntry[] => {
    const ledger = LedgerEngine.loadLedger();
    return ledger.filter(e => e.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
  },

  /**
   * Checks if a specific transaction type exists for a user, optionally matching a unique ID in metadata.
   * Used for Idempotency checks (e.g. Jackpot Round ID).
   */
  hasTransactionOfType: (userId: string, source: TransactionSource, uniqueId?: string): boolean => {
      const ledger = LedgerEngine.loadLedger();
      return ledger.some(t => 
          t.userId === userId && 
          t.source === source && 
          (uniqueId ? t.metadata?.uniqueId === uniqueId : true)
      );
  },

  clearLedger: () => {
      saveToStorage(LEDGER_STORAGE_KEY, []);
  },

  // Internal helpers
  loadLedger: (): LedgerEntry[] => {
      return loadFromStorage<LedgerEntry[]>(LEDGER_STORAGE_KEY, []);
  },

  saveLedger: (ledger: LedgerEntry[]) => {
      saveToStorage(LEDGER_STORAGE_KEY, ledger);
  }
};
