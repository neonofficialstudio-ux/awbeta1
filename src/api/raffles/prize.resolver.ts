
import type { Raffle } from "../../types";
import { StoreCatalog } from "../store/store.catalog";
import { isLegacyItem } from "../legacy/legacy.items";

interface PrizeDetails {
    type: 'item' | 'coins' | 'hybrid' | 'custom' | 'legacy';
    isValid: boolean;
    displayTitle: string;
    displayImage: string;
    coinAmount: number;
    itemId?: string;
    warning?: string;
}

export const PrizeResolver = {
    /**
     * Analyzes a Raffle object and resolves its true prize nature.
     * Handles Legacy (V1) vs Modern (V2) structures.
     */
    resolve: (raffle: Raffle): PrizeDetails => {
        // 1. Check for V2 Structure
        if (raffle.prizeType) {
            return {
                type: raffle.prizeType,
                isValid: true, // V2 assumed valid by construction
                displayTitle: raffle.itemName,
                displayImage: raffle.itemImageUrl,
                coinAmount: raffle.coinReward || 0,
                itemId: raffle.itemId
            };
        }

        // 2. Fallback to V1 Logic (Legacy)
        // V1 relied on `itemId` existing in the store.
        const item = StoreCatalog.getItemById(raffle.itemId);
        
        if (item) {
            return {
                type: 'item',
                isValid: true,
                displayTitle: item.name,
                displayImage: item.imageUrl,
                coinAmount: 0,
                itemId: raffle.itemId
            };
        }

        // 3. Legacy/Invalid Check
        if (isLegacyItem(raffle.itemId)) {
             return {
                type: 'legacy',
                isValid: true, // Valid but legacy
                displayTitle: raffle.itemName || "Item Legado",
                displayImage: raffle.itemImageUrl || "https://via.placeholder.com/150?text=Legacy",
                coinAmount: 0,
                itemId: raffle.itemId,
                warning: "Item legado (não existe mais no catálogo atual)."
            };
        }

        // 4. Unknown/Broken
        return {
            type: 'custom', // Treat as custom text fallback
            isValid: false,
            displayTitle: raffle.itemName || "Item Desconhecido",
            displayImage: raffle.itemImageUrl || "https://via.placeholder.com/150?text=Unknown",
            coinAmount: 0,
            warning: "Item não encontrado no catálogo."
        };
    }
};
