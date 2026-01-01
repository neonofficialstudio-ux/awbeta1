
import type { CoinPack, CoinPurchaseRequest, VisualRewardFormData } from '../types';
import { withLatency, createNotification } from './helpers';
import { StoreEconomyEngine } from '../services/store/storeEconomy.engine';
import { getRepository } from './database/repository.factory';
import { SanityGuard } from '../services/sanity.guard';

const repo = getRepository();

export const fetchStoreData = (userId: string) => withLatency(async () => {
    const storeItems = await repo.selectAsync("storeItems");
    const usableItems = await repo.selectAsync("usableItems");
    const coinPacks = await repo.selectAsync("coinPacks");
    const requests = await repo.selectAsync("coinPurchaseRequests");
    
    return {
        success: true,
        data: {
            storeItems: storeItems.map(SanityGuard.storeItem),
            usableItems: usableItems,
            coinPacks: coinPacks,
            coinPurchaseRequests: requests.filter((r: any) => r.userId === userId),
        }
    };
});

export const fetchInventoryData = (userId: string) => withLatency(async () => {
    const redeemedItems = await repo.selectAsync("redeemedItems");
    const storeItems = await repo.selectAsync("storeItems");
    const usableItems = await repo.selectAsync("usableItems");
    const queue = await repo.selectAsync("queue");

    return {
        success: true,
        data: {
            redeemedItems: redeemedItems.filter((i: any) => i.userId === userId),
            storeItems: storeItems.map(SanityGuard.storeItem),
            usableItems: usableItems,
            usableItemQueue: queue.filter((q: any) => q.userId === userId).map(SanityGuard.queueItem),
            artistOfTheDayQueue: [], // Deprecated
        }
    };
});

export const redeemItem = (userId: string, itemId: string) => withLatency(async () => {
    // Delega para a Engine que já usa o repo de forma segura
    return await StoreEconomyEngine.purchaseItem(userId, itemId);
});

export const useUsableItem = (userId: string, redeemedItemId: string, postUrl: string) => withLatency(async () => {
    const redeemedItems = await repo.selectAsync("redeemedItems");
    const item = redeemedItems.find((i: any) => i.id === redeemedItemId && i.userId === userId);
    
    if (!item) return { success: false, error: "Item not found" };

    // Atualiza status do item
    await repo.updateAsync("redeemedItems", (i: any) => i.id === redeemedItemId, (i: any) => ({ ...i, status: 'InProgress', formData: { postUrl } }));
    
    // Adiciona à fila
    await repo.insertAsync("queue", {
        id: `q-${Date.now()}`,
        userId,
        itemId: item.itemId,
        redeemedItemId: item.id,
        itemName: item.itemName,
        status: 'pending',
        priority: 1,
        queuedAt: new Date().toISOString(),
        postUrl
    });

    const notifications = [
        createNotification(userId, "Solicitação Enviada", `Item ativado e enviado para a fila.`, { view: 'inventory', tab: 'usable' })
    ];
    return { success: true, notifications };
});

export const queueForArtistOfTheDay = (userId: string, redeemedItemId: string) => withLatency(() => {
    return { success: false, error: "Este item foi descontinuado." };
});

export const buyCoinPack = (userId: string, pack: CoinPack) => withLatency(async () => {
    const users = await repo.selectAsync("users");
    const user = users.find((u: any) => u.id === userId);
    if (!user) return { success: false, error: "User not found" };

    const newRequest: CoinPurchaseRequest = {
      id: `cpr-${Date.now()}`, 
      userId, 
      userName: user.name, 
      packId: pack.id, 
      packName: pack.name,
      coins: pack.coins, 
      price: pack.price, 
      requestedAt: new Date().toISOString(),
      status: 'pending_link_generation',
      paymentLink: pack.paymentLink,
    };
    
    await repo.insertAsync("coinPurchaseRequests", newRequest);
    return { success: true, newRequest, notifications: [] };
});

export const initiatePayment = (requestId: string) => withLatency(async () => {
    const requests = await repo.selectAsync("coinPurchaseRequests");
    const req = requests.find((r: any) => r.id === requestId);
    if (!req) return { success: false, error: "Request not found" };
    
    const updated = { ...req, status: 'pending_payment' };
    await repo.updateAsync("coinPurchaseRequests", (r: any) => r.id === requestId, (r: any) => updated);
    
    return { success: true, updatedRequest: updated };
});

export const buyCustomCoinPack = (userId: string, coins: number, price: number) => withLatency(async () => {
    const users = await repo.selectAsync("users");
    const user = users.find((u: any) => u.id === userId);
    
    const newRequest: CoinPurchaseRequest = {
      id: `cpr-custom-${Date.now()}`, 
      userId, 
      userName: user?.name || "User", 
      packId: `custom-${coins}`,
      packName: `Pacote Personalizado (${coins})`, 
      coins, 
      price, 
      requestedAt: new Date().toISOString(),
      status: 'pending_link_generation',
    };
    
    await repo.insertAsync("coinPurchaseRequests", newRequest);
    return { success: true, newRequest, notifications: [] };
});

export const openPaymentLink = (requestId: string) => withLatency(async () => {
    return { success: true };
});

export const cancelCoinPurchaseRequest = (requestId: string) => withLatency(async () => {
    await repo.updateAsync("coinPurchaseRequests", (r: any) => r.id === requestId, (r: any) => ({ ...r, status: 'cancelled' }));
    const requests = await repo.selectAsync("coinPurchaseRequests");
    return { success: true, updatedRequest: requests.find((r: any) => r.id === requestId), notifications: [] };
});

export const submitCoinPurchaseProof = (userId: string, requestId: string, proofDataUrl: string) => withLatency(async () => {
    await repo.updateAsync("coinPurchaseRequests", (r: any) => r.id === requestId, (r: any) => ({ ...r, status: 'pending_approval', proofUrl: proofDataUrl }));
    const requests = await repo.selectAsync("coinPurchaseRequests");
    return { success: true, updatedRequest: requests.find((r: any) => r.id === requestId), notifications: [] };
});

export const submitVisualRewardForm = (userId: string, redeemedItemId: string, formData: VisualRewardFormData) => withLatency(async () => {
    await repo.updateAsync("redeemedItems", (r: any) => r.id === redeemedItemId, (r: any) => ({ ...r, status: 'InProgress', formData }));
    return { success: true, updatedItem: {}, notifications: [] };
});

export const buyRaffleTickets = (userId: string, raffleId: string, quantity: number) => withLatency(async () => {
    const { EconomyEngineV6 } = await import('./economy/economyEngineV6');
    const raffles = await repo.selectAsync("raffles");
    const raffle = raffles.find((r: any) => r.id === raffleId);
    
    if (!raffle) return { success: false, error: "Raffle not found" };
    
    const totalCost = raffle.ticketPrice * quantity;
    const ecoRes = await EconomyEngineV6.spendCoins(userId, totalCost, `Raffle Tickets: ${raffle.itemName}`);
    
    if (!ecoRes.success) return { success: false, error: ecoRes.error };
    
    for (let i = 0; i < quantity; i++) {
        await repo.insertAsync("raffleTickets", {
            id: `rt-${Date.now()}-${i}`,
            raffleId,
            userId,
            purchasedAt: new Date().toISOString()
        });
    }
    
    return { success: true, updatedUser: ecoRes.updatedUser };
});
