// api/store.ts
import type { User, Notification, StoreItem, UsableItem, CoinPack, CoinPurchaseRequest, VisualRewardFormData, RedeemedItem, Raffle, RaffleTicket, UsableItemQueueEntry, ArtistOfTheDayQueueEntry } from '../types';
import * as db from './mockData';
import { withLatency, createNotification, updateUserInDb } from './helpers';
import { QueueEngineV5 } from './queue/queueEngineV5'; 
import { sanitizeLink, checkLinkSafety } from './quality';
import { StoreEconomyEngine } from '../services/store/storeEconomy.engine';
import { SanityGuard } from '../services/sanity.guard';
import { getRepository } from './database/repository.factory';
import { EconomyEngineV6 } from './economy/economyEngineV6'; // Use V6 for atomic purchases
import { saveMockDb } from './database/mock-db';
import { socialLinkValidator } from './quality/socialLinkValidator';

const repo = getRepository();

export const fetchStoreData = (userId: string) => withLatency(() => ({
    success: true,
    data: {
        storeItems: db.storeItemsData.map(SanityGuard.storeItem),
        usableItems: db.usableItemsData,
        coinPacks: db.coinPacksData,
        coinPurchaseRequests: repo.select("coinPurchaseRequests").filter((cpr: any) => cpr.userId === userId),
    }
}));

export const fetchInventoryData = (userId: string) => withLatency(() => ({
    success: true,
    data: {
        redeemedItems: db.redeemedItemsData.filter(ri => ri.userId === userId),
        storeItems: db.storeItemsData.map(SanityGuard.storeItem),
        usableItems: db.usableItemsData,
        usableItemQueue: (QueueEngineV5.getQueue('item') as UsableItemQueueEntry[]).map(SanityGuard.queueItem),
        artistOfTheDayQueue: [], // DEPRECATED: QueueEngineV5.getQueue('spotlight') removed
    }
}));

export const redeemItem = (userId: string, itemId: string) => withLatency(async () => {
    // Delegate to robust Engine which uses EconomyEngineV6
    return await StoreEconomyEngine.purchaseItem(userId, itemId);
});

export const useUsableItem = (userId: string, redeemedItemId: string, postUrl: string) => withLatency(() => {
    const sanitizedUrl = sanitizeLink(postUrl);
    const safetyCheck = checkLinkSafety(sanitizedUrl);
    if (!safetyCheck.safe) return { success: false, error: safetyCheck.reason };

    const user = repo.select("users").find((u: any) => u.id === userId);
    const redeemedItem = repo.select("redeemedItems").find((ri: any) => ri.id === redeemedItemId);
    
    if (!user || !redeemedItem) return { success: false, error: "User or item not found" };

    // Platform Validation Check
    const usableItem = repo.select("usableItems").find((ui: any) => ui.id === redeemedItem.itemId);
    if (usableItem && usableItem.platform && usableItem.platform !== 'all') {
         const detectedPlatform = socialLinkValidator.getPlatform(sanitizedUrl);
         if (detectedPlatform !== usableItem.platform) {
             return { success: false, error: `Link inválido. Este item requer um link do ${usableItem.platform}.` };
         }
    }
    
    const queueEntry = {
        id: `q-${Date.now()}`, userId, userName: user.name, userAvatar: user.avatarUrl, redeemedItemId,
        itemName: redeemedItem.itemName, queuedAt: new Date().toISOString(), postUrl: sanitizedUrl,
    };
    
    QueueEngineV5.addToQueue(queueEntry, 'item');

    // Update Redeemed Item status
    repo.update("redeemedItems", (ri: any) => ri.id === redeemedItemId, (ri: any) => ({ ...ri, status: 'InProgress' }));
    saveMockDb();
    
    const notifications: Notification[] = [
        createNotification(userId, "Solicitação Enviada", `Sua solicitação para "${redeemedItem.itemName}" foi enviada para a fila de produção.`, { view: 'inventory', tab: 'usable' })
    ];

    return { success: true, notifications };
});

export const queueForArtistOfTheDay = (userId: string, redeemedItemId: string) => withLatency(() => {
    return { success: false, error: "Este item foi descontinuado." };
});

export const buyCoinPack = (userId: string, pack: CoinPack) => withLatency(() => {
    const user = repo.select("users").find((u: any) => u.id === userId);
    if(!user) return { success: false, error: "User not found" };
    
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
      paymentLink: undefined,
    };
    
    repo.insert("coinPurchaseRequests", newRequest);
    
    const notification = createNotification(user.id, "Pedido Criado", `Pedido para "${pack.name}" criado. Clique em 'Pagar Agora' para prosseguir.`, { view: 'store', tab: 'orders' });
    return { success: true, newRequest, notifications: [notification] };
});

export const initiatePayment = (requestId: string) => withLatency(() => {
    const requests = repo.select("coinPurchaseRequests");
    const requestIndex = requests.findIndex((r: any) => r.id === requestId);
    if (requestIndex === -1) return { success: false, error: "Request not found" };

    const request = requests[requestIndex];
    const pack = repo.select("coinPacks").find((p: any) => p.id === request.packId);
    const generatedLink = pack?.paymentLink || `https://pay.artistworld.com/${requestId}`;

    const updatedRequest = {
        ...request,
        status: 'pending_payment',
        paymentLink: generatedLink,
        reviewedAt: new Date().toISOString()
    };
    
    repo.update("coinPurchaseRequests", (r: any) => r.id === requestId, (r: any) => updatedRequest);

    return { success: true, updatedRequest };
});

