
// api/adminMonitor/adminMonitor.ts
import type { Mission, StoreItem, UsableItem, User, UsableItemQueueEntry, ArtistOfTheDayQueueEntry } from '../../types';
import * as rules from './adminRules';
import * as logger from './adminLogger';
import * as db from '../mockData';

interface MonitorResult {
    ok: boolean;
    alerts: { rule: string; severity: "low" | "medium" | "high"; details: string }[];
    log: any; // Simplified log return
}

const runValidation = (ruleResults: ReturnType<typeof rules.missionCreationConsistency>[]): Omit<MonitorResult, 'log'> => {
    const failedRules = ruleResults.filter(r => !r.passed);
    return {
        ok: failedRules.length === 0,
        alerts: failedRules.map(({ rule, severity, details }) => ({ rule, severity, details })),
    };
};

export const monitorMissionCreation = (mission: Mission): MonitorResult => {
    const validationResult = runValidation([rules.missionCreationConsistency(mission)]);
    logger.logAdminAction('monitorMissionCreation', { missionId: mission.id, title: mission.title }, validationResult);
    return { ...validationResult, log: {} };
};

export const monitorStoreEdit = (item: StoreItem | UsableItem): MonitorResult => {
    const validationResult = runValidation([rules.storePriceSafety(item)]);
    logger.logAdminAction('monitorStoreEdit', { itemId: item.id, name: item.name }, validationResult);
    return { ...validationResult, log: {} };
};

export const monitorPunishment = (punishment: { reason: string; deduction?: { coins?: number; xp?: number } }): MonitorResult => {
    const validationResult = runValidation([rules.adminPunishmentSafety(punishment)]);
    logger.logAdminAction('monitorPunishment', punishment, validationResult);
    return { ...validationResult, log: {} };
};

export const monitorLevelAdjustment = (oldUser: User, newUser: User): MonitorResult => {
    const validationResult = runValidation([rules.levelAdjustmentSafety(oldUser, newUser)]);
    logger.logAdminAction('monitorLevelAdjustment', { userId: newUser.id, oldXP: oldUser.xp, newXP: newUser.xp, oldCoins: oldUser.coins, newCoins: newUser.coins }, validationResult);
    return { ...validationResult, log: {} };
};

export const monitorQueueAction = (action: { id: string; status: string }, queueType: 'item' | 'spotlight'): MonitorResult => {
    const queue = queueType === 'item' ? db.usableItemQueueData : db.artistOfTheDayQueueData;
    const validationResult = runValidation([rules.queueActionSafety(action, queue)]);
    logger.logAdminAction('monitorQueueAction', { ...action, queueType }, validationResult);
    return { ...validationResult, log: {} };
};
