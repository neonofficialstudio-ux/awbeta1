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
import { StoreSupabase } from './supabase/store';
import { config } from '../core/config';
import { assertSupabaseProvider, isSupabaseProvider } from './core/backendGuard';
import { getSupabase } from './supabase/client';
import { isSupabaseProd } from './core/productionGuards';

const repo = getRepository();
const requireSupabaseClient = () => {
    const client = getSupabase();
    if (!client) throw new Error("[Supabase] Client not initialized");
    return client;
};

const mapRarity = (value: string | null | undefined): StoreItem['rarity'] => {
    const normalized = (value || '').toLowerCase();
    switch (normalized) {
        case 'raro':
        case 'rare':
            return 'Raro';
        case 'épico':
        case 'epico':
        case 'epic':
            return 'Épico';
        case 'lendário':
        case 'lendario':
        case 'legendary':
            return 'Lendário';
        default:
            return 'Regular';
    }
};

export const fetchStoreData = (userId: string) => withLatency(async () => {
    if (isSupabaseProd()) {
        const supabase = requireSupabaseClient();
        const { data, error } = await supabase
            .from('store_items')
            .select('id,name,description,price_coins,item_type,rarity,image_url,is_active,meta,created_at')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        if (error) return { success: false, error: error.message || 'Falha ao carregar a loja' };

        const rawStore = data || [];
        const storeItems = rawStore
            .filter((item: any) => (item.item_type ?? 'visual') !== 'usable')
            .map((row: any) => ({
                id: row.id,
                name: row.name ?? 'Item',
                description: row.description ?? '',
                price: row.price_coins ?? 0,
                rarity: mapRarity(row.rarity),
                imageUrl: row.image_url ?? '',
                exchanges: row.meta?.exchanges ?? 0,
                previewUrl: row.meta?.previewUrl,
                isOutOfStock: row.is_active === false || row.meta?.isOutOfStock === true,
            }));
        const usableItems = rawStore
            .filter((item: any) => (item.item_type ?? '') === 'usable')
            .map((row: any) => ({
                id: row.id,
                name: row.name ?? 'Item utilizável',
                description: row.description ?? '',
                price: Number(row.price_coins ?? 0),
                imageUrl: row.image_url ?? '',
                isOutOfStock: Boolean(row?.meta?.isOutOfStock ?? false) || !row.is_active,
                platform: row?.meta?.platform ?? 'all',
                kind: row?.meta?.usable_kind ?? 'instagram_post',
            }));
        // --- coin packs (supabase)
        const { data: rawPacks, error: packErr } = await supabase
            .from('coin_packs')
            .select('id,title,coins,bonus_coins,price_cents,currency,is_active,in_stock,sort_order,meta,created_at')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });
        if (packErr) return { success: false, error: packErr.message || 'Falha ao carregar pacotes' };

        const coinPacks = (rawPacks || [])
            .filter((p: any) => p.is_active === true)
            .map((p: any) => ({
                id: p.id,
                name: p.title ?? 'Pacote',
                coins: Number(p.coins ?? 0) + Number(p.bonus_coins ?? 0),
                price: Number(p.price_cents ?? 0) / 100,
                paymentLink: String(p?.meta?.paymentLink ?? ''),
                isOutOfStock: !(p.in_stock === true),
                imageUrl: p?.meta?.imageUrl ?? '',
            }));

        // --- coin purchase requests (supabase)
        const { data: rawReqs, error: reqErr } = await supabase
            .from('coin_purchase_requests')
            .select('id,user_id,pack_id,total_coins,price_cents,status,created_at,decided_at,meta, pack:coin_packs(title)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (reqErr) return { success: false, error: reqErr.message || 'Falha ao carregar pedidos' };

        const statusMap: Record<string, any> = {
            pending: 'pending_approval',
            approved: 'approved',
            rejected: 'rejected',
            cancelled: 'cancelled',
        };

        const coinPurchaseRequests = (rawReqs || []).map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            userName: '',
            packId: r.pack_id,
            packName: r?.pack?.title ?? 'Pacote',
            coins: Number(r.total_coins ?? 0),
            price: Number(r.price_cents ?? 0) / 100,
            requestedAt: r.created_at,
            status: statusMap[String(r.status ?? 'pending')] ?? 'pending_approval',
            paymentLink: r?.meta?.paymentLink,
            proofUrl: r?.meta?.proofUrl,
            reviewedAt: r.decided_at ?? undefined,
        }));

        return {
            success: true,
            data: {
                storeItems,
                usableItems,
                coinPacks,
                coinPurchaseRequests,
            }
        };
    }

    return {
        success: true,
        data: {
            storeItems: db.storeItemsData.map(SanityGuard.storeItem),
            usableItems: db.usableItemsData,
            coinPacks: db.coinPacksData,
            coinPurchaseRequests: repo.select("coinPurchaseRequests").filter((cpr: any) => cpr.userId === userId),
        }
    };
});

