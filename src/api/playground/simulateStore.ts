
// api/playground/simulateStore.ts
import type { User, StoreItem, UsableItem } from '../../types';
import { calculateDiscountedPrice } from '../economy/economy';
import { deepClone } from '../helpers';
import * as db from '../mockData';

/**
 * Simulates a single purchase, applying discounts and checking balance.
 * @param user The user making the purchase.
 * @param item The item being purchased.
 * @returns An object with the result and the final user state if successful.
 */
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

/**
 * Simulates a user buying the cheapest available item repeatedly until they run out of coins.
 * @param user The user to simulate.
 * @returns An object with the final user state and a log of purchased items.
 */
export const simulatePurchaseUntilZero = (user: User) => {
    let simUser = deepClone(user);
    const purchaseLog = [];
    const availableItems = [...db.storeItemsData, ...db.usableItemsData]
        .filter(item => !item.isOutOfStock)
        .sort((a, b) => a.price - b.price);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const cheapestAffordableItem = availableItems.find(item => {
            const finalPrice = calculateDiscountedPrice(item.price, simUser.plan);
            return simUser.coins >= finalPrice;
        });

        if (!cheapestAffordableItem) {
            break; // No more items the user can afford
        }

        const result = simulatePurchase(simUser, cheapestAffordableItem);
        if (result.success && result.finalUser) {
            simUser = result.finalUser;
            purchaseLog.push({
                itemName: cheapestAffordableItem.name,
                pricePaid: result.finalPrice,
                coinsRemaining: simUser.coins,
            });
        } else {
            // Should not happen with the check above, but as a safeguard
            break;
        }
    }

    return {
        finalUser: simUser,
        purchaseLog,
        itemsPurchasedCount: purchaseLog.length,
    };
};