export const buyCustomCoinPack = (userId: string, coins: number, price: number) => withLatency(() => {
    const user = repo.select("users").find((u: any) => u.id === userId);
    if(!user) return { success: false, error: "User not found" };
    
    const newRequest: CoinPurchaseRequest = {
      id: `cpr-${Date.now()}`, userId, userName: user.name, packId: `custom-${coins}`,
      packName: `Pacote Personalizado (${coins} Coins)`, coins, price,
      requestedAt: new Date().toISOString(), status: 'pending_link_generation',
    };
    
    repo.insert("coinPurchaseRequests", newRequest);
    return { success: true, newRequest, notifications: [] };
});

export const openPaymentLink = (requestId: string) => withLatency(() => {
     // No-op logic for mock, just returns success
     // In real app, might log click analytics
    const req = repo.select("coinPurchaseRequests").find((r: any) => r.id === requestId);
    return { success: !!req, updatedRequest: req };
});

export const cancelCoinPurchaseRequest = (requestId: string) => withLatency(() => {
    const req = repo.select("coinPurchaseRequests").find((r: any) => r.id === requestId);
    if (!req) return { success: false, error: "Request not found" };

    const updatedRequest = { ...req, status: 'cancelled' };
    repo.update("coinPurchaseRequests", (r: any) => r.id === requestId, (r: any) => updatedRequest);
    
    const notification = createNotification(req.userId, 'Pedido Cancelado', `Seu pedido para "${req.packName}" foi cancelado.`);
    repo.insert("notifications", notification);

    return { success: true, updatedRequest, notifications: [notification] };
});

export const submitCoinPurchaseProof = (userId: string, requestId: string, proofDataUrl: string) => withLatency(() => {
    const req = repo.select("coinPurchaseRequests").find((r: any) => r.id === requestId);
    if (!req) return { success: false, error: "Request not found" };

    const updatedRequest = { ...req, proofUrl: proofDataUrl, status: 'pending_approval' };
    repo.update("coinPurchaseRequests", (r: any) => r.id === requestId, (r: any) => updatedRequest);

    const notifications: Notification[] = [createNotification(userId, "Comprovante Enviado", "Seu comprovante foi enviado.", { view: 'store', tab: 'orders' })];
    repo.insert("notifications", notifications[0]);
    
    return { success: true, updatedRequest, notifications };
});

export const submitVisualRewardForm = (userId: string, redeemedItemId: string, formData: VisualRewardFormData) => withLatency(() => {
    const item = repo.select("redeemedItems").find((ri: any) => ri.id === redeemedItemId);
    if (!item) return { success: false, error: "Item not found" };

    const updatedItem: RedeemedItem = {
      ...item,
      status: 'InProgress' as const,
      formData: formData,
      productionStartedAt: new Date().toISOString(),
    };
    
    repo.update("redeemedItems", (ri: any) => ri.id === redeemedItemId, (ri: any) => updatedItem);
    saveMockDb();

    const notifications: Notification[] = [createNotification(userId, "Formulário Enviado", `Solicitação para "${item.itemName}" enviada.`, { view: 'inventory', tab: 'history' })];
    repo.insert("notifications", notifications[0]);

    return { success: true, updatedItem, notifications };
});

export const buyRaffleTickets = (userId: string, raffleId: string, quantity: number) => withLatency(async () => {
    const user = repo.select("users").find((u: any) => u.id === userId);
    const raffle = repo.select("raffles").find((r: any) => r.id === raffleId);

    if (!user || !raffle) return { success: false, error: "User or Raffle not found" };
    if (raffle.status !== 'active') return { success: false, error: "Raffle is not active" };
    
    const totalCost = raffle.ticketPrice * quantity;
    
    // V6 Engine handles atomic check, spend, and telemetry
    const ecoResult = await EconomyEngineV6.spendCoins(userId, totalCost, `Compra de ${quantity} tickets para ${raffle.itemName}`);
    if (!ecoResult.success) return { success: false, error: ecoResult.error || "Insufficient funds" };

    const existingTickets = repo.select("raffleTickets").filter((t: any) => t.raffleId === raffleId && t.userId === userId).length;
    if (raffle.ticketLimitPerUser > 0 && existingTickets + quantity > raffle.ticketLimitPerUser) {
         return { success: false, error: `Limit of ${raffle.ticketLimitPerUser} tickets reached.` };
    }

    const updatedUser = SanityGuard.user(ecoResult.updatedUser!);

    const now = new Date().toISOString();
    const newTickets = Array.from({ length: quantity }).map((_, i) => ({
        id: `rt-${Date.now()}-${i}`,
        raffleId: raffleId,
        userId: userId,
        purchasedAt: now
    }));
    
    newTickets.forEach(t => repo.insert("raffleTickets", t));

    const notification = createNotification(user.id, 'Tickets Comprados', `Você comprou ${quantity} tickets para o sorteio "${raffle.itemName}". Boa sorte!`);
    repo.insert("notifications", notification);

    return { success: true, updatedUser, notifications: [notification] };
});