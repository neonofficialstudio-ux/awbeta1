
import { supabaseClient } from './client';
import { mapProfileToUser, mapStoreItemToApp, mapMissionToApp, mapInventoryToRedeemedItem } from './mappings';
import type { Repository } from '../database/repository.factory';
import { config } from '../../core/config';
import { SanityGuard } from '../../services/sanity.guard';
import type { User } from '../../types';

// Helper para garantir que o cliente existe
const getClient = () => {
    if (!supabaseClient) throw new Error("Supabase Client not initialized. Check .env variables.");
    return supabaseClient;
};

export async function dailyCheckin() {
    const supabase = getClient();
    const { data, error } = await supabase.rpc('daily_checkin');
    if (error) throw error;
    return data;
}

export async function hasCheckedInToday(userId: string) {
    const supabase = getClient();

    const { data, error } = await supabase
        .rpc('has_checked_in_today', {
            p_user_id: userId,
        });

    if (error) {
        console.error('[CheckIn] hasCheckedInToday failed', error);
        return false; // fallback seguro
    }

    return Boolean(data);
}

let cachedProfiles: User[] = [];
let isRefreshingProfiles = false;

const refreshProfilesCache = async () => {
    if (isRefreshingProfiles) return;
    isRefreshingProfiles = true;
    try {
        const supabase = getClient();
        const { data, error } = await supabase.from('profiles').select('*');
        if (error || !data) return;
        cachedProfiles = data.map((p: any) => SanityGuard.user(mapProfileToUser(p)));
    } catch (err) {
        console.warn('[SupabaseRepo] Failed to refresh profiles cache.', err);
    } finally {
        isRefreshingProfiles = false;
    }
};

const getProfilesSync = (): User[] => {
    if (!cachedProfiles.length && !isRefreshingProfiles) {
        void refreshProfilesCache();
    }
    return cachedProfiles;
};

