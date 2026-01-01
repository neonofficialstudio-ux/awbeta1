
import { AdminEngine } from './AdminEngine';

// Redirect all calls to AdminEngine (Single Source of Truth)

export const getStoreData = AdminEngine.getDashboardData;

// Legacy mock return kept for compatibility if called directly, but logic delegated
export const getItems = () => ({ success: true, data: AdminEngine.getDashboardData().storeItems }); 

export const createItem = AdminEngine.store.saveStoreItem;
export const updateItem = AdminEngine.store.saveStoreItem; // Update is Save in V7 logic
export const deleteItem = AdminEngine.store.deleteStoreItem;
export const updateStoreItem = AdminEngine.store.saveStoreItem;

export const createUsableItem = AdminEngine.store.saveUsableItem;
export const updateUsableItem = AdminEngine.store.saveUsableItem;
export const deleteUsableItem = AdminEngine.store.deleteUsableItem;

export const saveCoinPack = AdminEngine.store.saveCoinPack;
export const deleteCoinPack = AdminEngine.store.deleteCoinPack;
export const toggleCoinPackStock = AdminEngine.store.toggleCoinPackStock;
