import { supabaseClient } from './client';
import { ProfileSupabase } from './profile';
import { createNotification } from '../helpers';
import type { StoreItem, RedeemedItem } from '../../types/store';
import { config } from '../../core/config';

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

const ensureClient = () => {
  if (!supabaseClient) {
    throw new Error('[StoreSupabase] Supabase client not initialized');
  }
  return supabaseClient;
};

export const StoreSupabase = {
  async listStoreItems(): Promise<{ success: boolean; items?: StoreItem[]; error?: string }> {
    if (config.backendProvider !== 'supabase') {
      return { success: false, error: 'Supabase provider is not enabled' };
    }

    try {
      const supabase = ensureClient();
      const { data, error } = await supabase
        .from('store_items')
        .select('id,name,description,price_coins,item_type,rarity,image_url,is_active,meta,created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items: StoreItem[] = (data || []).map((row: any) => ({
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

      return { success: true, items };
    } catch (err: any) {
      console.error('[StoreSupabase] listStoreItems failed', err);
      return { success: false, error: err?.message || 'Failed to load store items' };
    }
  },

  async getMyInventory(userId: string): Promise<{ success: boolean; items?: RedeemedItem[]; error?: string }> {
    if (config.backendProvider !== 'supabase') {
      return { success: false, error: 'Supabase provider is not enabled' };
    }
    if (!userId) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      const supabase = ensureClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const { data, error } = await supabase
        .from('inventory')
        .select(`
          id,
          item_id,
          created_at,
          meta,
          store_items (
            name,
            description,
            price_coins,
            rarity,
            image_url,
            meta
          )
        `)
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items: RedeemedItem[] = (data || []).map((row: any) => {
        const storeItem = row.store_items || {};
        const createdISO = row.created_at || new Date().toISOString();
        return {
          id: row.id,
          userId: authData.user.id,
          userName: authData.user.email || 'Você',
          itemId: row.item_id,
          itemName: storeItem.name ?? 'Item',
          itemPrice: storeItem.price_coins ?? 0,
          redeemedAt: createdISO,
          redeemedAtISO: createdISO,
          coinsBefore: row.meta?.coinsBefore ?? 0,
          coinsAfter: row.meta?.coinsAfter ?? 0,
          status: row.meta?.status ?? 'Redeemed',
          formData: row.meta?.formData,
          productionStartedAt: row.meta?.productionStartedAt,
          completedAt: row.meta?.completedAt,
          estimatedCompletionDate: row.meta?.estimatedCompletionDate,
          completionUrl: row.meta?.completionUrl,
        };
      });

      return { success: true, items };
    } catch (err: any) {
      console.error('[StoreSupabase] getMyInventory failed', err);
      return { success: false, error: err?.message || 'Falha ao carregar inventário' };
    }
  },

  async redeemStoreItem(userId: string, itemId: string): Promise<any> {
    if (config.backendProvider !== 'supabase') {
      return { success: false, error: 'Supabase provider is not enabled' };
    }
    if (!userId) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      const supabase = ensureClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const { data, error } = await supabase.rpc('redeem_store_item', { p_item: itemId });
      if (error) {
        console.error('[StoreSupabase] redeem_store_item error', error);
        return { success: false, error: error.message || 'Falha ao resgatar item' };
      }

      const payload = Array.isArray(data) ? data[0] : data;

      // ✅ payload do seu RPC atual:
      // { success: true/false, error?, item_id, inventory_id, price }
      if (!payload?.success) {
        return { success: false, error: payload?.error || 'Falha ao resgatar item' };
      }

      // Buscar nome/preço do item (para montar feedback bonito)
      let itemName = 'Item';
      let itemPrice = payload?.price ?? 0;
      try {
        const { data: itemRow } = await supabase
          .from('store_items')
          .select('name, price_coins')
          .eq('id', itemId)
          .limit(1)
          .maybeSingle();

        if (itemRow?.name) itemName = itemRow.name;
        if (typeof itemRow?.price_coins === 'number') itemPrice = itemRow.price_coins;
      } catch {}

      // ✅ Refetch do profile real (fonte da verdade)
      const profileRes = await ProfileSupabase.fetchMyProfile(authData.user.id);
      if (!profileRes.success || !profileRes.user) {
        // mesmo se falhar, não quebra a compra; só retorna sem updatedUser
        return {
          success: true,
          redeemedItem: {
            id: payload?.inventory_id || `inv-${Date.now()}`,
            userId: authData.user.id,
            userName: authData.user.email || 'Você',
            itemId,
            itemName,
            itemPrice,
            redeemedAt: new Date().toISOString(),
            redeemedAtISO: new Date().toISOString(),
            coinsBefore: 0,
            coinsAfter: 0,
            status: 'Redeemed',
          },
        };
      }

      const updatedUser = profileRes.user;

      const notifications = [
        createNotification(authData.user.id, 'Compra realizada!', `Você adquiriu "${itemName}".`, {
          view: 'inventory',
        }),
      ];

      return {
        success: true,
        updatedUser,
        notifications,
        redeemedItem: {
          id: payload?.inventory_id || `inv-${Date.now()}`,
          userId: authData.user.id,
          userName: authData.user.email || 'Você',
          itemId,
          itemName,
          itemPrice,
          redeemedAt: new Date().toISOString(),
          redeemedAtISO: new Date().toISOString(),
          coinsBefore: 0,
          coinsAfter: updatedUser.coins ?? 0,
          status: 'Redeemed',
        },
      };
    } catch (err: any) {
      console.error('[StoreSupabase] redeemStoreItem failed', err);
      return { success: false, error: err?.message || 'Falha ao resgatar item' };
    }
  },
};
