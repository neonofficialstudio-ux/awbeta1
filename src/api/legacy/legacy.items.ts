
/**
 * LEGACY ITEMS REGISTRY
 * Contains IDs of items that existed in V1 but might be deprecated or deleted.
 * The Raffle Engine checks this to properly handle display for old raffles.
 */

export const LEGACY_ITEM_IDS = [
    's-cover', 
    's-teaser', 
    'ui-spotlight'
];

export const isLegacyItem = (id: string) => LEGACY_ITEM_IDS.includes(id);
