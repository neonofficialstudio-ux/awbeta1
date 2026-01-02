
// api/security/valueCore.ts
import { getRepository } from "../database/repository.factory";
import { AtomicLock } from "./atomicLock";
import { SanityGuard } from "../../services/sanity.guard";
import { validateNonce } from "../anticheat/replayGuard";

const repo = getRepository();

interface ValueOperation {
    userId: string;
    type: 'COIN' | 'XP';
    amount: number; // Delta
    source: string;
    timestamp: number;
    nonce: string;
}

// Simple hash function for simulation (in prod use crypto.subtle)
const generateHash = (op: ValueOperation): string => {
    const str = `${op.userId}:${op.type}:${op.amount}:${op.source}:${op.timestamp}:${op.nonce}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
};

export const ValueCore = {
    /**
     * The ONLY authorized way to mutate user balance.
     * Validates locks, signs operation, and commits to DB.
     */
    apply: (userId: string, type: 'COIN' | 'XP', amount: number, source: string) => {
        // 1. Atomic Lock
        if (!AtomicLock.lock(`value:${userId}`)) {
            throw new Error("Operação bloqueada: Concorrência detectada.");
        }

        try {
            // 2. Validate Integrity
            const user = repo.select("users").find((u: any) => u.id === userId);
            if (!user) throw new Error("Usuário não encontrado (Integrity Check Failed).");

            const safeAmount = SanityGuard.number(amount);
            if (isNaN(safeAmount)) throw new Error("Valor inválido.");

            // 3. Create Operation Payload & Secure Nonce
            const nonce = Math.random().toString(36).substring(7);
            
            // Anti Replay (Self-check for generated nonce ensuring system consistency)
            if (!validateNonce(nonce)) {
                throw new Error("Replay attack detectado ou falha na geração de nonce.");
            }

            const operation: ValueOperation = {
                userId,
                type,
                amount: safeAmount,
                source,
                timestamp: Date.now(),
                nonce
            };

            // 4. Sign Operation
            const signature = generateHash(operation);

            // 5. Execute Mutation
            let newState = { ...user };
            if (type === 'COIN') {
                newState.coins = Math.max(0, (user.coins || 0) + safeAmount);
            } else if (type === 'XP') {
                newState.xp = Math.max(0, (user.xp || 0) + safeAmount);
            }

            repo.update("users", (u: any) => u.id === userId, (u: any) => newState);

            return { 
                success: true, 
                hash: signature, 
                previousValue: type === 'COIN' ? user.coins : user.xp,
                newValue: type === 'COIN' ? newState.coins : newState.xp
            };

        } finally {
            AtomicLock.unlock(`value:${userId}`);
        }
    },

    /**
     * Generates a unique secure ID for items like Tickets.
     */
    generateSecureID: (prefix: string, contextStr: string): string => {
        const timestamp = Date.now();
        const raw = `${prefix}:${contextStr}:${timestamp}:${Math.random()}`;
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            const char = raw.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return `${prefix}-${Math.abs(hash).toString(16).toUpperCase()}`;
    }
};
