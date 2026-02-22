
import { supabaseRepository } from "../supabase/supabase.repositories";
import { supabaseClient } from "../supabase/client"; // Check if client exists

export interface Repository {
    // Métodos Síncronos (Legado / UI Rápida - Mock Only)
    select: (table: string) => any[];
    selectPaged: (table: string, page: number, limit: number, filterFn?: (item: any) => boolean) => { data: any[], total: number, page: number, limit: number };
    insert: (table: string, data: any) => any;
    update: (table: string, filter: (item: any) => boolean, updateFn: (item: any) => any) => void;
    delete: (table: string, filter: (item: any) => boolean) => void;
    filter: (table: string, predicate: (item: any) => boolean) => any[];
    
    // Métodos Assíncronos (Híbridos - Funcionam em ambos)
    selectAsync: (table: string) => Promise<any[]>;
    insertAsync: (table: string, data: any) => Promise<any>;
    updateAsync: (table: string, filter: (item: any) => boolean, updateFn: (item: any) => any) => Promise<void>;
    deleteAsync: (table: string, filter: (item: any) => boolean) => Promise<void>;
    
    rpc?: (funcName: string, params?: any) => any;
}

export function getRepository(): Repository {
  if (!supabaseClient) {
      throw new Error("[Repository] Supabase client is not initialized. Check environment variables.");
  }

  return supabaseRepository as Repository;
}
