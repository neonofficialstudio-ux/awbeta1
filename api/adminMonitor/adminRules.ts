
// api/adminMonitor/adminRules.ts
import type { Mission, StoreItem, UsableItem, Punishment, User, UsableItemQueueEntry, ArtistOfTheDayQueueEntry } from '../../types';
import { BASE_MISSION_REWARDS } from '../economy/economy';

interface RuleResult {
  rule: string;
  passed: boolean;
  severity: "low" | "medium" | "high";
  details: string;
}

// Regra 1 — missionCreationConsistency
export const missionCreationConsistency = (mission: Mission): RuleResult => {
    if (!['instagram', 'tiktok', 'creative', 'special'].includes(mission.type)) {
        return { rule: 'missionCreationConsistency', passed: false, severity: 'medium', details: 'Tipo de missão inválido.' };
    }
    if (!mission.description || mission.description.trim().length === 0) {
        return { rule: 'missionCreationConsistency', passed: false, severity: 'high', details: 'Descrição não pode ser vazia.' };
    }
    const rewardTiers = Object.values(BASE_MISSION_REWARDS);
    const rewardIsValid = rewardTiers.some(tier => tier.xp === mission.xp && tier.coins === mission.coins);
    if (!rewardIsValid) {
         return { rule: 'missionCreationConsistency', passed: true, severity: 'low', details: 'Recompensa de XP/LC fora dos padrões (curta/média/longa).' };
    }
    return { rule: 'missionCreationConsistency', passed: true, severity: 'low', details: '' };
};

// Regra 2 — storePriceSafety
export const storePriceSafety = (item: StoreItem | UsableItem): RuleResult => {
    if (item.price < 0) {
        return { rule: 'storePriceSafety', passed: false, severity: 'high', details: 'Preço não pode ser negativo.' };
    }
    if (item.price > 0 && item.price < 10) {
         return { rule: 'storePriceSafety', passed: false, severity: 'medium', details: 'Preço absurdamente baixo. Pode desequilibrar a economia.' };
    }
    if (item.price > 20000) {
         return { rule: 'storePriceSafety', passed: false, severity: 'low', details: 'Preço absurdamente alto. Pode ser inacessível.' };
    }
    return { rule: 'storePriceSafety', passed: true, severity: 'low', details: '' };
};

// Regra 3 — adminPunishmentSafety
export const adminPunishmentSafety = (punishment: { reason: string; deduction?: { coins?: number; xp?: number } }): RuleResult => {
    if (!punishment.reason || punishment.reason.trim().length === 0) {
        return { rule: 'adminPunishmentSafety', passed: false, severity: 'high', details: 'Punições devem ter um motivo registrado.' };
    }
    if (punishment.deduction) {
        if ((punishment.deduction.coins || 0) < 0 || (punishment.deduction.xp || 0) < 0) {
             return { rule: 'adminPunishmentSafety', passed: false, severity: 'high', details: 'Valores de dedução não podem ser negativos.' };
        }
    }
    return { rule: 'adminPunishmentSafety', passed: true, severity: 'low', details: '' };
};

// Regra 4 — levelAdjustmentSafety
export const levelAdjustmentSafety = (oldUser: User, newUser: User): RuleResult => {
    const xpDiff = newUser.xp - oldUser.xp;
    const coinDiff = newUser.coins - oldUser.coins;
    
    if (newUser.xp < 0) {
        return { rule: 'levelAdjustmentSafety', passed: false, severity: 'high', details: 'XP não pode ser ajustado para um valor negativo.' };
    }
    if (Math.abs(xpDiff) > 50000) { // Large adjustment
        return { rule: 'levelAdjustmentSafety', passed: false, severity: 'medium', details: `Ajuste de XP muito grande: ${xpDiff > 0 ? '+' : ''}${xpDiff} XP.` };
    }
     if (Math.abs(coinDiff) > 10000) { // Large adjustment
        return { rule: 'levelAdjustmentSafety', passed: false, severity: 'medium', details: `Ajuste de Moedas muito grande: ${coinDiff > 0 ? '+' : ''}${coinDiff} Moedas.` };
    }
    
    return { rule: 'levelAdjustmentSafety', passed: true, severity: 'low', details: '' };
};

// Regra 5 — queueActionSafety
export const queueActionSafety = (action: { id: string; status: string }, queue: (UsableItemQueueEntry | ArtistOfTheDayQueueEntry)[]): RuleResult => {
    const itemInQueue = queue.find(item => item.id === action.id);
    if (!itemInQueue) {
        return { rule: 'queueActionSafety', passed: false, severity: 'high', details: `Item com ID ${action.id} não foi encontrado na fila.` };
    }
    return { rule: 'queueActionSafety', passed: true, severity: 'low', details: '' };
};
