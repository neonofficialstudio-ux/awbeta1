
import { getRepository } from "../database/repository.factory";
import { EconomyEngineV6 } from "../economy/economyEngineV6";
import { StoreEconomyEngine } from "../../services/store/storeEconomy.engine";
import { NotificationDispatcher } from "../../services/notifications/notification.dispatcher";
import { TelemetryPRO } from "../../services/telemetry.pro";
import type { ManualAward, User } from "../../types";

const repo = getRepository();

export const ManualAwardsEngine = {
    /**
     * Creates a manual award and processes its side effects (Economy/Inventory).
     */
    createAward: (payload: Omit<ManualAward, 'id' | 'dateISO'>) => {
        const user = repo.select("users").find((u: any) => u.id === payload.userId);
        if (!user) throw new Error("Usuário não encontrado.");

        const award: ManualAward = {
            ...payload,
            id: `awd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            dateISO: new Date().toISOString(),
        };

        // 1. Persist Award Record
        repo.insert("manualAwards", award);

        // 2. Process Side Effects based on Type
        const reason = award.customTitle ? `Prêmio Manual: ${award.customTitle}` : 'Premiação Administrativa';

        if (award.type === 'coins') {
            if (!award.amount || award.amount <= 0) throw new Error("Valor de Coins inválido.");
            EconomyEngineV6.addCoins(user.id, award.amount, reason);
            NotificationDispatcher.systemInfo(user.id, "Você recebeu um prêmio!", `+${award.amount} Lummi Coins foram adicionados à sua carteira.`);
        }

        if (award.type === 'xp') {
            if (!award.amount || award.amount <= 0) throw new Error("Valor de XP inválido.");
            EconomyEngineV6.addXP(user.id, award.amount, reason);
            NotificationDispatcher.systemInfo(user.id, "Você recebeu um prêmio!", `+${award.amount} XP! Continue evoluindo.`);
        }

        if (award.type === 'item') {
            if (!award.itemId) throw new Error("Item não selecionado.");
            // Bypass purchase check, force grant
            // We manually insert into redeemedItems to avoid cost deduction, but link to item metadata
            const allItems = [...repo.select("storeItems"), ...repo.select("usableItems")];
            const itemDef = allItems.find((i: any) => i.id === award.itemId);
            
            if (itemDef) {
                const now = new Date();
                repo.insert("redeemedItems", {
                    id: `ri-man-${now.getTime()}`,
                    userId: user.id,
                    userName: user.name,
                    itemId: itemDef.id,
                    itemName: itemDef.name,
                    itemPrice: 0, // Free grant
                    redeemedAt: now.toLocaleString('pt-BR'),
                    redeemedAtISO: now.toISOString(),
                    coinsBefore: user.coins,
                    coinsAfter: user.coins,
                    status: 'Redeemed'
                });
                NotificationDispatcher.systemInfo(user.id, "Item Recebido!", `O item "${itemDef.name}" foi adicionado ao seu inventário.`);
            } else {
                throw new Error("Item de loja não encontrado no sistema.");
            }
        }

        if (award.type === 'text') {
            NotificationDispatcher.systemInfo(user.id, "Menção Honrosa", reason);
        }

        // 3. Telemetry
        TelemetryPRO.event("manual_award_created", {
            adminId: payload.adminId,
            targetUser: payload.userId,
            type: payload.type,
            amount: payload.amount,
            itemId: payload.itemId
        });

        return award;
    }
};
