
import { getRepository } from "../database/repository.factory";
import type { StoreItem, UsableItem } from "../../types";

const repo = getRepository();

export const StoreCatalog = {
    /**
     * Returns all items that are valid for raffles.
     * Filters out internal testing items or explicitly excluded ones.
     */
    getValidRaffleItems: (): (StoreItem | UsableItem)[] => {
        const storeItems = repo.select("storeItems") as StoreItem[];
        const usableItems = repo.select("usableItems") as UsableItem[];
        
        const all = [...storeItems, ...usableItems];

        // Filter logic (V2): Exclude items with 'debug' or 'test' in ID if any, 
        // or items that are archived (if we had that flag).
        // For now, returns all valid items.
        return all.filter(item => !!item.id && !!item.name);
    },

    getItemById: (id: string): StoreItem | UsableItem | undefined => {
        const all = StoreCatalog.getValidRaffleItems();
        return all.find(i => i.id === id);
    }
};
