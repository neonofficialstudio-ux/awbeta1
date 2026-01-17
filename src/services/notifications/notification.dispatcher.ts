
import { NotificationEngine } from "./notification.engine";
import type { AWNotification } from "./notification.types";

export const NotificationDispatcher = {
    // --- ECONOMY ---
    coinsAdded: (userId: string, amount: number, reason: string): AWNotification => {
        return NotificationEngine.create(
            userId,
            "coins_added",
            `+${amount} Lummi Coins`,
            `Você recebeu coins: ${reason}`,
            { view: 'store', tab: 'buy' }
        );
    },

    coinsSpent: (userId: string, amount: number, item: string): AWNotification => {
        return NotificationEngine.create(
            userId,
            "coins_spent",
            `-${amount} Lummi Coins`,
            `Compra realizada: ${item}`,
            { view: 'inventory' }
        );
    },

    xpAdded: (userId: string, amount: number, reason: string): AWNotification => {
        return NotificationEngine.create(
            userId,
            "xp_added",
            `+${amount} XP`,
            `Experiência ganha: ${reason}`,
            { view: 'profile' }
        );
    },

    levelUp: (userId: string, newLevel: number): AWNotification => {
        return NotificationEngine.create(
            userId,
            "level_up",
            "Level Up!",
            `Parabéns! Você alcançou o nível ${newLevel}.`,
            { view: 'profile' }
        );
    },

    // --- MISSIONS ---
    missionPending: (userId: string, missionTitle: string): AWNotification => {
        return NotificationEngine.create(
            userId,
            "mission_pending",
            "Missão Enviada",
            `Sua prova para "${missionTitle}" está em análise.`,
            { view: 'missions' }
        );
    },

    missionApproved: (userId: string, missionTitle: string, rewards: { xp: number, coins: number }): AWNotification => {
        return NotificationEngine.create(
            userId,
            "mission_approved",
            "Missão Aprovada!",
            `"${missionTitle}" concluída. +${rewards.xp} XP, +${rewards.coins} Coins.`,
            { view: 'missions' }
        );
    },

    missionRejected: (userId: string, missionTitle: string, reason?: string): AWNotification => {
        return NotificationEngine.create(
            userId,
            "mission_rejected",
            "Missão Rejeitada",
            `Prova recusada para "${missionTitle}". ${reason || 'Verifique os requisitos.'}`,
            { view: 'missions' }
        );
    },

    // --- QUEUE ---
    queueUpdate: (userId: string, itemName: string, status: string): AWNotification => {
        return NotificationEngine.create(
            userId,
            "queue_update",
            "Atualização de Fila",
            `Seu item "${itemName}" está: ${status}`,
            { view: 'inventory', tab: 'usable' }
        );
    },

    // --- EVENTS ---
    eventUpdate: (userId: string, title: string, message: string): AWNotification => {
        return NotificationEngine.create(
            userId,
            "event_update",
            title,
            message,
            { view: 'dashboard' }
        );
    },

    // --- SYSTEM ---
    systemInfo: (userId: string, title: string, message: string): AWNotification => {
        return NotificationEngine.create(
            userId,
            "system_info",
            title,
            message
        );
    }
};
