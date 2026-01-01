
import { config } from "../../core/config";
import { mockDB } from "./mock-db";
import { supabaseRepository } from "../supabase/supabase.repositories";
import { supabaseClient } from "../supabase/client";

export interface Repository {
    // Métodos Síncronos (Legado / Mock)
    select: (table: string) => any[];
    selectPaged: (table: string, page: number, limit: number, filterFn?: (item: any) => boolean) => { data: any[], total: number, page: number, limit: number };
    insert: (table: string, data: any) => any;
    update: (table: string, filter: (item: any) => boolean, updateFn: (item: any) => any) => void;
    delete: (table: string, filter: (item: any) => boolean) => void;
    filter: (table: string, predicate: (item: any) => boolean) => any[];
    
    // Métodos Assíncronos (Supabase / Real)
    selectAsync: (table: string) => Promise<any[]>;
    insertAsync: (table: string, data: any) => Promise<any>;
    updateAsync: (table: string, filter: (item: any) => boolean, updateFn: (item: any) => any) => Promise<void>;
    deleteAsync: (table: string, filter: (item: any) => boolean) => Promise<void>;
    
    rpc?: (funcName: string, params?: any) => any;
}

export function getRepository(): Repository {
  // Se a config estiver true e o cliente existir, usa o repositório do Supabase
  if (config.useSupabase && supabaseClient) {
      return supabaseRepository as Repository;
  }
  
  // Caso contrário, usa o banco de dados local (Mock)
  return mockDB as Repository;
}