export const supabaseRepository: Repository = {
    // --- MÉTODOS SÍNCRONOS (LEGACY/MOCK ONLY) ---
    // O Supabase é async por natureza. Se o código antigo chamar estes métodos, 
    // ele deve ser refatorado ou usar o mock-db.
    select: (table: string) => { 
        if (table === 'users') {
            return getProfilesSync();
        }
        if (!config.isProduction) {
            console.warn(`[SupabaseRepo] Sync select called for ${table}. Returning empty array. Refactor to selectAsync.`);
        }
        return []; 
    },
    selectPaged: (table: string, page: number, limit: number, filterFn?: (item: any) => boolean) => {
        if (table === 'users') {
            const list = getProfilesSync();
            const filtered = filterFn ? list.filter(filterFn) : list;
            const start = (page - 1) * limit;
            return { data: filtered.slice(start, start + limit), total: filtered.length, page, limit };
        }
        return { data: [], total: 0, page: 1, limit: 10 };
    },
    insert: (table: string) => {
        if (table === 'users') return null;
        if (!config.isProduction) {
            console.warn(`[SupabaseRepo] Sync insert ignored for ${table}. Use insertAsync instead.`);
        }
        return null;
    },
    update: (table: string) => {
        if (table === 'users') return;
        if (!config.isProduction) {
            console.warn(`[SupabaseRepo] Sync update ignored for ${table}. Use updateAsync instead.`);
        }
    },
    delete: (table: string) => {
        if (table === 'users') return;
        if (!config.isProduction) {
            console.warn(`[SupabaseRepo] Sync delete ignored for ${table}. Use deleteAsync instead.`);
        }
    },
    filter: (table: string, predicate: (item: any) => boolean) => {
        if (table === 'users') {
            return getProfilesSync().filter(predicate);
        }
        return [];
    },

    // --- MÉTODOS ASSÍNCRONOS (REAL IMPLEMENTATION) ---
    
    selectAsync: async (table: string) => {
        const supabase = getClient();
        
        if (table === 'users') {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) throw error;
            const mapped = data.map((p: any) => mapProfileToUser(p));
            cachedProfiles = mapped.map((p: any) => SanityGuard.user(p));
            return mapped;
        }
        
        if (table === 'storeItems') {
            const { data, error } = await supabase.from('store_items').select('*').eq('is_active', true);
            if (error) throw error;
            return data.map((i: any) => mapStoreItemToApp(i));
        }

        if (table === 'missions') {
            let { data, error } = await supabase.from('missions').select('*').eq('active', true);
            if (error && (error.code === '42703' || error.message?.toLowerCase().includes('active'))) {
                const fallback = await supabase.from('missions').select('*').eq('is_active', true);
                data = fallback.data;
                error = fallback.error;
            }
            if (error) throw error;
            return (data || []).map((m: any) => mapMissionToApp(m));
        }

        if (table === 'event_settings') {
            const { data, error } = await supabase.from('event_settings').select('*').limit(1).single();
            if (error) throw error;
            return data ? [data] : [];
        }

        if (table === 'redeemedItems') {
            // Complex join needed for full UI object
            const { data, error } = await supabase.from('inventory')
                .select(`
                    *,
                    store_items (name),
                    profiles (name)
                `);
            if (error) throw error;
            
            return data.map((row: any) => mapInventoryToRedeemedItem(
                row, 
                { name: row.store_items?.name }, 
                { name: row.profiles?.name }
            ));
        }

        // Fallback generic select
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
            console.warn(`[SupabaseRepo] Table ${table} not found or error:`, error.message);
            return [];
        }
        return data;
    },

    insertAsync: async (table: string, data: any) => {
        const supabase = getClient();
        
        // Mapeamentos de Insert
        if (table === 'users') {
             // Users are usually inserted via Auth Trigger, but for profile updates:
             return null; 
        }
        
        // Generic insert
        const { data: res, error } = await supabase.from(table).insert(data).select();
        if (error) throw error;
        return res[0];
    },

    updateAsync: async (table: string, filter: (item: any) => boolean, updateFn: (item: any) => any) => {
        // Nota: O padrão Repository atual usa funções de filtro em memória (filterFn).
        // Isso é difícil de traduzir para SQL dinâmico sem um Query Builder complexo.
        // Para esta fase, focaremos em updates por ID, que é 99% dos casos.
        
        console.warn("[SupabaseRepo] updateAsync with function filter is inefficient. Use RPCs for logic.");
        // Em produção, você deve criar métodos específicos como updateProfile(id, data).
    },

    deleteAsync: async (table: string, filter: (item: any) => boolean) => {
         console.warn("[SupabaseRepo] deleteAsync generic is not safe.");
    },

    // --- O GRANDE SEGREDO: RPCs ---
    // É aqui que a mágica da Fase C se conecta com o Banco da Fase D
    rpc: async (funcName: string, params: any) => {
        const supabase = getClient();
        
        // Mapeamento de nomes de RPC do App -> Supabase
        const rpcMap: Record<string, string> = {
            'purchase_item': 'purchase_item',
            'approve_mission': 'approve_mission_submission',
            // Adicionar outros mapeamentos conforme criarmos as funções no SQL
        };

        const dbFuncName = rpcMap[funcName] || funcName;
        
        // Ajuste de parâmetros (CamelCase -> snake_case se necessário)
        const dbParams = { ...params };
        if (params.userId) { dbParams.user_id = params.userId; delete dbParams.userId; }
        if (params.itemId) { dbParams.item_id = params.itemId; delete dbParams.itemId; }
        if (params.submissionId) { dbParams.submission_id = params.submissionId; delete dbParams.submissionId; }

        console.log(`[SupabaseRPC] Calling ${dbFuncName}`, dbParams);

        const { data, error } = await supabase.rpc(dbFuncName, dbParams);

        if (error) {
            console.error(`[SupabaseRPC] Error in ${dbFuncName}:`, error);
            return { success: false, error: error.message };
        }

        return data; // O banco já retorna { success: true, ... }
    }
};