export const fetchInventoryData = (userId: string) => withLatency(async () => {
    if (config.backendProvider === 'supabase') {
        const itemsRes = await StoreSupabase.getMyInventory(userId);
        if (!itemsRes.success) return { success: false, error: itemsRes.error || 'Falha ao carregar inventário' };

        // ✅ Merge production_requests (fonte da verdade do status/entrega)
        // - inventory.id === production_requests.inventory_id
        // - delivered => status Used + completionUrl
        // - queued/in_progress => status InProgress
        try {
            const supabase = requireSupabaseClient();
            const { data: requests, error: reqErr } = await supabase
                .from('production_requests')
                .select('id,inventory_id,category,status,briefing,result,created_at,updated_at')
                .eq('user_id', userId);

            if (!reqErr && requests && requests.length) {
                const byInventoryId = new Map(requests.map((r: any) => [r.inventory_id, r]));

                const merged = (itemsRes.items || []).map((it: any) => {
                    const req = byInventoryId.get(it.id);
                    if (!req) return it;

                    const st = String(req.status || '').toLowerCase();
                    const category = String(req.category || '').toLowerCase();

                    const deliveredAt = req.result?.delivered_at || null;
                    const notes = req.result?.notes ?? null;

                    // attach request context
                    const base = {
                        ...it,
                        productionRequestId: req.id,
                        productionCategory: category,
                        deliveredAt,
                        deliveredNotes: notes,
                    };

                    // ✅ UTILIZÁVEIS: link + kind vem do briefing
                    if (category === 'usable') {
                        const link = req.briefing?.link || null;
                        const kind = req.briefing?.kind || null;

                        if (st === 'delivered') {
                            return {
                                ...base,
                                status: 'Used',
                                completedAt: deliveredAt,
                                // completionUrl não se aplica a usable
                                completionUrl: null,
                                submittedLink: link,
                                submittedKind: kind,
                                productionStartedAt: it.productionStartedAt || req.created_at || null,
                            };
                        }

                        if (st === 'queued' || st === 'in_progress') {
                            return {
                                ...base,
                                status: 'InProgress',
                                submittedLink: link,
                                submittedKind: kind,
                                productionStartedAt: it.productionStartedAt || req.created_at || null,
                            };
                        }

                        if (st === 'cancelled') {
                            return { ...base, status: 'Refunded' };
                        }

                        return {
                            ...base,
                            submittedLink: link,
                            submittedKind: kind,
                        };
                    }

                    // ✅ VISUAIS (visual_reward): usa delivery_url
                    if (category === 'visual_reward') {
                        if (st === 'delivered') {
                            const deliveryUrl = req.result?.delivery_url || null;

                            return {
                                ...base,
                                status: 'Used',
                                completionUrl: deliveryUrl,
                                completedAt: deliveredAt,
                                productionStartedAt: it.productionStartedAt || req.created_at || null,
                            };
                        }

                        if (st === 'queued' || st === 'in_progress') {
                            return {
                                ...base,
                                status: 'InProgress',
                                productionStartedAt: it.productionStartedAt || req.created_at || null,
                            };
                        }

                        if (st === 'cancelled') {
                            return { ...base, status: 'Refunded' };
                        }
                    }

                    return base;
                });

                itemsRes.items = merged;
            }
        } catch (e) {
            // Não quebra inventário se algo ainda não estiver acessível por algum motivo
            console.warn('[Inventory] Could not merge production_requests', e);
        }

    // ✅ Catálogo correto para o Inventário (com item_type)
    const supabase = requireSupabaseClient();
    const { data: rawStore, error: storeErr } = await supabase
      .from('store_items')
      .select('id,name,description,price_coins,item_type,rarity,image_url,is_active,meta,created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (storeErr) {
      return {
        success: true,
        data: {
          redeemedItems: itemsRes.items || [],
          storeItems: [],
          usableItems: [],
          usableItemQueue: [],
          artistOfTheDayQueue: [],
        }
      };
    }

    const all = rawStore || [];

    // storeItems (visuais / recompensas)
    const storeItems = all
      .filter((i: any) => (i.item_type ?? 'visual') !== 'usable')
      .map((row: any) => ({
        id: row.id,
        name: row.name ?? 'Item',
        description: row.description ?? '',
        price: Number(row.price_coins ?? 0),
        rarity: (row.rarity ?? 'Regular'),
        imageUrl: row.image_url ?? '',
        isOutOfStock: Boolean(row?.meta?.isOutOfStock ?? false) || !row.is_active,
        previewUrl: row?.meta?.previewUrl ?? '',
        itemType: row.item_type ?? 'visual',
        meta: row.meta ?? {},
      }));

    // usableItems (itens utilizáveis)
    const usableItems = all
      .filter((i: any) => (i.item_type ?? '') === 'usable')
      .map((row: any) => ({
        id: row.id,
        name: row.name ?? 'Item utilizável',
        description: row.description ?? '',
        price: Number(row.price_coins ?? 0),
        imageUrl: row.image_url ?? '',
        isOutOfStock: Boolean(row?.meta?.isOutOfStock ?? false) || !row.is_active,
        platform: row?.meta?.platform ?? 'all',
        kind: row?.meta?.usable_kind ?? 'instagram_post',
      }));

    return {
      success: true,
      data: {
        redeemedItems: itemsRes.items || [],
        storeItems,
        usableItems,
        usableItemQueue: [],
        artistOfTheDayQueue: [],
      }
    };
    }

    return {
        success: true,
        data: {
            redeemedItems: db.redeemedItemsData.filter(ri => ri.userId === userId),
            storeItems: db.storeItemsData.map(SanityGuard.storeItem),
            usableItems: db.usableItemsData,
            usableItemQueue: (QueueEngineV5.getQueue('item') as UsableItemQueueEntry[]).map(SanityGuard.queueItem),
            artistOfTheDayQueue: [],
        }
    };
});

