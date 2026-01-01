
import { supabaseClient } from './client';
import { mapProfileToUser, mapStoreItemToApp, mapMissionToApp, mapInventoryToRedeemedItem } from './mappings';
import type { Repository } from '../database/repository.factory';

const getClient = () => {
    if (!supabaseClient) throw new Error("Supabase Client not initialized.");
    return supabaseClient;
};

export const supabaseRepository: Repository = {
    // Métodos Síncronos (Não usados no modo Supabase)
    select: () => [],
    selectPaged: () => ({ data: [], total: 0, page: 1, limit: 10 }),
    insert: () => null,
    update: () => {},
    delete: () => {},
    filter: () => [],

    // Métodos Assíncronos (Reais)
    selectAsync: async (table: string) => {
        const supabase = getClient();
        
        if (table === 'users') {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) { console.error(error); return []; }
            return data.map((p: any) => mapProfileToUser(p));
        }
        
        if (table === 'storeItems') {
            const { data, error } = await supabase.from('store_items').select('*').eq('is_active', true).neq('rarity', 'Regular');
            if (error) { console.error(error); return []; }
            return data.map((i: any) => mapStoreItemToApp(i));
        }
        
        if (table === 'usableItems') {
            const { data, error } = await supabase.from('store_items').select('*').eq('is_active', true).eq('rarity', 'Regular');
            if (error) { console.error(error); return []; }
            return data.map((i: any) => mapStoreItemToApp(i));
        }

        if (table === 'missions') {
            const { data, error } = await supabase.from('missions').select('*').eq('is_active', true);
            if (error) { console.error(error); return []; }
            return data.map((m: any) => mapMissionToApp(m));
        }

        if (table === 'redeemedItems') {
            const { data, error } = await supabase.from('inventory').select(`*, store_items (name)`);
            if (error) { console.error(error); return []; }
            return data.map((row: any) => mapInventoryToRedeemedItem(row, row.store_items?.name || "Unknown Item"));
        }
        
        // Fallback genérico
        const { data, error } = await supabase.from(table).select('*');
        if (error) return [];
        return data;
    },

    insertAsync: async (table: string, data: any) => {
        const supabase = getClient();
        let dbTable = table;
        // Mapeamento de tabelas do app para o banco
        if (table === 'submissions') dbTable = 'mission_submissions';
        if (table === 'redeemedItems') dbTable = 'inventory';
        
        const { data: res, error } = await supabase.from(dbTable).insert(data).select();
        if (error) throw error;
        return res[0];
    },

    updateAsync: async () => { console.warn("[SupabaseRepo] updateAsync generic not implemented."); },
    deleteAsync: async () => { console.warn("[SupabaseRepo] deleteAsync generic not implemented."); },

    rpc: async (funcName: string, params: any) => {
        const supabase = getClient();
        const dbParams = { ...params };
        
        // Ajuste de nomes de parâmetros para snake_case do Postgres
        if (params.userId) { dbParams.user_id = params.userId; delete dbParams.userId; }
        if (params.itemId) { dbParams.item_id = params.itemId; delete dbParams.itemId; }
        if (params.submissionId) { dbParams.submission_id = params.submissionId; delete dbParams.submissionId; }
        if (params.amount) dbParams.amount = params.amount;
        if (params.source) dbParams.source = params.source;

        const { data, error } = await supabase.rpc(funcName, dbParams);

        if (error) {
            console.error(`[SupabaseRPC] Error in ${funcName}:`, error);
            return { success: false, error: error.message };
        }
        return data; 
    }
};
