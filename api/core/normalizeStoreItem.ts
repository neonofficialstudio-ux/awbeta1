import type { StoreItem } from '../../types';

export const normalizeStoreItem = (item: StoreItem): StoreItem => {
    const validRarities: StoreItem['rarity'][] = ['Regular', 'Raro', 'Épico', 'Lendário'];
    const normalizedItem = { ...item };

    if (normalizedItem.price < 0) {
        normalizedItem.price = 0;
    }
    
    if (!validRarities.includes(normalizedItem.rarity)) {
        normalizedItem.rarity = 'Regular';
    }

    return normalizedItem;
};