export const redeemItem = (userId: string, itemId: string) => withLatency(async () => {
    if (config.backendProvider === 'supabase') {
        const res = await StoreSupabase.redeemStoreItem(userId, itemId);
        return res;
    }

    // Delegate to robust Engine which uses EconomyEngineV6
    return await StoreEconomyEngine.purchaseItem(userId, itemId);
});

export const useUsableItem = (
    userId: string,
    redeemedItemId: string,
    postUrl: string,
    kind?: UsableItem['kind'],
) => withLatency(async () => {
    if (config.backendProvider === 'supabase') {
        const sanitizedUrl = sanitizeLink(postUrl);
        const safetyCheck = checkLinkSafety(sanitizedUrl);
        if (!safetyCheck.safe) return { success: false, error: safetyCheck.reason };

        // Validação de plataforma (mesma lógica do mock)
        // Vamos buscar o item do inventory para descobrir store_item_id e plataforma via store_items.meta
        try {
            const supabase = requireSupabaseClient();

            // pega o inventory + store_items(meta.platform)
            const { data: invRow, error: invErr } = await supabase
                .from('inventory')
                .select('id, item_id, store_items:store_items(id, meta, item_type)')
                .eq('id', redeemedItemId)
                .single();

            if (invErr) throw invErr;

            const platformRequired = (invRow?.store_items?.meta?.platform ?? 'all') as any;
            const kindRequired = (kind ?? invRow?.store_items?.meta?.usable_kind ?? 'instagram_post') as UsableItem['kind'];

            const kindPlatformMap: Record<string, string> = {
                instagram_post: 'instagram',
                instagram_reels: 'instagram',
                instagram_story: 'instagram',
                tiktok_video: 'tiktok',
                youtube_video: 'youtube',
                spotify_track: 'spotify',
                spotify_presave: 'spotify',
            };
            const requiredKindPlatform = kindRequired ? kindPlatformMap[kindRequired] : null;

            const detectedPlatform = socialLinkValidator.getPlatform(sanitizedUrl);

            if (platformRequired && platformRequired !== 'all') {
                if (detectedPlatform !== platformRequired) {
                    return { success: false, error: `Link inválido. Este item requer um link do ${platformRequired}.` };
                }
            }

            if (requiredKindPlatform && requiredKindPlatform !== 'spotify') {
                if (detectedPlatform !== requiredKindPlatform) {
                    return { success: false, error: `Link inválido. Este item requer um link do ${requiredKindPlatform}.` };
                }
            }

            if (requiredKindPlatform === 'spotify') {
                const spotifyPattern = /^https?:\/\/(?:open\.)?spotify\.com\/.+/i;
                if (!spotifyPattern.test(sanitizedUrl)) {
                    return { success: false, error: 'Link inválido. Este item requer um link do Spotify.' };
                }
            }

            const refId =
                (globalThis as any).crypto?.randomUUID
                    ? (globalThis as any).crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

            const briefing = {
                link: sanitizedUrl,
                platform: (platformRequired !== 'all' ? platformRequired : (requiredKindPlatform ?? 'all')),
                kind: kindRequired,
            };

            const assets = {};

            const { data, error } = await supabase.rpc('start_production', {
                p_inventory_id: redeemedItemId,
                p_ref_id: refId,
                p_briefing: briefing,
                p_assets: assets,
            });

            if (error) throw error;

            return {
                success: true,
                updatedItem: { id: redeemedItemId, status: 'InProgress' },
                notifications: [],
                data,
            };
        } catch (e: any) {
            console.error(e);
            return { success: false, error: e?.message || 'Falha ao iniciar produção (utilizável)' };
        }
    }
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

export const buyCoinPack = (userId: string, pack: CoinPack) => withLatency(async () => {
    if (config.backendProvider === 'supabase') {
        const supabase = requireSupabaseClient();

        const refId = (globalThis as any).crypto?.randomUUID
            ? (globalThis as any).crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const { data: requestId, error } = await supabase.rpc('create_coin_purchase_request', {
            p_pack_id: pack.id,
            p_ref_id: refId,
            p_provider: 'manual',
            p_provider_payment_id: null,
            p_meta: {
                paymentLink: pack.paymentLink ?? null,
                ui_source: 'store.buyCoinPack',
            },
        });

        if (error) return { success: false, error: error.message || 'Falha ao criar pedido' };

        // tenta retornar o pedido já mapeado (pra UI atualizar sem reload)
        const { data: row, error: readErr } = await supabase
            .from('coin_purchase_requests')
            .select('id,user_id,pack_id,total_coins,price_cents,status,created_at,decided_at,meta, pack:coin_packs(title)')
            .eq('id', requestId)
            .single();

        if (readErr || !row) {
            return { success: true, newRequest: { id: requestId }, notifications: [] };
        }

        const statusMap: Record<string, any> = {
            pending: 'pending_approval',
            approved: 'approved',
            rejected: 'rejected',
            cancelled: 'cancelled',
        };

        const newRequest: any = {
            id: row.id,
            userId: row.user_id,
            userName: '',
            packId: row.pack_id,
            packName: (row as any)?.pack?.title ?? pack.name,
            coins: Number((row as any).total_coins ?? 0),
            price: Number((row as any).price_cents ?? 0) / 100,
            requestedAt: (row as any).created_at,
            status: statusMap[String((row as any).status ?? 'pending')] ?? 'pending_approval',
            paymentLink: (row as any)?.meta?.paymentLink,
            proofUrl: (row as any)?.meta?.proofUrl,
            reviewedAt: (row as any).decided_at ?? undefined,
        };

        return { success: true, newRequest, notifications: [] };
    }

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
    if (config.backendProvider === 'supabase') {
        return { success: false, error: 'Pagamento manual: aguarde o admin processar o pedido.' };
    }
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

export const buyCustomCoinPack = (userId: string, coins: number, price: number) => withLatency(async () => {
    if (config.backendProvider === 'supabase') {
        return { success: false, error: 'Compra de pacote personalizado ainda não está disponível no Supabase.' };
    }
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
    if (config.backendProvider === 'supabase') {
        return { success: false, error: 'Link de pagamento não é gerado automaticamente. Aguarde instruções no pedido.' };
    }
     // No-op logic for mock, just returns success
     // In real app, might log click analytics
    const req = repo.select("coinPurchaseRequests").find((r: any) => r.id === requestId);
    return { success: !!req, updatedRequest: req };
});

export const cancelCoinPurchaseRequest = (requestId: string) => withLatency(() => {
    if (config.backendProvider === 'supabase') {
        return { success: false, error: 'Cancelamento não disponível no modo Supabase (pedido é auditável).' };
    }
    const req = repo.select("coinPurchaseRequests").find((r: any) => r.id === requestId);
    if (!req) return { success: false, error: "Request not found" };

    const updatedRequest = { ...req, status: 'cancelled' };
    repo.update("coinPurchaseRequests", (r: any) => r.id === requestId, (r: any) => updatedRequest);
    
    const notification = createNotification(req.userId, 'Pedido Cancelado', `Seu pedido para "${req.packName}" foi cancelado.`);
    repo.insert("notifications", notification);

    return { success: true, updatedRequest, notifications: [notification] };
});

export const submitCoinPurchaseProof = (userId: string, requestId: string, proofDataUrl: string) => withLatency(() => {
    if (config.backendProvider === 'supabase') {
        return { success: false, error: 'Envio de comprovante não disponível: use o canal combinado e aguarde aprovação.' };
    }
    const req = repo.select("coinPurchaseRequests").find((r: any) => r.id === requestId);
    if (!req) return { success: false, error: "Request not found" };

    const updatedRequest = { ...req, proofUrl: proofDataUrl, status: 'pending_approval' };
    repo.update("coinPurchaseRequests", (r: any) => r.id === requestId, (r: any) => updatedRequest);

    const notifications: Notification[] = [createNotification(userId, "Comprovante Enviado", "Seu comprovante foi enviado.", { view: 'store', tab: 'orders' })];
    repo.insert("notifications", notifications[0]);
    
    return { success: true, updatedRequest, notifications };
});

export const submitVisualRewardForm = (
    userId: string,
    redeemedItemId: string,
    formData: VisualRewardFormData
) => withLatency(async () => {
    // ✅ Supabase path
    if (config.backendProvider === 'supabase') {
        const supabase = requireSupabaseClient();

        // ref_id para idempotência (retry safe)
        const refId =
            (globalThis as any).crypto?.randomUUID
                ? (globalThis as any).crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        // briefing/assets (MVP)
        // OBS: audioFile/referenceImages estão como base64 no frontend hoje.
        // Mais pra frente migramos isso para Supabase Storage (melhor), mas agora funciona.
        const briefing = {
            songName: formData.songName,
            idea: formData.idea,
            lyrics: formData.lyrics ?? '',
        };

        const assets = {
            referenceImages: formData.referenceImages ?? [],
            audioFile: formData.audioFile ?? null,
        };

        const { data, error } = await supabase.rpc("start_production", {
            p_inventory_id: redeemedItemId,
            p_ref_id: refId,
            p_briefing: briefing,
            p_assets: assets,
        });

        if (error) throw error;

        // Mantém compatibilidade com a UI atual:
        // Inventory.tsx só refaz fetch quando response.updatedItem existe.
        return {
            success: true,
            updatedItem: {
                id: redeemedItemId,
                status: 'InProgress',
                productionStartedAt: new Date().toISOString(),
                formData,
            },
            notifications: [],
            data,
        };
    }

    // MOCK path (mantém o comportamento atual)
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

    const notifications: Notification[] = [
        createNotification(userId, `Briefing enviado`, `Sua solicitação para "${item.itemName}" enviada.`, { view: 'inventory', tab: 'history' })
    ];
    repo.insert("notifications", notifications[0]);

    return { success: true, updatedItem, notifications };
});

export const getMyRequests = (category?: string) => withLatency(async () => {
    if (config.backendProvider !== 'supabase') {
        return { success: false, error: 'not_supabase' };
    }

    const supabase = requireSupabaseClient();
    const { data, error } = await supabase.rpc('get_my_requests', {
        p_category: category ?? null,
        p_limit: 50,
        p_offset: 0,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
});

export const getQueuePosition = (requestId: string) => withLatency(async () => {
    if (config.backendProvider !== 'supabase') {
        return { success: false, error: 'not_supabase' };
    }

    const supabase = requireSupabaseClient();
    const { data, error } = await supabase.rpc('get_queue_position', {
        p_request_id: requestId,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
});

const buyRaffleTicketsSupabase = async (raffleId: string, quantity: number) => {
    assertSupabaseProvider('raffles.buyTickets');

    const supabase = requireSupabaseClient();
    const { data, error } = await supabase.rpc(
        "buy_raffle_tickets",
        {
            p_raffle: raffleId,
            p_quantity: quantity,
            p_ref_id: crypto.randomUUID(),
        }
    );

    if (error) throw error;
    return data;
};

export const buyRaffleTickets = (userId: string, raffleId: string, quantity: number) => {
    if (isSupabaseProvider()) {
        return buyRaffleTicketsSupabase(raffleId, quantity);
    }
    return withLatency(async () => {
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
};
