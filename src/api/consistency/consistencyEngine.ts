
import type { User, Mission, CoinTransaction, StoreItem, UsableItem, UsableItemQueueEntry } from '../../types';
import { BASE_MISSION_REWARDS, PLAN_MULTIPLIERS, calculateLevelFromXp } from '../economy/economy';

type ValidationResult = {
    valid: boolean;
    reason?: string;
};

export const validateMissionReward = (mission: Mission, user: User): ValidationResult => {
    if (mission.xp < 0 || ('coins' in mission && mission.coins < 0)) {
        return { valid: false, reason: 'Missão com recompensas negativas.' };
    }

    // Check if rewards roughly align with official tiers (allowing for some custom variation)
    const tiers = Object.values(BASE_MISSION_REWARDS);
    const matchesTier = tiers.some(t => Math.abs(t.xp - mission.xp) < 50); // Loose check
    
    if (!matchesTier && mission.type !== 'special') {
        return { valid: false, reason: 'Recompensa da missão foge dos padrões oficiais (Curta/Média/Longa).' };
    }

    return { valid: true };
};

export const validateEconomyTransaction = (transaction: Partial<CoinTransaction>): ValidationResult => {
    if (transaction.amount === undefined) {
        return { valid: false, reason: 'Transação sem valor definido.' };
    }

    if (transaction.type === 'earn' && transaction.amount < 0) {
        return { valid: false, reason: 'Transação do tipo "earn" com valor negativo.' };
    }

    if (transaction.type === 'spend' && transaction.amount > 0) {
        // Note: In some systems spend is negative number, in others it's positive magnitude. 
        // Assuming mock data uses negative for spend in log, but checks usually handle magnitude.
        // Based on existing mock data, spend transactions have negative amounts.
        return { valid: false, reason: 'Transação do tipo "spend" deve ser negativa ou tratada corretamente.' };
    }
    
    return { valid: true };
};

export const validateStoreRedemption = (item: StoreItem | UsableItem, user: User): ValidationResult => {
    if (user.coins < 0) {
        return { valid: false, reason: 'Usuário com saldo negativo tentando resgatar item.' };
    }
    
    if (user.plan === 'Free Flow' && !('rarity' in item)) {
        // Usable items don't have rarity, Store items do. Logic: Free flow can't use "Usable Items" (which typically don't have rarity in this mock logic or are distinguished by ID range/list)
        // Actually checking 'exchanges' property which StoreItems have and UsableItems don't is safer, 
        // or using the specific list. But let's stick to the prompt rule "usuário do plano Free não pode resgatar itens utilizáveis".
        // In types.ts, StoreItem has 'rarity', UsableItem does not.
        return { valid: false, reason: 'Usuário Free Flow tentando resgatar Item Utilizável restrito.' };
    }

    return { valid: true };
};

export const validateQueueConsistency = (queueEntry: UsableItemQueueEntry): ValidationResult => {
    if (!queueEntry.userId || !queueEntry.itemName) {
        return { valid: false, reason: 'Entrada na fila com dados incompletos.' };
    }
    return { valid: true };
};

export const validateRankingAfterChange = (user: User): ValidationResult => {
    if (user.xp < 0) {
        return { valid: false, reason: 'XP do usuário tornou-se negativo.' };
    }
    
    const { level } = calculateLevelFromXp(user.xp);
    // Allow small discrepancy due to manual edits, but warn if huge
    if (Math.abs(user.level - level) > 1) {
        return { valid: false, reason: `Nível do usuário (${user.level}) inconsistente com XP total (${user.xp} -> deveria ser ${level}).` };
    }

    return { valid: true };
};
