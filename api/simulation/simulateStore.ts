
// api/simulation/simulateStore.ts
import type { User, StoreItem, UsableItem } from '../../types';
import { calculateDiscountedPrice } from '../economy/economy';
import { deepClone } from '../helpers';
import { storeItemsData, usableItemsData } from '../mockData';

export const simulatePurchase = (user: User, item: StoreItem | UsableItem) => {
    const simUser = deepClone(user);
    const finalPrice = calculateDiscountedPrice(item.price, simUser.plan);

    if (simUser.coins < finalPrice) {
        return {
            success: false,
            reason: 'Insufficient funds',
            finalPrice,
            finalUser: null,
        };
    }

    simUser.coins -= finalPrice;
    
    return {
        success: true,
        reason: 'Purchase successful',
        finalPrice,
        finalUser: simUser,
    };
};

export const simulateUseItem = (simUser: User, itemId: string) => {
    const user = deepClone(simUser);
    const item = usableItemsData.find(i => i.id === itemId);
    
    if (!item) {
        return { success: false, reason: "Usable item not found", finalUser: user };
    }
    
    let effect = `Used item '${item.name}'.`;
    if (item.id === 'ui-spotlight') {
        effect += ' User would be added to the spotlight queue.';
    } else if (item.id === 'ui1') {
        effect += ' User\'s post would be added to the item queue to become a mission.';
    }

    return { success: true, reason: effect, finalUser: user };
};
