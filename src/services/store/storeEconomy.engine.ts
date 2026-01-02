
import { getRepository } from "../../api/database/repository.factory";
import { createNotification } from "../../api/helpers";
import { SanityGuard } from "../../services/sanity.guard";
import { TelemetryPremium } from "../../api/telemetry/telemetryPremium";

const repo = getRepository();

export const StoreEconomyEngine = {
    
    purchaseItem: async (userId: string, itemId: string) => {
        // V2.1 Premium Telemetry
        TelemetryPremium.track("store_item_view", userId, { itemId });

        // RPC CALL - "purchase_item"
        // Validates balance, stock, plan restrictions, deducts coins, adds to inventory logs
        try {
            const result = await repo.rpc!('purchase_item', { userId, itemId });
            
            if (!result.success) {
                const user = repo.select("users").find((u:any) => u.id === userId);
                return { success: false, error: result.error, updatedUser: SanityGuard.user(user) };
            }
            
            const updatedUser = SanityGuard.user(result.user);
            const item = result.redeemedItem;
            
            const notifications = [
                createNotification(userId, 'Compra Realizada!', `Você adquiriu "${item.itemName}".`, { view: 'inventory' })
            ];
            
            TelemetryPremium.track("store_item_purchased", userId, { itemId, price: item.itemPrice });

            return { success: true, updatedUser, notifications, redeemedItem: item };

        } catch (e: any) {
            return { success: false, error: e.message || "Erro de conexão com a loja." };
        }
    },

    // Alias for compatibility
    applyStorePurchase: async (userId: string, itemId: string) => {
        return await StoreEconomyEngine.purchaseItem(userId, itemId);
    }
};
